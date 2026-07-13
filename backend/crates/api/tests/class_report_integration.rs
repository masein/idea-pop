//! Integration tests for the teacher class-progress report (JSON + CSV).
//!
//! A teacher rosters two students, one of whom completes the assigned
//! challenge (with XP + a shared project). The report must reflect that,
//! be scoped to the caller's own class, and reject non-teachers.

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
        Arc::new(JwtTokenIssuer::new("class-report-secret-32bytes!!!!", 900)),
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
            json!({"email": email, "password": "password123",
                   "role": role, "display_name": "T"}),
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

async fn create_class(app: &axum::Router, teacher: &str) {
    let res = app
        .clone()
        .oneshot(post_json(
            "/classes",
            json!({"name": "Room 5"}),
            Some(teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "create class failed");
}

async fn add_student(app: &axum::Router, teacher: &str, nickname: &str) -> Uuid {
    let res = app
        .clone()
        .oneshot(post_json(
            "/teacher/class/students",
            json!({"nickname": nickname, "avatar_id": "cat", "birth_year": 2016}),
            Some(teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "create student failed");
    body_json(res).await["child_id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}

async fn seed_challenge(pool: &PgPool, title: &str, slug: &str) -> Uuid {
    sqlx::query_scalar(
        "INSERT INTO challenges (title, slug, season, week_number, steps)
         VALUES ($1, $2, 1, 1, '[]'::jsonb) RETURNING id",
    )
    .bind(title)
    .bind(slug)
    .fetch_one(pool)
    .await
    .unwrap()
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

async fn body_text(res: axum::response::Response) -> String {
    let bytes = to_bytes(res.into_body(), 1 << 20).await.unwrap();
    String::from_utf8(bytes.to_vec()).unwrap()
}

#[tokio::test]
async fn class_report_reflects_per_student_progress() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let teacher = register(&app, "teacher@example.com", "teacher").await;
    create_class(&app, &teacher).await;
    let alice = add_student(&app, &teacher, "Alice").await;
    let _bob = add_student(&app, &teacher, "Bob").await;

    // Assign a challenge to the class.
    let challenge_id = seed_challenge(&pool, "The Beaver Bridge", "beaver-bridge").await;
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

    // Alice completes it, earns XP, and shares a project.
    sqlx::query(
        "INSERT INTO challenge_attempts (child_id, challenge_id, current_step, status, completed_at)
         VALUES ($1, $2, 8, 'completed', now())",
    )
    .bind(alice)
    .bind(challenge_id)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO xp_events (child_id, source_type, source_id, amount) VALUES ($1, 'solve', $2, 20)",
    )
    .bind(alice)
    .bind(challenge_id)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO projects (child_id, origin_type, origin_id, title, effective_visibility)
         VALUES ($1, 'challenge', $2, 'My Bridge', 'class')",
    )
    .bind(alice)
    .bind(challenge_id)
    .execute(&pool)
    .await
    .unwrap();

    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/report", Some(&teacher)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;

    assert_eq!(body["summary"]["student_count"], 2);
    assert_eq!(
        body["summary"]["assigned_challenge_title"],
        "The Beaver Bridge"
    );
    assert_eq!(body["summary"]["completed_assigned"], 1);

    let students = body["students"].as_array().unwrap();
    let alice_row = students
        .iter()
        .find(|s| s["nickname"] == "Alice")
        .expect("Alice missing");
    assert_eq!(alice_row["total_xp"], 20);
    assert_eq!(alice_row["shared_projects"], 1);
    assert!(alice_row["last_active"].is_string());
    let attempt = &alice_row["attempts"][0];
    assert_eq!(attempt["status"], "completed");
    assert_eq!(attempt["current_step"], 8);
    assert_eq!(attempt["challenge_title"], "The Beaver Bridge");

    let bob_row = students
        .iter()
        .find(|s| s["nickname"] == "Bob")
        .expect("Bob missing");
    assert_eq!(bob_row["total_xp"], 0);
    assert_eq!(bob_row["attempts"].as_array().unwrap().len(), 0);

    // CSV export: right content type, header, and per-student rows.
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/report.csv", Some(&teacher)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let ct = res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_owned();
    assert!(ct.contains("text/csv"), "content-type was {ct}");
    let disp = res
        .headers()
        .get("content-disposition")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_owned();
    assert!(disp.contains("attachment"), "disposition was {disp}");
    let csv = body_text(res).await;
    assert!(csv.contains("Nickname,Challenge,Status,Step"));
    assert!(csv.contains("\"Alice\""));
    assert!(csv.contains("\"completed\""));
    assert!(csv.contains("\"not_started\""), "Bob should be not_started");
}

#[tokio::test]
async fn class_report_is_scoped_and_teacher_only() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool), None);

    let teacher_a = register(&app, "a@example.com", "teacher").await;
    create_class(&app, &teacher_a).await;
    add_student(&app, &teacher_a, "Alice").await;

    let teacher_b = register(&app, "b@example.com", "teacher").await;
    create_class(&app, &teacher_b).await;

    // Teacher B's report shows only B's class — never A's student.
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/report", Some(&teacher_b)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["summary"]["student_count"], 0);
    let has_alice = body["students"]
        .as_array()
        .unwrap()
        .iter()
        .any(|s| s["nickname"] == "Alice");
    assert!(!has_alice, "must not leak another class's students");

    // A non-teacher (parent) is rejected.
    let parent = register(&app, "p@example.com", "parent").await;
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/report", Some(&parent)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/report.csv", Some(&parent)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}
