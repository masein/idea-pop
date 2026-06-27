//! Phase 6 billing integration tests.
//!
//! Safety invariants verified:
//! 1. POST /billing/checkout returns a checkout URL (happy path).
//! 2. Kid token → 403 on /billing/checkout.
//! 3. Kid token → 403 on /billing/portal.
//! 4. Kid token → 403 on GET /billing/subscription.
//! 5. Kid token → 403 on /billing/premium-check.
//! 6. POST /webhooks/stripe with bad signature → 400.
//! 7. Correctly signed webhook event → 200; subscription persisted.
//! 8. Same event delivered twice → 200 both times; state changes only once (idempotency).
//! 9. GET /billing/subscription reflects subscription state after webhook.
//! 10. GET /billing/premium-check → 402 without subscription, 200 with active one.

use std::sync::Arc;

use axum::http::{Method, Request, StatusCode};
use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use testcontainers::{runners::AsyncRunner, ContainerAsync};
use testcontainers_modules::postgres::Postgres;
use tower::ServiceExt;
use uuid::Uuid;

use idea_pop_api::{
    null_gamification, null_portfolio, router, AppState, BillingRepos, NullChallengeRepo,
    NullExploreRepo, NullLibraryRepo,
};
use idea_pop_domain::{Role, TokenIssuer};
use idea_pop_infra::{
    Argon2Hasher, JwtTokenIssuer, MockPaymentGateway, NullConsentEmailSender, NullEmailSender,
    SqlxAccountRepo, SqlxChildRepo, SqlxClassRepo, SqlxConsentRepo, SqlxSubscriptionRepo,
    SqlxWebhookEventLog, SystemClock,
};

const JWT_SECRET: &str = "billing-test-secret-32bytes!!!xx";
const WEBHOOK_SECRET: &str = "whsec_test_billing_secret";

// ── Test setup ────────────────────────────────────────────────────────────────

async fn start_postgres() -> (PgPool, ContainerAsync<Postgres>) {
    let pg = Postgres::default()
        .start()
        .await
        .expect("start postgres container");
    let port = pg.get_host_port_ipv4(5432).await.expect("get port");
    let url = format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres");
    let pool = PgPool::connect(&url).await.expect("connect");
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("migrate");
    (pool, pg)
}

fn billing_state(pool: PgPool) -> AppState {
    let billing = BillingRepos {
        subscriptions: Arc::new(SqlxSubscriptionRepo::new(pool.clone())),
        webhook_log: Arc::new(SqlxWebhookEventLog::new(pool.clone())),
        gateway: Arc::new(MockPaymentGateway::new(WEBHOOK_SECRET)),
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
        Arc::new(SqlxClassRepo::new(pool)),
        Arc::new(NullConsentEmailSender),
        Arc::new(NullExploreRepo),
        Arc::new(NullLibraryRepo),
        Arc::new(NullChallengeRepo),
        null_gamification(),
        null_portfolio(),
        billing,
    )
}

/// Insert a parent account; return (account_id, access_token).
async fn insert_parent(pool: &PgPool) -> (Uuid, String) {
    let account_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO accounts (id, email, password_hash, role) VALUES ($1, $2, 'hash', 'parent')",
    )
    .bind(account_id)
    .bind(format!("parent-{}@test.com", account_id))
    .execute(pool)
    .await
    .expect("insert parent");

    let issuer = JwtTokenIssuer::new(JWT_SECRET, 900);
    let pair = issuer
        .issue(account_id, &Role::Parent)
        .await
        .expect("issue token");
    (account_id, pair.access_token)
}

/// Insert a parent + kid; return (parent_id, child_id, kid_token).
async fn insert_parent_and_child(pool: &PgPool) -> (Uuid, Uuid, String) {
    let (parent_id, _parent_token) = insert_parent(pool).await;

    let child_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO child_profiles (id, parent_account_id, nickname, avatar_id, birth_year)
         VALUES ($1, $2, 'Tester', 1, 2015)",
    )
    .bind(child_id)
    .bind(parent_id)
    .execute(pool)
    .await
    .expect("insert child profile");

    let issuer = JwtTokenIssuer::new(JWT_SECRET, 900);
    let kid_token = issuer
        .issue_kid(child_id, parent_id)
        .await
        .expect("issue kid token");

    (parent_id, child_id, kid_token)
}

fn req(
    method: Method,
    uri: &str,
    body: Option<Value>,
    token: Option<&str>,
) -> Request<axum::body::Body> {
    let mut builder = Request::builder().method(method).uri(uri);
    if let Some(t) = token {
        builder = builder.header("Authorization", format!("Bearer {t}"));
    }
    match body {
        Some(b) => builder
            .header("Content-Type", "application/json")
            .body(axum::body::Body::from(serde_json::to_vec(&b).unwrap()))
            .unwrap(),
        None => builder.body(axum::body::Body::empty()).unwrap(),
    }
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap_or(Value::Null)
}

