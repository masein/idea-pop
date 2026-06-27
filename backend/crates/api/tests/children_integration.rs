//! Integration tests for child profiles, parental consent, and class endpoints.
//!
//! Proves (against a real Postgres via testcontainers):
//! 1. restricted → grant (DB direct) → unblock → revoke → re-block
//! 2. grant via HTTP endpoint using recording email sender
//! 3. class join grants ClassGranted, unblocking the child
//! 4. kid token rejected from adult-only routes

use std::sync::Arc;

use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
};
use idea_pop_api::{
    null_gamification, null_portfolio, NullChallengeRepo, NullExploreRepo, NullLibraryRepo,
};
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, NullConsentEmailSender, NullEmailSender, SqlxAccountRepo,
    SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo, SystemClock,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;

use idea_pop_api::{router, AppState};

// ── Helpers ───────────────────────────────────────────────────────────────────

async fn test_pool() -> PgPool {
    let container = Postgres::default().start().await.unwrap();
    let port = container.get_host_port_ipv4(5432).await.unwrap();
    let url = format!("postgres://postgres:postgres@localhost:{port}/postgres");
    let pool = PgPool::connect(&url).await.unwrap();
    sqlx::migrate!("../../migrations").run(&pool).await.unwrap();
    std::mem::forget(container);
    pool
}

fn make_state(
    pool: PgPool,
    consent_email: Arc<dyn idea_pop_domain::ConsentEmailSender>,
) -> AppState {
    AppState::new(
        pool.clone(),
        Arc::new(SqlxAccountRepo::new(pool.clone())),
        Arc::new(Argon2Hasher),
        Arc::new(JwtTokenIssuer::new("test-secret-32bytes-xxxxxxxxxxx", 900)),
        Arc::new(NullEmailSender),
        Arc::new(SystemClock),
        Arc::new(SqlxChildRepo::new(pool.clone())),
        Arc::new(SqlxConsentRepo::new(pool.clone())),
        Arc::new(SqlxClassRepo::new(pool)),
        consent_email,
        Arc::new(NullExploreRepo),
        Arc::new(NullLibraryRepo),
        Arc::new(NullChallengeRepo),
        null_gamification(),
        null_portfolio(),
    )
}

fn null_state(pool: PgPool) -> AppState {
    make_state(pool, Arc::new(NullConsentEmailSender))
}

