//! Integration tests for the in-app parent consent grant/revoke endpoints
//! (POST /consents/grant and /consents/revoke with {child_id, scope}) — the
//! contract the dashboard SafetyToggles and "Approve account" action call.
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
        Arc::new(JwtTokenIssuer::new("consents-test-secret-32bytes!!!", 900)),
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
        .oneshot(post_json(
            "/auth/register",
            json!({"email": email, "password": "password123",
                   "role": "parent", "display_name": "Test"}),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "register failed");

    let res = app
        .clone()
        .oneshot(post_json(
            "/auth/login",
            json!({"email": email, "password": "password123"}),
            None,
        ))
        .await
        .unwrap();
    body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned()
}

/// Create a child via the API; returns (child_id, kid_token).
async fn create_child(app: &axum::Router, parent_token: &str, email: &str) -> (Uuid, String) {
    let res = app
        .clone()
        .oneshot(post_json(
            "/children",
            json!({"nickname": "Pixel", "avatar_id": "cat", "birth_year": 2016,
                   "parent_email": email}),
            Some(parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "create child failed");
    let body = body_json(res).await;
    (
        body["child_id"].as_str().unwrap().parse().unwrap(),
        body["access_token"].as_str().unwrap().to_owned(),
    )
}

/// Fetch the parent's children list and return the row for `child_id`.
async fn child_row(app: &axum::Router, parent_token: &str, child_id: Uuid) -> Value {
    let res = app
        .clone()
        .oneshot(get_req("/parent/children", Some(parent_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    body.as_array()
        .unwrap()
        .iter()
        .find(|c| c["id"].as_str() == Some(&child_id.to_string()))
        .cloned()
        .expect("child missing from /parent/children")
}

fn get_req(uri: &str, token: Option<&str>) -> Request<Body> {
    let mut b = Request::builder().method("GET").uri(uri);
    if let Some(t) = token {
        b = b.header("authorization", format!("Bearer {t}"));
    }
    b.body(Body::empty()).unwrap()
}

fn post_json(uri: &str, body: Value, token: Option<&str>) -> Request<Body> {
    let mut b = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/json");
    if let Some(t) = token {
        b = b.header("authorization", format!("Bearer {t}"));
    }
    b.body(Body::from(body.to_string())).unwrap()
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = to_bytes(res.into_body(), 1 << 20).await.unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn parent_grants_and_revokes_consent_by_child_id() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool), None);
    let email = "consent-parent@test.com";
    let token = register_parent(&app, email).await;
    let (child_id, _kid) = create_child(&app, &token, email).await;

    // Fresh child: pending consent, nothing enabled.
    let row = child_row(&app, &token, child_id).await;
    assert_eq!(row["consent_granted"], json!(false));
    assert_eq!(row["class_sharing_enabled"], json!(false));
    assert_eq!(row["public_sharing_enabled"], json!(false));

    // Grant class scope -> class sharing on, full consent still off.
    let res = app
        .clone()
        .oneshot(post_json(
            "/consents/grant",
            json!({"child_id": child_id, "scope": "class"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);
    let row = child_row(&app, &token, child_id).await;
    assert_eq!(row["class_sharing_enabled"], json!(true));
    assert_eq!(row["consent_granted"], json!(false));

    // Grant all -> full consent (the "Approve account" action).
    let res = app
        .clone()
        .oneshot(post_json(
            "/consents/grant",
            json!({"child_id": child_id, "scope": "all"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);
    let row = child_row(&app, &token, child_id).await;
    assert_eq!(row["consent_granted"], json!(true));
    assert_eq!(row["public_sharing_enabled"], json!(true));

    // Revoke -> everything off again.
    let res = app
        .clone()
        .oneshot(post_json(
            "/consents/revoke",
            json!({"child_id": child_id, "scope": "public"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);
    let row = child_row(&app, &token, child_id).await;
    assert_eq!(row["consent_granted"], json!(false));
    assert_eq!(row["class_sharing_enabled"], json!(false));
    assert_eq!(row["public_sharing_enabled"], json!(false));
}

#[tokio::test]
async fn consent_grant_rejects_wrong_parent_bad_scope_and_kid_tokens() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool), None);
    let email = "owner-parent@test.com";
    let token = register_parent(&app, email).await;
    let (child_id, kid_token) = create_child(&app, &token, email).await;

    // Another parent cannot grant for a child they don't own.
    let stranger = register_parent(&app, "other-parent@test.com").await;
    let res = app
        .clone()
        .oneshot(post_json(
            "/consents/grant",
            json!({"child_id": child_id, "scope": "all"}),
            Some(&stranger),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // Unknown scope is a validation error.
    let res = app
        .clone()
        .oneshot(post_json(
            "/consents/grant",
            json!({"child_id": child_id, "scope": "everything"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);

    // Kid tokens can never touch consent.
    for uri in ["/consents/grant", "/consents/revoke"] {
        let res = app
            .clone()
            .oneshot(post_json(
                uri,
                json!({"child_id": child_id, "scope": "all"}),
                Some(&kid_token),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN, "{uri} allowed a kid");
    }

    // Consent state is untouched after all the rejected attempts.
    let row = child_row(&app, &token, child_id).await;
    assert_eq!(row["consent_granted"], json!(false));
    assert_eq!(row["class_sharing_enabled"], json!(false));
}
