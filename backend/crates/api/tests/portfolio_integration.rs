//! Integration tests for Phase 5 — Portfolio, sharing & moderation.
//!
//! Safety invariants proved:
//! 1. Projects are PRIVATE by default.
//! 2. Promote to public → stays private until a reviewer approves.
//! 3. Reviewer approves → effective visibility promoted.
//! 4. Reviewer rejects → stays private.
//! 5. Kid cannot reach reviewer-only endpoints (403).
//! 6. RESTRICTED kid blocked from gated sharing routes (403).
//! 7. Report created with a 24h due_at.
//! 8. Ideas Wall is locked until kid submits their own idea.
//! 9. Only APPROVED ideas appear in the Ideas Wall listing.
//! 10. Ownership enforced — kid B cannot change kid A's project visibility.

use std::sync::Arc;

use axum::{
    body::{to_bytes, Body},
    http::{Method, Request, StatusCode},
};
use idea_pop_api::{
    null_gamification, router, AppState, NullExploreRepo, NullLibraryRepo, NullPhotoStore,
    PortfolioRepos,
};
use idea_pop_domain::{Role, TokenIssuer};
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

const JWT_SECRET: &str = "portfolio-test-secret-32bytes!!!";

// ── Test setup ────────────────────────────────────────────────────────────────

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

fn portfolio_state(pool: PgPool) -> AppState {
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
        Arc::new(SqlxChallengeRepo::new(pool.clone())),
        null_gamification(),
        portfolio,
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Insert a parent account and child profile; return (parent_id, child_id).
async fn insert_parent_and_child(pool: &PgPool) -> (Uuid, Uuid) {
    let parent_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO accounts (id, email, password_hash, role)
         VALUES ($1, $2, 'hash', 'parent')",
    )
    .bind(parent_id)
    .bind(format!("parent-{}@test.com", parent_id))
    .execute(pool)
    .await
    .unwrap();

    let child_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO child_profiles (id, parent_account_id, nickname, avatar_id, birth_year)
         VALUES ($1, $2, 'Tester', 1, 2015)",
    )
    .bind(child_id)
    .bind(parent_id)
    .execute(pool)
    .await
    .unwrap();

    (parent_id, child_id)
}

/// Insert a parental consent row with the given status.
async fn insert_consent(pool: &PgPool, child_id: Uuid, status: &str) {
    let unique_suffix = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO parental_consents (child_id, token_hash, status, expires_at, granted_at)
         VALUES ($1, $2, $3,
                 NOW() + interval '24 hours',
                 CASE WHEN $3 = 'granted' THEN NOW() ELSE NULL END)",
    )
    .bind(child_id)
    .bind(format!("{status}-{unique_suffix}"))
    .bind(status)
    .execute(pool)
    .await
    .unwrap();
}

/// Issue a kid-scoped JWT for the given child.
async fn kid_token(child_id: Uuid, parent_id: Uuid) -> String {
    JwtTokenIssuer::new(JWT_SECRET, 900)
        .issue_kid(child_id, parent_id)
        .await
        .unwrap()
}

/// Insert a reviewer account and issue a reviewer JWT.
async fn reviewer_token(pool: &PgPool) -> String {
    let account_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO accounts (id, email, password_hash, role)
         VALUES ($1, $2, 'hash', 'reviewer')",
    )
    .bind(account_id)
    .bind(format!("reviewer-{}@test.com", account_id))
    .execute(pool)
    .await
    .unwrap();

    JwtTokenIssuer::new(JWT_SECRET, 900)
        .issue(account_id, &Role::Reviewer)
        .await
        .unwrap()
        .access_token
}

/// Insert a minimal challenge; return its id.
async fn insert_challenge(pool: &PgPool) -> Uuid {
    let steps = json!([
        {"step":"brief","title":"T","story":"S","image_url":null},
        {"step":"your_idea","prompt":"P","fork_to_step":6},
        {"step":"nature_clues","intro":"I","clues":[]},
        {"step":"design_secret","secret":"X","reveal_hint":"H"},
        {"step":"skill","instructions":"I","skill_refs":[]},
        {"step":"sketch","prompt":"P","guidance":"G"},
        {"step":"build_and_test","instructions":"I","test_criteria":[]},
        {"step":"celebrate_and_share","celebration_text":"C","share_prompt":"P"}
    ]);
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO challenges (id, title, slug, season, week_number, xp_reward, steps)
         VALUES ($1, 'Test Challenge', $2, 1, 99, 20, $3)",
    )
    .bind(id)
    .bind(format!("test-challenge-{}", id))
    .bind(sqlx::types::Json(&steps))
    .execute(pool)
    .await
    .unwrap();
    id
}

