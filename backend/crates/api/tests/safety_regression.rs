//! Safety regression suite — CLAUDE.md non-negotiables.
//!
//! Every test in this file proves a product safety invariant. If any of these
//! tests fails it means a non-negotiable safety rule has been broken.
//!
//! Invariants covered:
//!  1. Unauthenticated requests to protected routes → 401
//!  2. Invalid / tampered JWT → 401
//!  3. Kid token rejected from billing routes (AdultAuth guard)
//!  4. Kid token rejected from moderation routes (ReviewerAuth guard)
//!  5. Parent/adult token rejected from kid-only progress routes (KidAuth guard)
//!  6. Consent gate blocks RESTRICTED children from sharing routes
//!  7. Consent gate lets GRANTED children through sharing routes
//!  8. Projects are PRIVATE by default
//!  9. Cross-child ownership: kid A cannot change kid B's project visibility
//! 10. Auth endpoint rate-limit triggers 429 after burst

use std::sync::Arc;

use axum::{
    body::{to_bytes, Body},
    http::{header, Method, Request, StatusCode},
};
use idea_pop_api::{
    create_auth_rate_limiter, null_billing, null_gamification, router, AppState, NullChallengeRepo,
    NullExploreRepo, NullLibraryRepo, NullPhotoStore, PortfolioRepos,
};
use idea_pop_domain::TokenIssuer;
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, NullConsentEmailSender, NullEmailSender, SqlxAccountRepo,
    SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo, SqlxIdeaRepo, SqlxModerationRepo,
    SqlxProjectRepo, SqlxReportRepo, SystemClock,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;
use uuid::Uuid;

const JWT_SECRET: &str = "safety-test-secret-32bytes-!!!xz";

// ── Setup ─────────────────────────────────────────────────────────────────────

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

fn make_state(pool: PgPool) -> AppState {
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
        Arc::new(JwtTokenIssuer::new(JWT_SECRET, 900)),
        Arc::new(NullEmailSender),
        Arc::new(SystemClock),
        Arc::new(SqlxChildRepo::new(pool.clone())),
        Arc::new(SqlxConsentRepo::new(pool.clone())),
        Arc::new(SqlxClassRepo::new(pool.clone())),
        Arc::new(NullConsentEmailSender),
        Arc::new(NullExploreRepo),
        Arc::new(NullLibraryRepo),
        Arc::new(NullChallengeRepo),
        null_gamification(),
        portfolio,
        null_billing(),
    )
}

// ── Request helpers ───────────────────────────────────────────────────────────

fn req(method: Method, uri: &str, body: Option<Value>, token: Option<&str>) -> Request<Body> {
    let mut b = Request::builder().method(method).uri(uri);
    if let Some(t) = token {
        b = b.header(header::AUTHORIZATION, format!("Bearer {t}"));
    }
    let (body_bytes, has_body) = match body {
        Some(v) => (v.to_string().into_bytes(), true),
        None => (vec![], false),
    };
    if has_body {
        b = b.header(header::CONTENT_TYPE, "application/json");
    }
    b.body(Body::from(body_bytes)).unwrap()
}

fn get(uri: &str, token: Option<&str>) -> Request<Body> {
    req(Method::GET, uri, None, token)
}
fn post(uri: &str, body: Value, token: Option<&str>) -> Request<Body> {
    req(Method::POST, uri, Some(body), token)
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    serde_json::from_slice(&bytes).unwrap_or(Value::Null)
}

