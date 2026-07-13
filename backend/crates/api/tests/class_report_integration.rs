//! Integration tests for the mission-scoped teacher class report (JSON + CSV).
//!
//! A teacher rosters two students; one completes the assigned mission (with XP
//! plus a shared project). The report for that mission must reflect it, stay
//! scoped to the caller's own class, reject non-teachers, and export one CSV
//! row per student.

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

async fn assign(app: &axum::Router, teacher: &str, challenge_id: Uuid) {
    let res = app
        .clone()
        .oneshot(post_json(
            "/teacher/class/assign",
            json!({"challenge_id": challenge_id}),
            Some(teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "assign failed");
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
async fn class_report_reflects_mission_progress() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);
    let teacher = register(&app, "teacher@example.com", "teacher").await;
    create_class(&app, &teacher).await;
    let alice = add_student(&app, &teacher, "Alice").await;
    let _bob = add_student(&app, &teacher, "Bob").await;

    let mission = seed_challenge(&pool, "The Beaver Bridge", "beaver-bridge").await;
    assign(&app, &teacher, mission).await;

    // Alice completes it, earns its XP, and shares a project for it.
    sqlx::query(
        "INSERT INTO challenge_attempts (child_id, challenge_id, current_step, status, completed_at)
         VALUES ($1, $2, 8, 'completed', now())",
    )
    .bind(alice)
    .bind(mission)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO xp_events (child_id, source_type, source_id, amount) VALUES ($1, 'solve', $2, 20)",
    )
    .bind(alice)
    .bind(mission)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO projects (child_id, origin_type, origin_id, title, effective_visibility)
         VALUES ($1, 'challenge', $2, 'My Bridge', 'class')",
    )
    .bind(alice)
    .bind(mission)
    .execute(&pool)
    .await
    .unwrap();

    // Default (no param) resolves to the assigned mission.
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/report", Some(&teacher)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;

    assert_eq!(body["summary"]["challenge_title"], "The Beaver Bridge");
    assert_eq!(body["summary"]["challenge_id"], mission.to_string());
    assert_eq!(body["summary"]["student_count"], 2);
    assert_eq!(body["summary"]["completed"], 1);
    assert_eq!(body["summary"]["in_progress"], 0);
    assert_eq!(body["summary"]["not_started"], 1);

    let students = body["students"].as_array().unwrap();
    let alice_row = students.iter().find(|s| s["nickname"] == "Alice").unwrap();
    assert_eq!(alice_row["status"], "completed");
    assert_eq!(alice_row["current_step"], 8);
    assert_eq!(alice_row["xp"], 20);
    assert_eq!(alice_row["shared"], true);
    assert!(alice_row["last_active"].is_string());
    let bob_row = students.iter().find(|s| s["nickname"] == "Bob").unwrap();
    assert_eq!(bob_row["status"], "not_started");
    assert_eq!(bob_row["current_step"], 0);
    assert_eq!(bob_row["shared"], false);

    // A DIFFERENT mission the class hasn't touched → everyone not_started.
    let other = seed_challenge(&pool, "Spot the Fake", "spot-the-fake").await;
    let res = app
        .clone()
        .oneshot(get_req(
            &format!("/teacher/class/report?challenge_id={other}"),
            Some(&teacher),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["summary"]["challenge_title"], "Spot the Fake");
    assert_eq!(body["summary"]["completed"], 0);
    assert_eq!(body["summary"]["not_started"], 2);

    // CSV export: one row per student (+ header).
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
    assert!(
        disp.contains("attachment") && disp.contains("beaver-bridge"),
        "disposition was {disp}"
    );
    let csv = body_text(res).await;
    let data_rows = csv
        .lines()
        .skip(1) // header
        .filter(|l| !l.trim().is_empty())
        .count();
    assert_eq!(data_rows, 2, "CSV must have one row per student");
    assert!(csv.contains("\"Alice\"") && csv.contains("\"completed\""));
    assert!(csv.contains("\"Bob\"") && csv.contains("\"not_started\""));
}

#[tokio::test]
async fn class_report_is_scoped_and_teacher_only() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool.clone()), None);

    let teacher_a = register(&app, "a@example.com", "teacher").await;
    create_class(&app, &teacher_a).await;
    add_student(&app, &teacher_a, "Alice").await;
    let mission = seed_challenge(&pool, "Mission A", "mission-a").await;
    assign(&app, &teacher_a, mission).await;

    let teacher_b = register(&app, "b@example.com", "teacher").await;
    create_class(&app, &teacher_b).await;

    // Teacher B, reporting on A's mission id, still sees only B's own (empty) class.
    let res = app
        .clone()
        .oneshot(get_req(
            &format!("/teacher/class/report?challenge_id={mission}"),
            Some(&teacher_b),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["summary"]["student_count"], 0);
    let leaks_alice = body["students"]
        .as_array()
        .unwrap()
        .iter()
        .any(|s| s["nickname"] == "Alice");
    assert!(!leaks_alice, "must not leak another class's students");

    // Non-teacher (parent) is rejected on both endpoints.
    let parent = register(&app, "p@example.com", "parent").await;
    for uri in ["/teacher/class/report", "/teacher/class/report.csv"] {
        let res = app
            .clone()
            .oneshot(get_req(uri, Some(&parent)))
            .await
            .unwrap();
        assert_eq!(
            res.status(),
            StatusCode::FORBIDDEN,
            "{uri} allowed a parent"
        );
    }
}