/// Build a correctly-signed Stripe webhook request.
fn signed_webhook_req(
    event_id: &str,
    event_type: &str,
    data_object: Value,
) -> Request<axum::body::Body> {
    let payload = serde_json::to_vec(&json!({
        "id": event_id,
        "type": event_type,
        "data": { "object": data_object }
    }))
    .unwrap();

    let ts = "1700000000";
    let sig = MockPaymentGateway::sign(WEBHOOK_SECRET, ts, &payload);

    Request::builder()
        .method(Method::POST)
        .uri("/webhooks/stripe")
        .header("Content-Type", "application/json")
        .header("stripe-signature", sig)
        .body(axum::body::Body::from(payload))
        .unwrap()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn checkout_returns_url() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let (_id, token) = insert_parent(&pool).await;

    let res = app
        .oneshot(req(
            Method::POST,
            "/billing/checkout",
            Some(json!({"plan": "monthly"})),
            Some(&token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    let url = body["url"].as_str().unwrap();
    assert!(
        url.contains("stripe.com") || url.contains("test_session"),
        "url: {url}"
    );
}

#[tokio::test]
async fn kid_token_blocked_from_checkout() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let (_p, _c, kid_token) = insert_parent_and_child(&pool).await;

    let res = app
        .oneshot(req(
            Method::POST,
            "/billing/checkout",
            Some(json!({"plan": "monthly"})),
            Some(&kid_token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::FORBIDDEN, "kid should be blocked");
}

#[tokio::test]
async fn kid_token_blocked_from_portal() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let (_p, _c, kid_token) = insert_parent_and_child(&pool).await;

    let res = app
        .oneshot(req(Method::POST, "/billing/portal", None, Some(&kid_token)))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn kid_token_blocked_from_subscription() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let (_p, _c, kid_token) = insert_parent_and_child(&pool).await;

    let res = app
        .oneshot(req(
            Method::GET,
            "/billing/subscription",
            None,
            Some(&kid_token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn kid_token_blocked_from_premium_check() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let (_p, _c, kid_token) = insert_parent_and_child(&pool).await;

    let res = app
        .oneshot(req(
            Method::GET,
            "/billing/premium-check",
            None,
            Some(&kid_token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn webhook_with_bad_signature_returns_400() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let payload = br#"{"id":"evt_bad","type":"invoice.payment_succeeded","data":{"object":{}}}"#;
    let bad_sig = "t=1700000000,v1=badbadbadbad";

    let res = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/webhooks/stripe")
                .header("Content-Type", "application/json")
                .header("stripe-signature", bad_sig)
                .body(axum::body::Body::from(payload.to_vec()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn webhook_missing_signature_returns_400() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let payload = br#"{"id":"evt_nosig","type":"invoice.payment_failed","data":{"object":{}}}"#;

    let res = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/webhooks/stripe")
                .header("Content-Type", "application/json")
                .body(axum::body::Body::from(payload.to_vec()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn checkout_webhook_creates_subscription_and_idempotent_replay() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());

    let (account_id, token) = insert_parent(&pool).await;

    let event_id = format!("evt_{}", Uuid::new_v4());
    let customer_id = "cus_testxxx";
    let sub_id = "sub_testxxx";

    // ── First delivery ─────────────────────────────────────────────────────────
    {
        let app = router(state.clone(), None);
        let res = app
            .oneshot(signed_webhook_req(
                &event_id,
                "checkout.session.completed",
                json!({
                    "id": "cs_test",
                    "customer": customer_id,
                    "subscription": sub_id,
                    "metadata": {
                        "account_id": account_id.to_string(),
                        "plan": "monthly"
                    }
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK, "first delivery must succeed");
    }

    // Subscription should now be Active in the DB
    let row = sqlx::query("SELECT status FROM subscriptions WHERE account_id = $1")
        .bind(account_id)
        .fetch_one(&pool)
        .await
        .expect("subscription row");
    let status: String = row.try_get("status").unwrap();
    assert_eq!(
        status, "active",
        "checkout webhook should activate subscription"
    );

    // ── Second delivery (duplicate event) ─────────────────────────────────────
    {
        let app = router(state.clone(), None);
        let res = app
            .oneshot(signed_webhook_req(
                &event_id,
                "checkout.session.completed",
                json!({
                    "id": "cs_test",
                    "customer": customer_id,
                    "subscription": sub_id,
                    "metadata": {
                        "account_id": account_id.to_string(),
                        "plan": "monthly"
                    }
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK, "duplicate must return 200");
    }

    // Status must still be Active — idempotent
    let row2 = sqlx::query("SELECT status FROM subscriptions WHERE account_id = $1")
        .bind(account_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    let status2: String = row2.try_get("status").unwrap();
    assert_eq!(status2, "active", "idempotent replay must not change state");

    // Only one webhook_events row should exist
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM webhook_events WHERE provider_event_id = $1")
            .bind(&event_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 1, "duplicate event must not create second log row");

    // ── GET /billing/subscription reflects Active status ───────────────────────
    {
        let app = router(state.clone(), None);
        let res = app
            .oneshot(req(
                Method::GET,
                "/billing/subscription",
                None,
                Some(&token),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        assert_eq!(body["status"], "active");
        assert!(body["is_premium"].as_bool().unwrap_or(false));
    }

    // ── GET /billing/premium-check → 200 with active subscription ─────────────
    {
        let app = router(state.clone(), None);
        let res = app
            .oneshot(req(
                Method::GET,
                "/billing/premium-check",
                None,
                Some(&token),
            ))
            .await
            .unwrap();
        assert_eq!(
            res.status(),
            StatusCode::OK,
            "active sub should allow premium access"
        );
    }
}

#[tokio::test]
async fn premium_check_without_subscription_returns_402() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let (_id, token) = insert_parent(&pool).await;

    let res = app
        .oneshot(req(
            Method::GET,
            "/billing/premium-check",
            None,
            Some(&token),
        ))
        .await
        .unwrap();

    assert_eq!(
        res.status(),
        StatusCode::PAYMENT_REQUIRED,
        "no subscription → 402"
    );
}

#[tokio::test]
async fn subscription_endpoint_returns_none_without_subscription() {
    let (pool, _pg) = start_postgres().await;
    let state = billing_state(pool.clone());
    let app = router(state, None);

    let (_id, token) = insert_parent(&pool).await;

    let res = app
        .oneshot(req(
            Method::GET,
            "/billing/subscription",
            None,
            Some(&token),
        ))
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["status"], "none");
    assert_eq!(body["is_premium"], false);
}
