//! Integration tests for GET/PUT /account/email-preferences.
//! All SQL uses runtime `sqlx::query` (no offline cache needed).

use std::sync::Arc;

use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use idea_pop_api::{null_billing, null_gamification, null_portfolio, router, AppState};
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, NullConsentEmailSender, NullEmailSender, SqlxAccountRepo,
    SqlxChallengeRepo, SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo, SystemClock,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;

async fn start_postgres() -> (PgPool, ContainerAsync<Postgres>) {
    let pg = Postgres::default().start().await.expect("start postgres");
    let port = pg.get_host_port_ipv4(5432).await.expect("get port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres");
    let pool = PgPool::connect(&url).await.expect("connect");
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("migrate");
    (pool, pg)
}

fn state(pool: PgPool) -> AppState {
    AppState::new(
        pool.clone(),
        Arc::new(SqlxAccountRepo::new(pool.clone())),
        Arc::new(Argon2Hasher),
        Arc::new(JwtTokenIssuer::new("account-test-secret-32bytes!!!!", 900)),
        Arc::new(NullEmailSender),
        Arc::new(SystemClock),
        Arc::new(SqlxChildRepo::new(pool.clone())),
        Arc::new(SqlxConsentRepo::new(pool.clone())),
        Arc::new(SqlxClassRepo::new(pool.clone())),
        Arc::new(NullConsentEmailSender),
        Arc::new(idea_pop_api::NullExploreRepo),
        Arc::new(idea_pop_api::NullLibraryRepo),
        Arc::new(SqlxChallengeRepo::new(pool)),
        null_gamification(),
        null_portfolio(),
        null_billing(),
    )
}

async fn register_parent(app: &axum::Router, email: &str) -> String {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email": email, "password": "password123",
                           "role": "parent", "display_name": "Test"})
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "register failed");

    let res2 = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email": email, "password": "password123"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = to_bytes(res2.into_body(), 1 << 20).await.unwrap();
    let v: Value = serde_json::from_slice(&bytes).unwrap();
    v["access_token"].as_str().unwrap().to_owned()
}

fn authed_get(uri: &str, token: Option<&str>) -> Request<Body> {
    let mut b = Request::builder().method("GET").uri(uri);
    if let Some(t) = token {
        b = b.header("authorization", format!("Bearer {t}"));
    }
    b.body(Body::empty()).unwrap()
}

fn authed_put(uri: &str, token: &str, body: Value) -> Request<Body> {
    Request::builder()
        .method("PUT")
        .uri(uri)
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {token}"))
        .body(Body::from(body.to_string()))
        .unwrap()
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = to_bytes(res.into_body(), 1 << 20).await.unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn email_preferences_default_off_then_persist_updates() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let token = register_parent(&app, "prefs@test.com").await;

    // No row yet → all-off defaults.
    let res = app
        .clone()
        .oneshot(authed_get("/account/email-preferences", Some(&token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["marketing"], false);
    assert_eq!(body["new_content"], false);
    assert_eq!(body["activity_reports"], false);

    // PUT creates the row and echoes the new state.
    let res = app
        .clone()
        .oneshot(authed_put(
            "/account/email-preferences",
            &token,
            json!({"marketing": true, "new_content": false, "activity_reports": true}),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["marketing"], true);
    assert_eq!(body["new_content"], false);
    assert_eq!(body["activity_reports"], true);

    // GET reflects the persisted values.
    let res = app
        .clone()
        .oneshot(authed_get("/account/email-preferences", Some(&token)))
        .await
        .unwrap();
    let body = body_json(res).await;
    assert_eq!(body["marketing"], true);
    assert_eq!(body["new_content"], false);
    assert_eq!(body["activity_reports"], true);

    // A second PUT updates in place (upsert path).
    let res = app
        .clone()
        .oneshot(authed_put(
            "/account/email-preferences",
            &token,
            json!({"marketing": false, "new_content": true, "activity_reports": false}),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let res = app
        .oneshot(authed_get("/account/email-preferences", Some(&token)))
        .await
        .unwrap();
    let body = body_json(res).await;
    assert_eq!(body["marketing"], false);
    assert_eq!(body["new_content"], true);
    assert_eq!(body["activity_reports"], false);
}

#[tokio::test]
async fn email_preferences_are_scoped_per_account() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let a = register_parent(&app, "prefs-a@test.com").await;
    let b = register_parent(&app, "prefs-b@test.com").await;

    let res = app
        .clone()
        .oneshot(authed_put(
            "/account/email-preferences",
            &a,
            json!({"marketing": true, "new_content": true, "activity_reports": true}),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // Account B still sees defaults.
    let res = app
        .oneshot(authed_get("/account/email-preferences", Some(&b)))
        .await
        .unwrap();
    let body = body_json(res).await;
    assert_eq!(body["marketing"], false);
    assert_eq!(body["new_content"], false);
    assert_eq!(body["activity_reports"], false);
}

#[tokio::test]
async fn email_preferences_reject_anonymous_and_kid_tokens() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);

    // No token → 401.
    let res = app
        .clone()
        .oneshot(authed_get("/account/email-preferences", None))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // Kid-scoped token → 403 (AdultAuth).
    let parent_token = register_parent(&app, "prefs-kid@test.com").await;
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/children")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {parent_token}"))
                .body(Body::from(
                    json!({"nickname": "Rio", "avatar_id": "cat", "birth_year": 2016,
                           "parent_email": "prefs-kid@test.com"})
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let kid_token = body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned();

    let res = app
        .clone()
        .oneshot(authed_get("/account/email-preferences", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    let res = app
        .oneshot(authed_put(
            "/account/email-preferences",
            &kid_token,
            json!({"marketing": true, "new_content": true, "activity_reports": true}),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}
