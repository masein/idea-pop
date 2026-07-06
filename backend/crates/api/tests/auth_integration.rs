//! Integration tests for auth routes — register, login, refresh, verify-email,
//! rate limiting, and RBAC.

use std::sync::Arc;

use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use idea_pop_api::{
    null_billing, null_gamification, null_portfolio, router, AppState, NullChallengeRepo,
    NullExploreRepo, NullLibraryRepo,
};
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, NullConsentEmailSender, NullEmailSender, SqlxAccountRepo,
    SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo, SystemClock,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;

// ── Test setup ────────────────────────────────────────────────────────────────

async fn start_postgres() -> (PgPool, ContainerAsync<Postgres>) {
    let pg = Postgres::default()
        .start()
        .await
        .expect("start postgres container");
    let port = pg
        .get_host_port_ipv4(5432)
        .await
        .expect("get postgres port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres");
    let pool = PgPool::connect(&url)
        .await
        .expect("connect to test postgres");
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("run migrations");
    (pool, pg)
}

fn make_state(pool: PgPool) -> AppState {
    AppState::new(
        pool.clone(),
        Arc::new(SqlxAccountRepo::new(pool.clone())),
        Arc::new(Argon2Hasher),
        Arc::new(JwtTokenIssuer::new(
            "test-secret-key-32chars-padding!!",
            900,
        )),
        Arc::new(NullEmailSender),
        Arc::new(SystemClock),
        Arc::new(SqlxChildRepo::new(pool.clone())),
        Arc::new(SqlxConsentRepo::new(pool.clone())),
        Arc::new(SqlxClassRepo::new(pool)),
        Arc::new(NullConsentEmailSender),
        Arc::new(NullExploreRepo),
        Arc::new(NullLibraryRepo),
        Arc::new(NullChallengeRepo),
        null_gamification(),
        null_portfolio(),
        null_billing(),
    )
}

fn make_app(pool: PgPool) -> axum::Router {
    router(make_state(pool), None)
}

// ── Register ──────────────────────────────────────────────────────────────────

#[tokio::test]
async fn register_happy_path() {
    let (pool, _pg) = start_postgres().await;
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email":"alice@example.com","password":"password123"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body: Value =
        serde_json::from_slice(&to_bytes(res.into_body(), usize::MAX).await.unwrap()).unwrap();
    assert_eq!(body["role"], "parent");
    assert!(body["access_token"].is_string());
    assert!(body["refresh_token"].is_string());
}

#[tokio::test]
async fn register_duplicate_email_returns_409() {
    let (pool, _pg) = start_postgres().await;
    let app = make_app(pool);
    let req = || {
        Request::builder()
            .method("POST")
            .uri("/auth/register")
            .header("content-type", "application/json")
            .body(Body::from(
                json!({"email":"dup@example.com","password":"password123"}).to_string(),
            ))
            .unwrap()
    };
    let res = app.clone().oneshot(req()).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let res = app.oneshot(req()).await.unwrap();
    assert_eq!(res.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn register_invalid_email_returns_422() {
    let (pool, _pg) = start_postgres().await;
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email":"not-an-email","password":"password123"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

// ── Login ─────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn login_happy_path() {
    let (pool, _pg) = start_postgres().await;
    let app = make_app(pool);

    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email":"login@example.com","password":"password123"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let res = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email":"login@example.com","password":"password123"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body: Value =
        serde_json::from_slice(&to_bytes(res.into_body(), usize::MAX).await.unwrap()).unwrap();
    assert!(body["access_token"].is_string());
}

#[tokio::test]
async fn login_wrong_password_returns_401() {
    let (pool, _pg) = start_postgres().await;
    let app = make_app(pool);

    app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email":"bad@example.com","password":"password123"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let res = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email":"bad@example.com","password":"wrong-password"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ── Refresh ───────────────────────────────────────────────────────────────────

#[tokio::test]
async fn refresh_rotates_tokens() {
    let (pool, _pg) = start_postgres().await;
    let app = make_app(pool);

    let reg: Value = serde_json::from_slice(
        &to_bytes(
            app.clone()
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/auth/register")
                        .header("content-type", "application/json")
                        .body(Body::from(
                            json!({"email":"refresh@example.com","password":"password123"})
                                .to_string(),
                        ))
                        .unwrap(),
                )
                .await
                .unwrap()
                .into_body(),
            usize::MAX,
        )
        .await
        .unwrap(),
    )
    .unwrap();

    let refresh_token = reg["refresh_token"].as_str().unwrap().to_owned();

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"refresh_token": refresh_token}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // Using the old refresh token again should fail.
    let res = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/refresh")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"refresh_token": refresh_token}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ── Protected route & RBAC ────────────────────────────────────────────────────

#[tokio::test]
async fn me_requires_auth() {
    let (pool, _pg) = start_postgres().await;
    let res = make_app(pool)
        .oneshot(Request::builder().uri("/me").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn me_returns_account_info() {
    let (pool, _pg) = start_postgres().await;
    let app = make_app(pool);

    let reg: Value = serde_json::from_slice(
        &to_bytes(
            app.clone()
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/auth/register")
                        .header("content-type", "application/json")
                        .body(Body::from(
                            json!({"email":"me@example.com","password":"password123","display_name":"Susan"}).to_string(),
                        ))
                        .unwrap(),
                )
                .await
                .unwrap()
                .into_body(),
            usize::MAX,
        )
        .await
        .unwrap(),
    )
    .unwrap();

    let token = reg["access_token"].as_str().unwrap();
    let res = app
        .oneshot(
            Request::builder()
                .uri("/me")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body: Value =
        serde_json::from_slice(&to_bytes(res.into_body(), usize::MAX).await.unwrap()).unwrap();
    assert_eq!(body["role"], "parent");
    assert_eq!(body["email"], "me@example.com");
    assert_eq!(body["display_name"], "Susan");
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn rate_limit_triggers_429() {
    let (pool, _pg) = start_postgres().await;
    // Create a very tight limiter: 2 req/min.
    use idea_pop_api::create_auth_rate_limiter;
    let limiter = create_auth_rate_limiter(2);
    let app = router(make_state(pool), Some(limiter));

    let make_req = || {
        Request::builder()
            .method("POST")
            .uri("/auth/login")
            .header("content-type", "application/json")
            .body(Body::from(
                json!({"email":"nope@example.com","password":"pass"}).to_string(),
            ))
            .unwrap()
    };

    // First 2 requests succeed (or 401), third should be 429.
    let _ = app.clone().oneshot(make_req()).await.unwrap();
    let _ = app.clone().oneshot(make_req()).await.unwrap();
    let res = app.oneshot(make_req()).await.unwrap();
    assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);
}