async fn register(app: &axum::Router, email: &str, role: &str) -> String {
    let res = app
        .clone()
        .oneshot(post_json(
            "/auth/register",
            json!({
                "email": email,
                "password": "password123",
                "role": role,
                "display_name": "Test User"
            }),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::CREATED,
        "register failed for {email}"
    );
    body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned()
}

fn post_json(uri: &str, body: Value, auth: Option<&str>) -> Request<Body> {
    authed(Method::POST, uri, Body::from(body.to_string()), auth, true)
}

fn get_req(uri: &str, auth: Option<&str>) -> Request<Body> {
    authed(Method::GET, uri, Body::empty(), auth, false)
}

fn authed(
    method: Method,
    uri: &str,
    body: Body,
    auth: Option<&str>,
    json_ct: bool,
) -> Request<Body> {
    let mut b = Request::builder().method(method).uri(uri);
    if json_ct {
        b = b.header(header::CONTENT_TYPE, "application/json");
    }
    if let Some(t) = auth {
        b = b.header(header::AUTHORIZATION, format!("Bearer {t}"));
    }
    b.body(body).unwrap()
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap_or(Value::Null)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/// restricted → DB-grant → unblock → revoke via API → re-block
#[tokio::test]
async fn consent_lifecycle() {
    let pool = test_pool().await;
    let app = router(null_state(pool.clone()), None);

    let parent_token = register(&app, "lifecycle@example.com", "parent").await;

    // Create child.
    let res = app
        .clone()
        .oneshot(post_json(
            "/children",
            json!({ "nickname": "Rio", "avatar_id": 2, "birth_year": 2016,
                     "parent_email": "lifecycle@example.com" }),
            Some(&parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    let child_id = body["child_id"].as_str().unwrap().to_owned();
    let kid_token = body["access_token"].as_str().unwrap().to_owned();

    // RESTRICTED → gated blocked.
    let res = app
        .clone()
        .oneshot(get_req("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN, "expected restricted");

    // Simulate parent clicking email link: update DB directly (NullSender swallowed token).
    let child_uuid = uuid::Uuid::parse_str(&child_id).unwrap();
    sqlx::query(
        "UPDATE parental_consents SET status = 'granted', granted_at = NOW()
         WHERE child_id = $1 AND status = 'pending'",
    )
    .bind(child_uuid)
    .execute(&pool)
    .await
    .unwrap();

    // GRANTED → gated allowed.
    let res = app
        .clone()
        .oneshot(get_req("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "expected allowed after grant");

    // Revoke via API.
    let res = app
        .clone()
        .oneshot(post_json(
            &format!("/consents/{child_id}/revoke"),
            json!({}),
            Some(&parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT, "revoke failed");

    // REVOKED → gated blocked again.
    let res = app
        .clone()
        .oneshot(get_req("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "expected re-blocked after revoke"
    );
}

/// Grant via HTTP endpoint using a recording email sender.
#[tokio::test]
async fn grant_via_http_token() {
    use std::sync::Mutex;

    struct Recording {
        tokens: Mutex<Vec<String>>,
    }
    #[async_trait::async_trait]
    impl idea_pop_domain::ConsentEmailSender for Recording {
        async fn send_consent_request(
            &self,
            _: &str,
            _: &str,
            token: &str,
        ) -> Result<(), idea_pop_domain::DomainError> {
            self.tokens.lock().unwrap().push(token.into());
            Ok(())
        }
    }

    let pool = test_pool().await;
    let recorder = Arc::new(Recording {
        tokens: Mutex::new(vec![]),
    });
    let app = router(
        make_state(
            pool,
            Arc::clone(&recorder) as Arc<dyn idea_pop_domain::ConsentEmailSender>,
        ),
        None,
    );

    let parent_token = register(&app, "granthttp@example.com", "parent").await;

    let res = app
        .clone()
        .oneshot(post_json(
            "/children",
            json!({ "nickname": "Mia", "avatar_id": 3, "birth_year": 2014,
                     "parent_email": "granthttp@example.com" }),
            Some(&parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let kid_token = body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned();

    let raw_token = recorder.tokens.lock().unwrap()[0].clone();

    // Grant via HTTP (no auth required — parent gets link in email).
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/consents/{raw_token}/grant"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT, "grant failed");

    // Gated route now allowed.
    let res = app
        .clone()
        .oneshot(get_req("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::OK,
        "expected allowed after HTTP grant"
    );

    // Duplicate grant fails.
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/consents/{raw_token}/grant"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::UNAUTHORIZED,
        "duplicate grant should fail"
    );
}

/// Class join grants ClassGranted, unblocking gated routes for the child.
#[tokio::test]
async fn class_join_grants_consent() {
    let pool = test_pool().await;
    let app = router(null_state(pool), None);

    let teacher_token = register(&app, "teacher@example.com", "teacher").await;
    let parent_token = register(&app, "classparent@example.com", "parent").await;

    // Teacher creates a class.
    let res = app
        .clone()
        .oneshot(post_json(
            "/classes",
            json!({"name": "Nature Makers"}),
            Some(&teacher_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "create class failed");
    let class_code = body_json(res).await["class_code"]
        .as_str()
        .unwrap()
        .to_owned();

    // Parent creates child.
    let res = app
        .clone()
        .oneshot(post_json(
            "/children",
            json!({ "nickname": "Lee", "avatar_id": 4, "birth_year": 2015,
                     "parent_email": "classparent@example.com" }),
            Some(&parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let kid_token = body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned();

    // Before join: blocked.
    let res = app
        .clone()
        .oneshot(get_req("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "should be blocked before class join"
    );

    // Child joins class.
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/classes/{class_code}/join"))
                .header(header::AUTHORIZATION, format!("Bearer {kid_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "join class failed");

    // After join: allowed.
    let res = app
        .clone()
        .oneshot(get_req("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::OK,
        "should be allowed after class join"
    );
}

/// Kid token is rejected from adult-only routes.
#[tokio::test]
async fn kid_token_rejected_from_adult_routes() {
    let pool = test_pool().await;
    let app = router(null_state(pool), None);

    let parent_token = register(&app, "adultroute@example.com", "parent").await;

    let res = app
        .clone()
        .oneshot(post_json(
            "/children",
            json!({ "nickname": "Cub", "avatar_id": 5, "birth_year": 2016,
                     "parent_email": "adultroute@example.com" }),
            Some(&parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let kid_token = body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned();

    // Kid token → /me (AdultAuth) → 403.
    let res = app
        .clone()
        .oneshot(get_req("/me", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "kid token must be rejected from /me"
    );

    // Kid token → POST /children (AdultAuth) → 403.
    let res = app
        .clone()
        .oneshot(post_json(
            "/children",
            json!({ "nickname": "Sibling", "avatar_id": 1, "birth_year": 2017,
                     "parent_email": "adultroute@example.com" }),
            Some(&kid_token),
        ))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "kid token must not create children"
    );
}
