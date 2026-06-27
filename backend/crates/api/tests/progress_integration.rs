//! Integration tests for Phase 4 Progress & Gamification.
//!
//! All progress routes require a kid-scoped token (child_id from JWT).
//! Safety invariants tested:
//! - Adult tokens → 403 on all progress routes
//! - Ownership: kid A cannot advance kid B's attempt
//! - Idempotency: same video/lesson again = 0 XP
//! - Creative Cycle: +15 bonus once per week when all three done
//! - Analytics event emitted on every challenge step advance

use std::sync::Arc;

use axum::{
    body::{to_bytes, Body},
    http::{Method, Request, StatusCode},
};
use idea_pop_api::{null_billing, null_portfolio, router, AppState, GamificationRepos};
use idea_pop_domain::TokenIssuer;
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, NullConsentEmailSender, NullEmailSender, SqlxAccountRepo,
    SqlxAnalyticsSink, SqlxBadgeRepo, SqlxChallengeRepo, SqlxChildRepo, SqlxClassRepo,
    SqlxConsentRepo, SqlxProgressRepo, SqlxXpRepo, SystemClock,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use sqlx::Row;
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;
use uuid::Uuid;

const JWT_SECRET: &str = "progress-test-secret-32bytes-!!x";

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

fn progress_state(pool: PgPool) -> AppState {
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
        Arc::new(idea_pop_api::NullExploreRepo),
        Arc::new(idea_pop_api::NullLibraryRepo),
        Arc::new(SqlxChallengeRepo::new(pool.clone())),
        GamificationRepos {
            xp: Arc::new(SqlxXpRepo::new(pool.clone())),
            progress: Arc::new(SqlxProgressRepo::new(pool.clone())),
            badges: Arc::new(SqlxBadgeRepo::new(pool.clone())),
            analytics: Arc::new(SqlxAnalyticsSink::new(pool)),
        },
        null_portfolio(),
        null_billing(),
    )
}

/// Insert a parent account and a child profile; return (parent_id, child_id).
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

/// Issue a kid token for the given child + parent.
async fn kid_token(child_id: Uuid, parent_id: Uuid) -> String {
    JwtTokenIssuer::new(JWT_SECRET, 900)
        .issue_kid(child_id, parent_id)
        .await
        .unwrap()
}

/// Insert a minimal challenge; return its id.
async fn insert_challenge(pool: &PgPool) -> Uuid {
    use serde_json::json;
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

/// Register an adult account and return the access token.
async fn register_adult(app: &axum::Router, email: &str) -> String {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"email": email, "password": "password123",
                           "role": "parent", "display_name": "Adult"})
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let bytes = to_bytes(res.into_body(), 65536).await.unwrap();
    let body: Value = serde_json::from_slice(&bytes).unwrap();
    body["access_token"].as_str().unwrap().to_owned()
}

async fn post_json(app: &axum::Router, uri: &str, token: &str, body: Value) -> (StatusCode, Value) {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(uri)
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 65536).await.unwrap();
    let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

async fn patch_json(
    app: &axum::Router,
    uri: &str,
    token: &str,
    body: Value,
) -> (StatusCode, Value) {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri(uri)
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {token}"))
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 65536).await.unwrap();
    let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

