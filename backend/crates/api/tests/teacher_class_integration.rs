//! Integration tests for the teacher class dashboard reads:
//! POST /classes → GET /teacher/class → assign → gallery.

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
        Arc::new(JwtTokenIssuer::new("teacher-test-secret-32bytes!!!", 900)),
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

async fn register(app: &axum::Router, email: &str, role: &str) -> String {
    let res = app
        .clone()
        .oneshot(post_json(
            "/auth/register",
            json!({"email": email, "password": "password123", "role": role}),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
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

fn get_req(uri: &str, token: &str) -> Request<Body> {
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

async fn seed_challenge(pool: &PgPool) -> Uuid {
    sqlx::query_scalar(
        r#"INSERT INTO challenges (title, slug, season, week_number, steps)
           VALUES ('Bridge Mission', 'bridge-class', 1, 90,
                   '[{"step":"brief","title":"B","story":"S","image_url":null}]'::jsonb)
           RETURNING id"#,
    )
    .fetch_one(pool)
    .await
    .unwrap()
}

#[tokio::test]
async fn class_created_via_post_is_readable_and_assignable() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let teacher = register(&app, "reader@school.com", "teacher").await;

    // No class yet → 404 (frontend renders the "No class yet" state).
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class", &teacher))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // Create via the SAME store the dashboard reads.
    let res = app
        .clone()
        .oneshot(post_json(
            "/classes",
            json!({"name": "Room 7"}),
            Some(&teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let created = body_json(res).await;
    let code = created["class_code"].as_str().unwrap().to_owned();

    // Immediately readable.
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class", &teacher))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let klass = body_json(res).await;
    assert_eq!(klass["name"], "Room 7");
    assert_eq!(klass["class_code"], code);
    assert_eq!(klass["student_count"], 0);
    assert_eq!(klass["assigned_challenge_id"], Value::Null);

    // A kid joins by code → student_count reflects it.
    let parent = register(&app, "join-parent@test.com", "parent").await;
    let res = app
        .clone()
        .oneshot(post_json(
            "/children",
            json!({"nickname": "Pixel", "avatar_id": "cat", "birth_year": 2016,
                   "parent_email": "join-parent@test.com"}),
            Some(&parent),
        ))
        .await
        .unwrap();
    let kid_token = body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned();
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/classes/{code}/join"),
            json!({}),
            Some(&kid_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class", &teacher))
        .await
        .unwrap();
    assert_eq!(body_json(res).await["student_count"], 1);

    // Assign a mission → persists with its title.
    let challenge = seed_challenge(&pool).await;
    let res = app
        .clone()
        .oneshot(post_json(
            "/teacher/class/assign",
            json!({"challenge_id": challenge}),
            Some(&teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["assigned_challenge_id"], challenge.to_string());
    assert_eq!(body["assigned_challenge_title"], "Bridge Mission");

    // Gallery: empty (no class-visible projects yet) but authorized.
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/gallery", &teacher))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert!(body_json(res).await.as_array().unwrap().is_empty());

    // Parents are rejected from all three.
    let res = app
        .oneshot(get_req("/teacher/class", &parent))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}