/// Insert a project row directly into the DB; return its id.
async fn insert_project(pool: &PgPool, child_id: Uuid) -> Uuid {
    let project_id = Uuid::new_v4();
    let origin_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO projects
           (id, child_id, origin_type, origin_id, title, description, materials,
            what_was_hard, what_to_improve, photo_keys,
            requested_visibility, effective_visibility, created_at, updated_at)
         VALUES ($1, $2, 'challenge', $3, 'My Project', '', '', '', '', '{}',
                 'private', 'private', NOW(), NOW())",
    )
    .bind(project_id)
    .bind(child_id)
    .bind(origin_id)
    .execute(pool)
    .await
    .unwrap();
    project_id
}

fn req(method: Method, uri: &str, body: Value, token: Option<&str>) -> Request<Body> {
    let mut b = Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json");
    if let Some(t) = token {
        b = b.header("authorization", format!("Bearer {t}"));
    }
    b.body(Body::from(body.to_string())).unwrap()
}

fn get(uri: &str, token: Option<&str>) -> Request<Body> {
    let mut b = Request::builder().method(Method::GET).uri(uri);
    if let Some(t) = token {
        b = b.header("authorization", format!("Bearer {t}"));
    }
    b.body(Body::empty()).unwrap()
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
    serde_json::from_slice(&bytes).unwrap_or(Value::Null)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

/// 1. A newly created project is PRIVATE by default.
#[tokio::test]
async fn project_private_by_default() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;

    let origin_id = Uuid::new_v4();
    let res = app
        .clone()
        .oneshot(req(
            Method::POST,
            "/projects",
            json!({"origin_type": "challenge", "origin_id": origin_id, "title": "Eco Bot"}),
            Some(&token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    assert_eq!(body["effective_visibility"], "private");
    assert_eq!(body["requested_visibility"], "private");
}

/// 2. Promoting to Public enqueues moderation; effective stays Private immediately.
#[tokio::test]
async fn promote_to_public_stays_private_until_approved() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    insert_consent(&pool, child_id, "granted").await;
    let token = kid_token(child_id, parent_id).await;

    let project_id = insert_project(&pool, child_id).await;

    let res = app
        .oneshot(req(
            Method::PATCH,
            &format!("/projects/{project_id}/visibility"),
            json!({"visibility": "public"}),
            Some(&token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["effective_visibility"], "private", "must stay private");
    assert_eq!(body["pending_moderation"], true);
}

/// 3. Reviewer approves → effective_visibility is promoted to the requested level.
#[tokio::test]
async fn reviewer_approves_visibility_promotes_effective() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    insert_consent(&pool, child_id, "granted").await;
    let kid_tok = kid_token(child_id, parent_id).await;
    let reviewer_tok = reviewer_token(&pool).await;

    let project_id = insert_project(&pool, child_id).await;

    // Request public visibility (consent-gated route)
    let res = app
        .clone()
        .oneshot(req(
            Method::PATCH,
            &format!("/projects/{project_id}/visibility"),
            json!({"visibility": "public"}),
            Some(&kid_tok),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // Find the pending moderation item via reviewer's queue
    let res = app
        .clone()
        .oneshot(get("/moderation/queue", Some(&reviewer_tok)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let queue = body_json(res).await;
    let item_id = queue["items"][0]["id"].as_str().unwrap().to_owned();

    // Reviewer approves
    let res = app
        .clone()
        .oneshot(req(
            Method::POST,
            &format!("/moderation/{item_id}/approve"),
            json!({}),
            Some(&reviewer_tok),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let approved = body_json(res).await;
    assert_eq!(approved["status"], "approved");

    // Project's effective_visibility is now "public"
    let res = app
        .oneshot(get("/me/projects", Some(&kid_tok)))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let list = body_json(res).await;
    assert_eq!(list["items"][0]["effective_visibility"], "public");
}

/// 4. Reviewer rejects → effective_visibility stays Private.
#[tokio::test]
async fn reviewer_rejects_visibility_stays_private() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    insert_consent(&pool, child_id, "granted").await;
    let kid_tok = kid_token(child_id, parent_id).await;
    let reviewer_tok = reviewer_token(&pool).await;

    let project_id = insert_project(&pool, child_id).await;

    let res = app
        .clone()
        .oneshot(req(
            Method::PATCH,
            &format!("/projects/{project_id}/visibility"),
            json!({"visibility": "public"}),
            Some(&kid_tok),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(get("/moderation/queue", Some(&reviewer_tok)))
        .await
        .unwrap();
    let queue = body_json(res).await;
    let item_id = queue["items"][0]["id"].as_str().unwrap().to_owned();

    let res = app
        .clone()
        .oneshot(req(
            Method::POST,
            &format!("/moderation/{item_id}/reject"),
            json!({"reason": "Inappropriate content"}),
            Some(&reviewer_tok),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let rejected = body_json(res).await;
    assert_eq!(rejected["status"], "rejected");

    // Project stays private
    let res = app
        .oneshot(get("/me/projects", Some(&kid_tok)))
        .await
        .unwrap();
    let list = body_json(res).await;
    assert_eq!(list["items"][0]["effective_visibility"], "private");
}

/// 5. A kid token is rejected from all reviewer-only endpoints.
#[tokio::test]
async fn kid_cannot_reach_reviewer_endpoints() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;

    let item_id = Uuid::new_v4();

    let cases = vec![
        get("/moderation/queue", Some(&token)),
        req(
            Method::POST,
            &format!("/moderation/{item_id}/approve"),
            json!({}),
            Some(&token),
        ),
        req(
            Method::POST,
            &format!("/moderation/{item_id}/reject"),
            json!({"reason": "bad"}),
            Some(&token),
        ),
        get("/reports", Some(&token)),
    ];

    for request in cases {
        let res = app.clone().oneshot(request).await.unwrap();
        assert_eq!(
            res.status(),
            StatusCode::FORBIDDEN,
            "kid should get 403 on reviewer endpoint"
        );
    }
}

/// 6. A RESTRICTED child (pending consent) is blocked from gated sharing routes.
#[tokio::test]
async fn restricted_kid_blocked_from_gated_routes() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    // No consent inserted → consent_gate finds nothing → treats as Pending → 403
    let token = kid_token(child_id, parent_id).await;

    let project_id = insert_project(&pool, child_id).await;
    let challenge_id = insert_challenge(&pool).await;

    // PATCH visibility — consent-gated
    let res = app
        .clone()
        .oneshot(req(
            Method::PATCH,
            &format!("/projects/{project_id}/visibility"),
            json!({"visibility": "public"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // POST idea — consent-gated
    let res = app
        .clone()
        .oneshot(req(
            Method::POST,
            &format!("/challenges/{challenge_id}/ideas"),
            json!({"text": "My idea"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

/// 7. A report is created with a 24-hour due_at.
#[tokio::test]
async fn report_creates_with_24h_due_at() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;

    let content_id = Uuid::new_v4();
    let res = app
        .oneshot(req(
            Method::POST,
            "/reports",
            json!({
                "content_type": "project",
                "content_id": content_id,
                "reason": "Inappropriate content"
            }),
            Some(&token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;

    let created_at = body["created_at"].as_str().unwrap();
    let due_at = body["due_at"].as_str().unwrap();

    let created: chrono::DateTime<chrono::Utc> = created_at.parse().unwrap();
    let due: chrono::DateTime<chrono::Utc> = due_at.parse().unwrap();
    let diff = due - created;

    // due_at must be within 1 second of created_at + 24h
    let expected_secs = 24 * 3600_i64;
    assert!(
        (diff.num_seconds() - expected_secs).abs() < 2,
        "due_at should be ~24h after created_at, got {diff}"
    );
}

/// 8. Ideas Wall is locked-until-submit: 403 before submission, 200 after.
#[tokio::test]
async fn ideas_wall_locked_until_submit() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    insert_consent(&pool, child_id, "granted").await;
    let token = kid_token(child_id, parent_id).await;
    let challenge_id = insert_challenge(&pool).await;

    // Before submit: 403
    let res = app
        .clone()
        .oneshot(get(
            &format!("/challenges/{challenge_id}/ideas"),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::FORBIDDEN,
        "wall should be locked before submit"
    );

    // Submit idea (consent-gated)
    let res = app
        .clone()
        .oneshot(req(
            Method::POST,
            &format!("/challenges/{challenge_id}/ideas"),
            json!({"text": "My brilliant idea"}),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED, "submit should succeed");

    // After submit: 200
    let res = app
        .oneshot(get(
            &format!("/challenges/{challenge_id}/ideas"),
            Some(&token),
        ))
        .await
        .unwrap();
    assert_eq!(
        res.status(),
        StatusCode::OK,
        "wall should be unlocked after submit"
    );
}

/// 9. Only APPROVED ideas appear in the Ideas Wall listing.
#[tokio::test]
async fn only_approved_ideas_listed() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    let challenge_id = insert_challenge(&pool).await;

    // Kid A submits an idea (pending moderation)
    let (p_a, c_a) = insert_parent_and_child(&pool).await;
    insert_consent(&pool, c_a, "granted").await;
    let tok_a = kid_token(c_a, p_a).await;

    let res = app
        .clone()
        .oneshot(req(
            Method::POST,
            &format!("/challenges/{challenge_id}/ideas"),
            json!({"text": "Kid A idea"}),
            Some(&tok_a),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let idea_body = body_json(res).await;
    let idea_id = idea_body["id"].as_str().unwrap().to_owned();
    assert_eq!(idea_body["moderation_status"], "pending");

    // Kid A can view wall now (submitted) but list is empty (idea still pending)
    let res = app
        .clone()
        .oneshot(get(
            &format!("/challenges/{challenge_id}/ideas"),
            Some(&tok_a),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let list = body_json(res).await;
    assert_eq!(
        list["items"].as_array().unwrap().len(),
        0,
        "pending idea not visible"
    );

    // Reviewer approves the idea
    let reviewer_tok = reviewer_token(&pool).await;
    let res = app
        .clone()
        .oneshot(get("/moderation/queue", Some(&reviewer_tok)))
        .await
        .unwrap();
    let queue = body_json(res).await;
    let mod_id = queue["items"][0]["id"].as_str().unwrap().to_owned();

    let res = app
        .clone()
        .oneshot(req(
            Method::POST,
            &format!("/moderation/{mod_id}/approve"),
            json!({}),
            Some(&reviewer_tok),
        ))
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // Now kid A sees 1 approved idea
    let res = app
        .clone()
        .oneshot(get(
            &format!("/challenges/{challenge_id}/ideas"),
            Some(&tok_a),
        ))
        .await
        .unwrap();
    let list = body_json(res).await;
    let items = list["items"].as_array().unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["id"], idea_id);
    assert_eq!(items[0]["moderation_status"], "approved");
}

/// 10. Ownership enforced — kid B cannot change kid A's project visibility.
#[tokio::test]
async fn ownership_enforced() {
    let (pool, _pg) = start_postgres().await;
    let app = router(portfolio_state(pool.clone()), None);

    // Kid A owns the project
    let (p_a, c_a) = insert_parent_and_child(&pool).await;
    let project_id = insert_project(&pool, c_a).await;

    // Kid B tries to change it (needs consent to pass the consent gate)
    let (p_b, c_b) = insert_parent_and_child(&pool).await;
    insert_consent(&pool, c_b, "granted").await;
    let tok_b = kid_token(c_b, p_b).await;

    let res = app
        .oneshot(req(
            Method::PATCH,
            &format!("/projects/{project_id}/visibility"),
            json!({"visibility": "public"}),
            Some(&tok_b),
        ))
        .await
        .unwrap();
    // 403 because project.child_id != kid_b's child_id
    assert_eq!(res.status(), StatusCode::FORBIDDEN);
    let _ = p_a;
}