async fn get_json(app: &axum::Router, uri: &str, token: &str) -> (StatusCode, Value) {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(uri)
                .header("authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 65536).await.unwrap();
    let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn adult_token_rejected_on_progress_routes() {
    let (pool, _pg) = start_postgres().await;
    let app = router(progress_state(pool.clone()), None);

    let adult_token = register_adult(&app, "adult@test.com").await;

    let (status, _) = post_json(
        &app,
        "/progress/video-view",
        &adult_token,
        json!({"video_id": Uuid::new_v4()}),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "adult token must be rejected"
    );

    let (status, _) = get_json(&app, "/me/progress", &adult_token).await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "adult token must be rejected on GET /me/progress"
    );
}

#[tokio::test]
async fn video_view_awards_xp_first_time() {
    let (pool, _pg) = start_postgres().await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    let video_id = Uuid::new_v4();
    let (status, body) = post_json(
        &app,
        "/progress/video-view",
        &token,
        json!({"video_id": video_id}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["xp_earned"], 5);
    assert_eq!(body["is_new"], true);
    assert_eq!(body["xp_total"], 5);
    assert_eq!(body["level"], 1);
    assert_eq!(body["rank"], "explorer");
}

#[tokio::test]
async fn video_view_idempotent_no_extra_xp() {
    let (pool, _pg) = start_postgres().await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    let video_id = Uuid::new_v4();
    // First view
    post_json(
        &app,
        "/progress/video-view",
        &token,
        json!({"video_id": video_id}),
    )
    .await;

    // Second view of the same video
    let (status, body) = post_json(
        &app,
        "/progress/video-view",
        &token,
        json!({"video_id": video_id}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["xp_earned"], 0, "same video must not earn XP again");
    assert_eq!(body["is_new"], false);
    assert_eq!(body["xp_total"], 5, "total must not change");
}

#[tokio::test]
async fn video_view_level_up_at_15_xp() {
    let (pool, _pg) = start_postgres().await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    // Watch 3 different videos (+5 each = 15 XP) → Lv2 (short first ladder)
    for _ in 0..3 {
        post_json(
            &app,
            "/progress/video-view",
            &token,
            json!({"video_id": Uuid::new_v4()}),
        )
        .await;
    }

    let (_, progress) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(progress["xp_total"], 15);
    assert_eq!(
        progress["level"], 2,
        "15 XP should reach Lv2 via short first ladder"
    );
    assert_eq!(progress["rank"], "explorer");
}

#[tokio::test]
async fn lesson_complete_awards_xp() {
    let (pool, _pg) = start_postgres().await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    let lesson_id = Uuid::new_v4();
    let (status, body) = post_json(
        &app,
        "/progress/lesson-complete",
        &token,
        json!({"lesson_id": lesson_id}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["xp_earned"], 10);
    assert_eq!(body["xp_total"], 10);
    assert_eq!(body["is_new"], true);
}

#[tokio::test]
async fn lesson_complete_idempotent() {
    let (pool, _pg) = start_postgres().await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    let lesson_id = Uuid::new_v4();
    post_json(
        &app,
        "/progress/lesson-complete",
        &token,
        json!({"lesson_id": lesson_id}),
    )
    .await;

    let (_, body) = post_json(
        &app,
        "/progress/lesson-complete",
        &token,
        json!({"lesson_id": lesson_id}),
    )
    .await;
    assert_eq!(body["xp_earned"], 0, "same lesson must not earn XP again");
    assert_eq!(body["xp_total"], 10);
}

#[tokio::test]
async fn challenge_attempt_creation_and_step_advance() {
    let (pool, _pg) = start_postgres().await;
    let challenge_id = insert_challenge(&pool).await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    // Start attempt
    let (status, body) = post_json(
        &app,
        &format!("/challenges/{challenge_id}/attempts"),
        &token,
        json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    let attempt_id = body["attempt_id"].as_str().unwrap().to_owned();
    assert_eq!(body["current_step"], 1);
    assert_eq!(body["status"], "in_progress");

    // Advance to step 2
    let (status, body) = patch_json(
        &app,
        &format!("/attempts/{attempt_id}/step"),
        &token,
        json!({"step": 2}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["current_step"], 2);
    assert_eq!(body["status"], "in_progress");
    assert_eq!(body["xp_earned"], 0, "no XP until completion");
}

#[tokio::test]
async fn challenge_completion_awards_solve_xp() {
    let (pool, _pg) = start_postgres().await;
    let challenge_id = insert_challenge(&pool).await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    // Start attempt
    let (_, body) = post_json(
        &app,
        &format!("/challenges/{challenge_id}/attempts"),
        &token,
        json!({}),
    )
    .await;
    let attempt_id = body["attempt_id"].as_str().unwrap().to_owned();

    // Advance through steps 1-7
    for step in 2..=7 {
        patch_json(
            &app,
            &format!("/attempts/{attempt_id}/step"),
            &token,
            json!({"step": step}),
        )
        .await;
    }

    // Complete at step 8 — should award +20 XP
    let (status, body) = patch_json(
        &app,
        &format!("/attempts/{attempt_id}/step"),
        &token,
        json!({"step": 8}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "completed");
    assert_eq!(
        body["xp_earned"], 20,
        "completing a challenge awards +20 XP"
    );

    let (_, progress) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(progress["xp_total"], 20);
    assert_eq!(progress["solve_count"], 1);
}

#[tokio::test]
async fn challenge_completion_xp_not_awarded_twice() {
    let (pool, _pg) = start_postgres().await;
    let challenge_id = insert_challenge(&pool).await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    async fn complete_challenge(app: &axum::Router, challenge_id: Uuid, token: &str) {
        let (_, body) = post_json(
            app,
            &format!("/challenges/{challenge_id}/attempts"),
            token,
            json!({}),
        )
        .await;
        let attempt_id = body["attempt_id"].as_str().unwrap().to_owned();
        patch_json(
            app,
            &format!("/attempts/{attempt_id}/step"),
            token,
            json!({"step": 8}),
        )
        .await;
    }

    // First completion
    complete_challenge(&app, challenge_id, &token).await;
    // Second attempt + completion of the same challenge
    complete_challenge(&app, challenge_id, &token).await;

    let (_, progress) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(
        progress["xp_total"], 20,
        "completing the same challenge twice must not award extra XP"
    );
}

#[tokio::test]
async fn analytics_event_emitted_on_step_advance() {
    let (pool, _pg) = start_postgres().await;
    let challenge_id = insert_challenge(&pool).await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    let (_, body) = post_json(
        &app,
        &format!("/challenges/{challenge_id}/attempts"),
        &token,
        json!({}),
    )
    .await;
    let attempt_id = body["attempt_id"].as_str().unwrap().to_owned();

    patch_json(
        &app,
        &format!("/attempts/{attempt_id}/step"),
        &token,
        json!({"step": 2}),
    )
    .await;

    // Verify analytics event was written to DB
    let row = sqlx::query("SELECT event_type FROM analytics_events WHERE child_id = $1 LIMIT 1")
        .bind(child_id)
        .fetch_one(&pool)
        .await
        .expect("analytics event must exist");
    let event_type: &str = row.try_get("event_type").unwrap();
    assert_eq!(event_type, "challenge_step_advanced");
}

#[tokio::test]
async fn ownership_prevents_cross_child_attempt_access() {
    let (pool, _pg) = start_postgres().await;
    let challenge_id = insert_challenge(&pool).await;

    let (parent1, child1) = insert_parent_and_child(&pool).await;
    let (parent2, child2) = insert_parent_and_child(&pool).await;
    let token1 = kid_token(child1, parent1).await;
    let token2 = kid_token(child2, parent2).await;
    let app = router(progress_state(pool.clone()), None);

    // Child 1 starts an attempt
    let (_, body) = post_json(
        &app,
        &format!("/challenges/{challenge_id}/attempts"),
        &token1,
        json!({}),
    )
    .await;
    let attempt_id = body["attempt_id"].as_str().unwrap().to_owned();

    // Child 2 tries to advance child 1's attempt
    let (status, _) = patch_json(
        &app,
        &format!("/attempts/{attempt_id}/step"),
        &token2,
        json!({"step": 2}),
    )
    .await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "cross-child attempt access must be blocked"
    );
}

#[tokio::test]
async fn creative_cycle_bonus_awarded_for_all_three_in_same_week() {
    let (pool, _pg) = start_postgres().await;
    let challenge_id = insert_challenge(&pool).await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    // 1. Explore (+5)
    let (_, ev) = post_json(
        &app,
        "/progress/video-view",
        &token,
        json!({"video_id": Uuid::new_v4()}),
    )
    .await;
    assert!(!ev["cycle_bonus_earned"].as_bool().unwrap(), "no bonus yet");

    // 2. Learn (+10)
    let (_, lv) = post_json(
        &app,
        "/progress/lesson-complete",
        &token,
        json!({"lesson_id": Uuid::new_v4()}),
    )
    .await;
    assert!(!lv["cycle_bonus_earned"].as_bool().unwrap(), "no bonus yet");

    // 3. Solve — complete a challenge (+20 + cycle bonus +15)
    let (_, body) = post_json(
        &app,
        &format!("/challenges/{challenge_id}/attempts"),
        &token,
        json!({}),
    )
    .await;
    let attempt_id = body["attempt_id"].as_str().unwrap().to_owned();
    let (_, sv) = patch_json(
        &app,
        &format!("/attempts/{attempt_id}/step"),
        &token,
        json!({"step": 8}),
    )
    .await;

    assert!(
        sv["cycle_bonus_earned"].as_bool().unwrap(),
        "cycle bonus must be awarded when all three done in one week"
    );
    assert_eq!(sv["xp_earned"], 35, "solve +20 + cycle bonus +15 = 35");

    // Total: 5 + 10 + 20 + 15 = 50 → Lv3
    let (_, progress) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(progress["xp_total"], 50);
    assert_eq!(progress["level"], 3, "50 XP should reach Lv3");
    assert_eq!(progress["rank"], "maker");
    assert_eq!(progress["creative_cycles_completed"], 1);
}

#[tokio::test]
async fn me_progress_returns_full_summary() {
    let (pool, _pg) = start_postgres().await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    // Watch 3 different videos
    for _ in 0..3 {
        post_json(
            &app,
            "/progress/video-view",
            &token,
            json!({"video_id": Uuid::new_v4()}),
        )
        .await;
    }

    let (status, progress) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(progress["xp_total"], 15);
    assert_eq!(progress["level"], 2);
    assert_eq!(progress["rank"], "explorer");
    assert_eq!(progress["explore_count"], 3);
    // Bronze medal at 3 videos
    assert_eq!(progress["medals"]["explore"], "bronze");
    assert!(progress["medals"]["learn"].is_null(), "no learn medal yet");
}

#[tokio::test]
async fn medals_bronze_at_three_silver_at_six_gold_at_ten() {
    let (pool, _pg) = start_postgres().await;
    let (parent_id, child_id) = insert_parent_and_child(&pool).await;
    let token = kid_token(child_id, parent_id).await;
    let app = router(progress_state(pool.clone()), None);

    async fn watch_n_videos(app: &axum::Router, token: &str, n: usize) {
        for _ in 0..n {
            post_json(
                app,
                "/progress/video-view",
                token,
                json!({"video_id": Uuid::new_v4()}),
            )
            .await;
        }
    }

    watch_n_videos(&app, &token, 3).await;
    let (_, p) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(p["medals"]["explore"], "bronze");

    watch_n_videos(&app, &token, 3).await; // total 6
    let (_, p) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(p["medals"]["explore"], "silver");

    watch_n_videos(&app, &token, 4).await; // total 10
    let (_, p) = get_json(&app, "/me/progress", &token).await;
    assert_eq!(p["medals"]["explore"], "gold");
}
