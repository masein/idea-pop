//! Integration test for GET /me/class-mission — a class kid reads the
//! challenge their teacher assigned to the class (null until one is assigned).

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
        Arc::new(JwtTokenIssuer::new("class-mission-secret-32bytes!!!!", 900)),
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
            json!({"email": email, "password": "password123", "role": role, "display_name": "T"}),
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

async fn create_class(app: &axum::Router, teacher: &str) -> String {
    let res = app
        .clone()
        .oneshot(post_json(
            "/classes",
            json!({"name": "Room 5"}),
            Some(teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    body_json(res).await["class_code"]
        .as_str()
        .unwrap()
        .to_owned()
}

/// Roster a student, then sign them in with the PIN → returns the kid token.
async fn kid_token(app: &axum::Router, teacher: &str, code: &str) -> String {
    let res = app
        .clone()
        .oneshot(post_json(
            "/teacher/class/students",
            json!({"nickname": "Nova", "avatar_id": "cat", "birth_year": 2016}),
            Some(teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    let child_id = body["child_id"].as_str().unwrap().to_owned();
    let pin = body["login_pin"].as_str().unwrap().to_owned();

    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/classes/{code}/login"),
            json!({"child_id": child_id, "pin": pin}),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "kid login failed");
    body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned()
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
async fn kid_sees_the_class_assigned_mission() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let teacher = register(&app, "teacher@example.com", "teacher").await;
    let code = create_class(&app, &teacher).await;
    let kid = kid_token(&app, &teacher, &code).await;

    // Before the teacher assigns anything → null (no assignment yet).
    let res = app
        .clone()
        .oneshot(get_req("/me/class-mission", Some(&kid)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert!(
        body_json(res).await.is_null(),
        "expected null before assignment"
    );

    // Teacher assigns a challenge to the class.
    let challenge_id: Uuid = sqlx::query_scalar(
        "INSERT INTO challenges (title, slug, season, week_number, steps)
         VALUES ('Teach the Machine to See', 'teach-the-machine-to-see', 1, 5, '[]'::jsonb)
         RETURNING id",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let res = app
        .clone()
        .oneshot(post_json(
            "/teacher/class/assign",
            json!({"challenge_id": challenge_id}),
            Some(&teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "assign failed");

    // Now the kid sees THAT mission as their current one.
    let res = app
        .clone()
        .oneshot(get_req("/me/class-mission", Some(&kid)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["challenge_id"], challenge_id.to_string());
    assert_eq!(body["title"], "Teach the Machine to See");
}

#[tokio::test]
async fn non_kid_token_is_rejected() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool), None);
    let teacher = register(&app, "t@example.com", "teacher").await;

    // An adult (teacher) token is not a kid token → 403.
    let res = app
        .clone()
        .oneshot(get_req("/me/class-mission", Some(&teacher)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}
