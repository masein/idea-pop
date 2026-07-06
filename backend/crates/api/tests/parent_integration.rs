//! Integration tests for the parent-scoped family endpoints.
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
use uuid::Uuid;

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
        Arc::new(JwtTokenIssuer::new("parent-test-secret-32bytes!!!!", 900)),
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

fn authed_get(uri: &str, token: &str) -> Request<Body> {
    Request::builder()
        .method("GET")
        .uri(uri)
        .header("authorization", format!("Bearer {token}"))
        .body(Body::empty())
        .unwrap()
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = to_bytes(res.into_body(), 1 << 20).await.unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

async fn account_id(pool: &PgPool, email: &str) -> Uuid {
    sqlx::query_scalar("SELECT id FROM accounts WHERE email = $1")
        .bind(email)
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn seed_child(pool: &PgPool, parent: Uuid) -> Uuid {
    let child_id: Uuid = sqlx::query_scalar(
        "INSERT INTO child_profiles (parent_account_id, nickname, avatar_id, birth_year)
         VALUES ($1, 'Pixel', 5, 2016) RETURNING id",
    )
    .bind(parent)
    .fetch_one(pool)
    .await
    .unwrap();

    // 20 XP from an explore event → level 2.
    sqlx::query(
        "INSERT INTO xp_events (child_id, source_type, source_id, amount)
         VALUES ($1, 'explore', gen_random_uuid(), 20)",
    )
    .bind(child_id)
    .execute(pool)
    .await
    .unwrap();

    // Granted parental consent.
    sqlx::query(
        "INSERT INTO parental_consents (child_id, token_hash, status, expires_at, granted_at)
         VALUES ($1, $2, 'granted', now() + interval '30 days', now())",
    )
    .bind(child_id)
    .bind(format!("hash-{child_id}"))
    .execute(pool)
    .await
    .unwrap();

    child_id
}

#[tokio::test]
async fn parent_children_lists_own_kids_with_level_and_consent() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let token = register_parent(&app, "parent-kids@test.com").await;
    let parent = account_id(&pool, "parent-kids@test.com").await;
    let child_id = seed_child(&pool, parent).await;

    let res = app
        .oneshot(authed_get("/parent/children", &token))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body: Vec<Value> = serde_json::from_value(body_json(res).await).unwrap();
    assert_eq!(body.len(), 1);
    let c = &body[0];
    assert_eq!(c["id"], child_id.to_string());
    assert_eq!(c["nickname"], "Pixel");
    assert_eq!(c["avatar_id"], "5");
    assert_eq!(c["total_xp"], 20);
    assert_eq!(c["level"], 2, "20 XP → level 2");
    assert_eq!(c["consent_granted"], true);
    assert_eq!(c["public_sharing_enabled"], true);
    assert_eq!(c["class_sharing_enabled"], false);
}

#[tokio::test]
async fn parent_report_returns_weekly_counts_and_enforces_ownership() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let token = register_parent(&app, "parent-report@test.com").await;
    let parent = account_id(&pool, "parent-report@test.com").await;
    let child_id = seed_child(&pool, parent).await;

    let res = app
        .clone()
        .oneshot(authed_get(
            &format!("/parent/children/{child_id}/report"),
            &token,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["child_id"], child_id.to_string());
    assert_eq!(
        body["xp_earned"], 20,
        "the seeded event is in the current week"
    );
    assert!(body["projects"].is_array());

    // A random child → 404.
    let res = app
        .clone()
        .oneshot(authed_get(
            "/parent/children/00000000-0000-0000-0000-000000000000/report",
            &token,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // Another parent cannot read this child's report → 403.
    let other = register_parent(&app, "other-parent@test.com").await;
    let res = app
        .oneshot(authed_get(
            &format!("/parent/children/{child_id}/report"),
            &other,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}
