//! Integration tests for the parent "Needs your OK" queue and per-child
//! display mode. All SQL uses runtime `sqlx::query` (no offline cache needed).

use std::sync::Arc;

use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use idea_pop_api::{
    null_billing, null_gamification, router, AppState, NullPhotoStore, PortfolioRepos,
};
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, NullConsentEmailSender, NullEmailSender, SqlxAccountRepo,
    SqlxChallengeRepo, SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo, SqlxIdeaRepo,
    SqlxModerationRepo, SqlxProjectRepo, SqlxReportRepo, SystemClock,
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
    // Real portfolio repos: approve must actually promote visibility.
    let portfolio = PortfolioRepos {
        projects: Arc::new(SqlxProjectRepo::new(pool.clone())),
        photos: Arc::new(NullPhotoStore),
        moderation: Arc::new(SqlxModerationRepo::new(pool.clone())),
        ideas: Arc::new(SqlxIdeaRepo::new(pool.clone())),
        reports: Arc::new(SqlxReportRepo::new(pool.clone())),
    };
    AppState::new(
        pool.clone(),
        Arc::new(SqlxAccountRepo::new(pool.clone())),
        Arc::new(Argon2Hasher),
        Arc::new(JwtTokenIssuer::new("approvals-test-secret-32bytes!!", 900)),
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
        portfolio,
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

/// Seed a project with a pending class-visibility moderation item.
/// Returns (project_id, moderation_item_id).
async fn seed_pending_share(pool: &PgPool, child_id: Uuid) -> (Uuid, Uuid) {
    let project_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO projects (child_id, origin_type, origin_id, title,
                                 requested_visibility, effective_visibility)
           VALUES ($1, 'challenge', gen_random_uuid(), 'My bridge', 'class', 'private')
           RETURNING id"#,
    )
    .bind(child_id)
    .fetch_one(pool)
    .await
    .unwrap();

    let item_id: Uuid = sqlx::query_scalar(
        r#"INSERT INTO moderation_queue (content_type, content_id, due_at)
           VALUES ('project', $1, now() + interval '72 hours')
           RETURNING id"#,
    )
    .bind(project_id)
    .fetch_one(pool)
    .await
    .unwrap();

    (project_id, item_id)
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

fn put_json(uri: &str, body: Value, token: &str) -> Request<Body> {
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
async fn approvals_queue_lists_only_own_children_pending_items() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let email = "queue-parent@test.com";
    let token = register_parent(&app, email).await;
    let (child_id, kid_token) = create_child(&app, &token, email).await;
    seed_pending_share(&pool, child_id).await;

    // Kid requests a premium unlock (kid-scoped endpoint).
    let res = app
        .clone()
        .oneshot(post_json(
            "/me/upgrade-request",
            json!({}),
            Some(&kid_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(get_req("/parent/approvals", Some(&token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let items: Vec<Value> = serde_json::from_value(body_json(res).await).unwrap();
    assert_eq!(items.len(), 2, "share_post + premium_unlock");

    let share = items.iter().find(|i| i["kind"] == "share_post").unwrap();
    assert_eq!(share["child_nickname"], "Pixel");
    assert_eq!(share["title"], "My bridge");
    assert_eq!(share["requested_visibility"], "class");
    let unlock = items
        .iter()
        .find(|i| i["kind"] == "premium_unlock")
        .unwrap();
    assert_eq!(unlock["child_nickname"], "Pixel");
    assert_eq!(unlock["title"], Value::Null);

    // Another parent sees an empty queue.
    let other = register_parent(&app, "queue-other@test.com").await;
    let res = app
        .clone()
        .oneshot(get_req("/parent/approvals", Some(&other)))
        .await
        .unwrap();
    let items: Vec<Value> = serde_json::from_value(body_json(res).await).unwrap();
    assert!(items.is_empty());

    // Kid tokens are rejected.
    let res = app
        .oneshot(get_req("/parent/approvals", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn approve_share_post_promotes_visibility_and_records_approver() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let email = "approve-parent@test.com";
    let token = register_parent(&app, email).await;
    let (child_id, _) = create_child(&app, &token, email).await;
    let (project_id, item_id) = seed_pending_share(&pool, child_id).await;

    // Another parent may not approve it.
    let other = register_parent(&app, "approve-other@test.com").await;
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/parent/approvals/{item_id}/approve"),
            json!({"kind": "share_post"}),
            Some(&other),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // The owning parent approves.
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/parent/approvals/{item_id}/approve"),
            json!({"kind": "share_post"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(body_json(res).await["status"], "approved");

    // Effective visibility promoted to the requested level.
    let (eff, status): (String, String) = sqlx::query_as(
        r#"SELECT p.effective_visibility, m.status
           FROM projects p, moderation_queue m
           WHERE p.id = $1 AND m.id = $2"#,
    )
    .bind(project_id)
    .bind(item_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(eff, "class");
    assert_eq!(status, "approved");

    // The parent is recorded as the human approver.
    let approver: Option<Uuid> =
        sqlx::query_scalar("SELECT reviewer_id FROM moderation_queue WHERE id = $1")
            .bind(item_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(approver.is_some(), "approval must be recorded");

    // Already resolved → 404.
    let res = app
        .oneshot(post_json(
            &format!("/parent/approvals/{item_id}/approve"),
            json!({"kind": "share_post"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn premium_unlock_requests_are_idempotent_and_dismissable() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let email = "unlock-parent@test.com";
    let token = register_parent(&app, email).await;
    let (child_id, kid_token) = create_child(&app, &token, email).await;

    // Two taps → still one pending request.
    for _ in 0..2 {
        let res = app
            .clone()
            .oneshot(post_json(
                "/me/upgrade-request",
                json!({}),
                Some(&kid_token),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }
    let pending: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM premium_unlock_requests WHERE child_id = $1 AND status = 'pending'",
    )
    .bind(child_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(pending, 1);

    // Adult tokens may not create upgrade requests (kid-scoped route).
    let res = app
        .clone()
        .oneshot(post_json("/me/upgrade-request", json!({}), Some(&token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // Parent dismisses it.
    let item_id: Uuid = sqlx::query_scalar(
        "SELECT id FROM premium_unlock_requests WHERE child_id = $1 AND status = 'pending'",
    )
    .bind(child_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/parent/approvals/{item_id}/dismiss"),
            json!({"kind": "premium_unlock"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(body_json(res).await["status"], "dismissed");

    // Queue is empty again; the kid may ask again later (new pending row OK).
    let res = app
        .clone()
        .oneshot(get_req("/parent/approvals", Some(&token)))
        .await
        .unwrap();
    let items: Vec<Value> = serde_json::from_value(body_json(res).await).unwrap();
    assert!(items.is_empty());
    let res = app
        .clone()
        .oneshot(post_json(
            "/me/upgrade-request",
            json!({}),
            Some(&kid_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // Unknown kind → 422.
    let res = app
        .oneshot(post_json(
            &format!("/parent/approvals/{item_id}/approve"),
            json!({"kind": "nonsense"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn display_mode_roundtrips_and_validates() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let email = "display-parent@test.com";
    let token = register_parent(&app, email).await;
    let (child_id, _) = create_child(&app, &token, email).await;

    // Default in the children list.
    let res = app
        .clone()
        .oneshot(get_req("/parent/children", Some(&token)))
        .await
        .unwrap();
    let kids: Vec<Value> = serde_json::from_value(body_json(res).await).unwrap();
    assert_eq!(kids[0]["display_mode"], "avatar_nickname");

    // Update and read back.
    let res = app
        .clone()
        .oneshot(put_json(
            &format!("/parent/children/{child_id}/display-mode"),
            json!({"display_mode": "anonymous"}),
            &token,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let res = app
        .clone()
        .oneshot(get_req("/parent/children", Some(&token)))
        .await
        .unwrap();
    let kids: Vec<Value> = serde_json::from_value(body_json(res).await).unwrap();
    assert_eq!(kids[0]["display_mode"], "anonymous");

    // Invalid value → 422.
    let res = app
        .clone()
        .oneshot(put_json(
            &format!("/parent/children/{child_id}/display-mode"),
            json!({"display_mode": "full_dossier"}),
            &token,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);

    // Another parent → 403.
    let other = register_parent(&app, "display-other@test.com").await;
    let res = app
        .oneshot(put_json(
            &format!("/parent/children/{child_id}/display-mode"),
            json!({"display_mode": "first_name"}),
            &other,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}
