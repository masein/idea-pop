//! Integration tests for teacher-created class students + kid PIN login.
//!
//! Flow: teacher registers → creates a class → rosters a student (gets a
//! one-time PIN) → the kid signs in publicly with class code + child + PIN.
//! Also covers the brute-force lockout, the public roster, and that a teacher
//! cannot reset a PIN for a child outside their own class.

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
        Arc::new(JwtTokenIssuer::new("class-students-secret-32bytes!!!", 900)),
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
                   "role": role, "display_name": "Teacher T"}),
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
    assert_eq!(res.status(), StatusCode::CREATED, "create class failed");
    body_json(res).await["class_code"]
        .as_str()
        .unwrap()
        .to_owned()
}

async fn add_student(app: &axum::Router, teacher: &str, nickname: &str) -> (String, String) {
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
    let body = body_json(res).await;
    (
        body["child_id"].as_str().unwrap().to_owned(),
        body["login_pin"].as_str().unwrap().to_owned(),
    )
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
async fn teacher_creates_student_and_kid_signs_in_with_pin() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool), None);
    let teacher = register(&app, "teacher@example.com", "teacher").await;
    let code = create_class(&app, &teacher).await;
    let (child_id, pin) = add_student(&app, &teacher, "PixelFox").await;

    // Public roster (no auth) lists the pickable kid, nickname + avatar only.
    let res = app
        .clone()
        .oneshot(get_req(&format!("/classes/{code}/roster"), None))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let roster = body_json(res).await;
    let entry = roster
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["child_id"].as_str() == Some(&child_id))
        .expect("student missing from public roster");
    assert_eq!(entry["nickname"], "PixelFox");
    assert!(entry.get("pin").is_none(), "roster must not leak the PIN");

    // Wrong PIN → 401, no session.
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/classes/{code}/login"),
            json!({"child_id": child_id, "pin": "9999"}),
            None,
        ))
        .await
        .unwrap();
    // A 4-digit collision is a 1/10000 fluke; guard against it.
    if pin != "9999" {
        assert_eq!(
            res.status(),
            StatusCode::UNAUTHORIZED,
            "wrong PIN must fail"
        );
    }

    // Correct PIN → 200 with a kid access token + refresh cookie.
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/classes/{code}/login"),
            json!({"child_id": child_id, "pin": pin}),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "correct PIN must sign in");
    let sets_cookie = res
        .headers()
        .get_all("set-cookie")
        .iter()
        .any(|v| v.to_str().unwrap_or_default().contains("ideapop_refresh="));
    assert!(sets_cookie, "PIN login must set a kid refresh cookie");
    let body = body_json(res).await;
    assert!(body["access_token"].as_str().is_some_and(|t| !t.is_empty()));
    assert_eq!(body["nickname"], "PixelFox");

    // Teacher roster shows the student with a PIN.
    let res = app
        .clone()
        .oneshot(get_req("/teacher/class/students", Some(&teacher)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let students = body_json(res).await;
    let me = students
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["child_id"].as_str() == Some(&child_id))
        .expect("student missing from teacher roster");
    assert_eq!(me["has_login_pin"], true);
}

#[tokio::test]
async fn pin_login_locks_out_after_repeated_failures() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool), None);
    let teacher = register(&app, "lockout@example.com", "teacher").await;
    let code = create_class(&app, &teacher).await;
    let (child_id, pin) = add_student(&app, &teacher, "Turtle").await;
    let wrong = if pin == "0000" { "1111" } else { "0000" };

    // Five wrong tries trip the lockout; the sixth is 429 even if correct.
    for _ in 0..5 {
        let res = app
            .clone()
            .oneshot(post_json(
                &format!("/classes/{code}/login"),
                json!({"child_id": child_id, "pin": wrong}),
                None,
            ))
            .await
            .unwrap();
        assert!(matches!(
            res.status(),
            StatusCode::UNAUTHORIZED | StatusCode::TOO_MANY_REQUESTS
        ));
    }
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/classes/{code}/login"),
            json!({"child_id": child_id, "pin": pin}),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::TOO_MANY_REQUESTS,
        "correct PIN must still be locked out after 5 failures"
    );
}

#[tokio::test]
async fn teacher_cannot_reset_pin_for_another_classs_student() {
    let (pool, _pg) = start_postgres().await;
    let app = router(state(pool), None);

    let teacher_a = register(&app, "a@example.com", "teacher").await;
    create_class(&app, &teacher_a).await;
    let (child_id, _pin) = add_student(&app, &teacher_a, "Otter").await;

    let teacher_b = register(&app, "b@example.com", "teacher").await;
    create_class(&app, &teacher_b).await;

    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/teacher/class/students/{child_id}/reset-pin"),
            json!({}),
            Some(&teacher_b),
        ))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::NOT_FOUND,
        "a teacher must not touch another class's student"
    );
}