/// Register an account and return the access token.
async fn register_and_login(app: &axum::Router, email: &str, role: &str) -> String {
    let res = app
        .clone()
        .oneshot(post(
            "/auth/register",
            json!({ "email": email, "password": "password123", "role": role }),
            None,
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "register {email}");
    body_json(res).await["access_token"]
        .as_str()
        .unwrap()
        .to_owned()
}

/// Register a parent, create a child, return (parent_token, kid_token, child_id).
async fn register_family(
    app: &axum::Router,
    parent_email: &str,
    nickname: &str,
) -> (String, String, String) {
    let parent_token = register_and_login(app, parent_email, "parent").await;
    let res = app
        .clone()
        .oneshot(post(
            "/children",
            json!({
                "nickname": nickname,
                "avatar_id": "cat",
                "birth_year": 2015,
                "parent_email": parent_email
            }),
            Some(&parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "create child");
    let body = body_json(res).await;
    let kid_token = body["access_token"].as_str().unwrap().to_owned();
    let child_id = body["child_id"].as_str().unwrap().to_owned();
    (parent_token, kid_token, child_id)
}

// ── Invariant 1: Unauthenticated → 401 ────────────────────────────────────────

#[tokio::test]
async fn unauthenticated_me_returns_401() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let res = app.oneshot(get("/me", None)).await.unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn unauthenticated_projects_returns_401() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let res = app.oneshot(get("/me/projects", None)).await.unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn unauthenticated_billing_returns_401() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let res = app
        .oneshot(post("/billing/checkout", json!({"plan": "monthly"}), None))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ── Invariant 2: Invalid JWT → 401 ────────────────────────────────────────────

#[tokio::test]
async fn tampered_jwt_returns_401() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let res = app
        .oneshot(get("/me", Some("this.is.not.a.valid.jwt")))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn wrong_secret_jwt_returns_401() {
    let (pool, _pg) = start_postgres().await;
    // Issue a token with a different secret than the server uses (simulates a forged token).
    let forged_issuer = JwtTokenIssuer::new("wrong-secret-key-32bytes-padding!", 900);
    let fake_pair = forged_issuer
        .issue(Uuid::new_v4(), &idea_pop_domain::Role::Parent)
        .await
        .expect("issue forged token pair");

    let app = router(make_state(pool), None);
    let res = app
        .oneshot(get("/me", Some(&fake_pair.access_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ── Invariant 3: Kid token blocked from billing (AdultAuth) ───────────────────

#[tokio::test]
async fn kid_blocked_from_billing_checkout() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let (_, kid_token, _) = register_family(&app, "billing1@example.com", "Dino").await;

    let res = app
        .oneshot(post(
            "/billing/checkout",
            json!({"plan": "monthly"}),
            Some(&kid_token),
        ))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "kid must not access billing/checkout"
    );
}

#[tokio::test]
async fn kid_blocked_from_billing_portal() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let (_, kid_token, _) = register_family(&app, "billing2@example.com", "Dino").await;

    let res = app
        .oneshot(post("/billing/portal", json!({}), Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn kid_blocked_from_billing_subscription() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let (_, kid_token, _) = register_family(&app, "billing3@example.com", "Dino").await;

    let res = app
        .oneshot(get("/billing/subscription", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

// ── Invariant 4: Kid token blocked from reviewer routes (ReviewerAuth) ────────

#[tokio::test]
async fn kid_blocked_from_moderation_queue() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let (_, kid_token, _) = register_family(&app, "mod1@example.com", "Pika").await;

    let res = app
        .oneshot(get("/moderation/queue", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn kid_blocked_from_moderation_approve() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let (_, kid_token, _) = register_family(&app, "mod2@example.com", "Pika").await;
    let fake_id = Uuid::new_v4();

    let res = app
        .oneshot(post(
            &format!("/moderation/{fake_id}/approve"),
            json!({}),
            Some(&kid_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn parent_blocked_from_moderation_queue() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let parent_token = register_and_login(&app, "parent_mod@example.com", "parent").await;

    let res = app
        .oneshot(get("/moderation/queue", Some(&parent_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "parent must not reach reviewer-only queue"
    );
}

// ── Invariant 5: Adult token blocked from kid-only progress routes (KidAuth) ──

#[tokio::test]
async fn parent_blocked_from_kid_progress() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let parent_token = register_and_login(&app, "adult_prog@example.com", "parent").await;

    let res = app
        .oneshot(get("/me/progress", Some(&parent_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "adult token must not reach kid-only progress"
    );
}

#[tokio::test]
async fn parent_blocked_from_video_view() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool), None);
    let parent_token = register_and_login(&app, "adult_vid@example.com", "parent").await;

    let res = app
        .oneshot(post(
            "/progress/video-view",
            json!({ "video_id": Uuid::new_v4() }),
            Some(&parent_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

// ── Invariant 6+7: Consent gate ───────────────────────────────────────────────

#[tokio::test]
async fn consent_gate_blocks_restricted_kid() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool.clone()), None);
    let (_, kid_token, _) = register_family(&app, "gate1@example.com", "Rio").await;

    // RESTRICTED (pending consent) → gated route must be blocked.
    let res = app
        .oneshot(get("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "restricted kid must be blocked at consent gate"
    );
}

#[tokio::test]
async fn consent_gate_allows_granted_kid() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool.clone()), None);
    let (_, kid_token, child_id) = register_family(&app, "gate2@example.com", "Rio").await;

    // Simulate parent approving consent directly in DB.
    let child_uuid = Uuid::parse_str(&child_id).unwrap();
    sqlx::query(
        "UPDATE parental_consents SET status = 'granted', granted_at = NOW() \
         WHERE child_id = $1",
    )
    .bind(child_uuid)
    .execute(&pool)
    .await
    .unwrap();

    // GRANTED → gated route must be allowed.
    let res = app
        .oneshot(get("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::OK,
        "granted kid must pass consent gate"
    );
}

#[tokio::test]
async fn consent_gate_blocks_revoked_kid() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool.clone()), None);
    let (_, kid_token, child_id) = register_family(&app, "gate3@example.com", "Rio").await;

    // Grant then revoke.
    let child_uuid = Uuid::parse_str(&child_id).unwrap();
    sqlx::query(
        "UPDATE parental_consents SET status = 'revoked', granted_at = NOW() \
         WHERE child_id = $1",
    )
    .bind(child_uuid)
    .execute(&pool)
    .await
    .unwrap();

    let res = app
        .oneshot(get("/api/my-shares", Some(&kid_token)))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "revoked consent must re-block the kid"
    );
}

// ── Invariant 8: Projects are PRIVATE by default ──────────────────────────────

#[tokio::test]
async fn new_project_is_private_by_default() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool.clone()), None);
    let (_, kid_token, _) = register_family(&app, "priv@example.com", "Dot").await;

    let res = app
        .clone()
        .oneshot(post(
            "/projects",
            json!({
                "title": "My secret idea",
                "origin_type": "challenge",
                "origin_id": Uuid::new_v4()
            }),
            Some(&kid_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "create project");
    let body = body_json(res).await;
    assert_eq!(
        body["requested_visibility"].as_str().unwrap_or(""),
        "private",
        "new project must default to private"
    );
}

// ── Invariant 9: Cross-child ownership on projects ────────────────────────────

#[tokio::test]
async fn kid_a_cannot_change_kid_b_project_visibility() {
    let (pool, _pg) = start_postgres().await;
    let app = router(make_state(pool.clone()), None);

    // Create two families.
    let (_, kid_a_token, child_a_id) = register_family(&app, "famA@example.com", "Alpha").await;
    let (_, kid_b_token, child_b_id) = register_family(&app, "famB@example.com", "Beta").await;

    // Grant both kids consent so they can reach gated routes.
    for cid in [&child_a_id, &child_b_id] {
        let uuid = Uuid::parse_str(cid).unwrap();
        sqlx::query(
            "UPDATE parental_consents SET status = 'granted', granted_at = NOW() \
             WHERE child_id = $1",
        )
        .bind(uuid)
        .execute(&pool)
        .await
        .unwrap();
    }

    // Kid B creates a project.
    let res = app
        .clone()
        .oneshot(post(
            "/projects",
            json!({
                "title": "Beta's idea",
                "origin_type": "challenge",
                "origin_id": Uuid::new_v4()
            }),
            Some(&kid_b_token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let project_id = body_json(res).await["id"].as_str().unwrap().to_owned();

    // Kid A tries to change visibility of kid B's project → must be rejected.
    let res = app
        .oneshot(req(
            Method::PATCH,
            &format!("/projects/{project_id}/visibility"),
            Some(json!({ "visibility": "class" })),
            Some(&kid_a_token),
        ))
        .await
        .unwrap();
    assert!(
        res.status() == StatusCode::FORBIDDEN || res.status() == StatusCode::NOT_FOUND,
        "kid A must not modify kid B's project; got {}",
        res.status()
    );
}

// ── Invariant 10: Rate limit on auth endpoints ────────────────────────────────

#[tokio::test]
async fn auth_rate_limit_returns_429_after_burst() {
    let (pool, _pg) = start_postgres().await;
    // Very tight limit: 2 requests per minute per IP.
    let limiter = create_auth_rate_limiter(2);
    let app = router(make_state(pool), Some(limiter));

    let mut got_429 = false;
    for i in 0..10 {
        let res = app
            .clone()
            .oneshot(post(
                "/auth/login",
                json!({ "email": format!("ratelimit{i}@example.com"), "password": "wrong" }),
                None,
            ))
            .await
            .unwrap();
        if res.status() == StatusCode::TOO_MANY_REQUESTS {
            got_429 = true;
            break;
        }
    }
    assert!(
        got_429,
        "auth rate limiter must trigger 429 within 10 requests"
    );
}
