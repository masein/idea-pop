//! Phase 6 — billing handlers.
//!
//! Safety invariants enforced here:
//! - Kid tokens (role = Kid) NEVER reach /billing routes — AdultAuth rejects them 403.
//! - POST /webhooks/stripe is excluded from auth and consent middleware; reads raw Bytes.
//! - NEVER log or store card data; only provider IDs are persisted.
//! - Webhook processing is idempotent via the WebhookEventLog (UNIQUE provider_event_id).

use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};

use idea_pop_domain::{
    apply_webhook_event, billing::Subscription, is_premium, Plan, SubscriptionStatus,
    WebhookEventKind,
};

use crate::{error::problem, extractor::AdultAuth, state::AppState};

// ── DTOs ──────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CheckoutRequest {
    pub plan: String,
}

#[derive(Serialize)]
pub struct CheckoutResponse {
    pub url: String,
}

#[derive(Serialize)]
pub struct PortalResponse {
    pub url: String,
}

#[derive(Serialize)]
pub struct SubscriptionResponse {
    pub status: String,
    pub plan: Option<String>,
    pub current_period_end: Option<DateTime<Utc>>,
    pub is_premium: bool,
}

// ── POST /billing/checkout ────────────────────────────────────────────────────

pub async fn create_checkout(
    State(state): State<AppState>,
    AdultAuth(claims): AdultAuth,
    Json(body): Json<CheckoutRequest>,
) -> impl IntoResponse {
    let plan = match body.plan.as_str() {
        "monthly" => Plan::Monthly,
        "annual" => Plan::Annual,
        _ => {
            return problem(
                StatusCode::UNPROCESSABLE_ENTITY,
                "invalid-plan",
                "plan must be 'monthly' or 'annual'",
            )
            .into_response()
        }
    };

    let result = state
        .billing
        .gateway
        .create_checkout_session(claims.account_id, &plan, "", "", None)
        .await;

    match result {
        Ok(r) => Json(CheckoutResponse { url: r.url }).into_response(),
        Err(e) => {
            tracing::error!("create_checkout error: {e}");
            problem(
                StatusCode::BAD_GATEWAY,
                "payment-gateway-error",
                "Could not create checkout session",
            )
            .into_response()
        }
    }
}

// ── POST /billing/portal ──────────────────────────────────────────────────────

pub async fn create_portal(
    State(state): State<AppState>,
    AdultAuth(claims): AdultAuth,
) -> impl IntoResponse {
    let sub = state
        .billing
        .subscriptions
        .find_by_account(claims.account_id)
        .await;

    let sub = match sub {
        Ok(Some(s)) => s,
        Ok(None) => {
            return problem(
                StatusCode::NOT_FOUND,
                "no-subscription",
                "No active subscription found for this account",
            )
            .into_response()
        }
        Err(e) => {
            tracing::error!("portal lookup error: {e}");
            return problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal-error",
                "Could not look up subscription",
            )
            .into_response();
        }
    };

    let url = state
        .billing
        .gateway
        .create_portal_session(&sub.provider_customer_id, "")
        .await;

    match url {
        Ok(u) => Json(PortalResponse { url: u }).into_response(),
        Err(e) => {
            tracing::error!("create_portal error: {e}");
            problem(
                StatusCode::BAD_GATEWAY,
                "payment-gateway-error",
                "Could not create portal session",
            )
            .into_response()
        }
    }
}

// ── GET /billing/subscription ─────────────────────────────────────────────────

pub async fn get_subscription(
    State(state): State<AppState>,
    AdultAuth(claims): AdultAuth,
) -> impl IntoResponse {
    let sub = state
        .billing
        .subscriptions
        .find_by_account(claims.account_id)
        .await;

    match sub {
        Ok(Some(s)) => {
            let now = Utc::now();
            let premium = is_premium(&s.status, s.current_period_end, now);
            Json(SubscriptionResponse {
                status: s.status.as_str().to_owned(),
                plan: Some(s.plan.as_str().to_owned()),
                current_period_end: Some(s.current_period_end),
                is_premium: premium,
            })
            .into_response()
        }
        Ok(None) => Json(SubscriptionResponse {
            status: "none".to_owned(),
            plan: None,
            current_period_end: None,
            is_premium: false,
        })
        .into_response(),
        Err(e) => {
            tracing::error!("get_subscription error: {e}");
            problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal-error",
                "Could not look up subscription",
            )
            .into_response()
        }
    }
}

// ── GET /billing/premium-check ────────────────────────────────────────────────

/// Lightweight entitlement probe — returns 200 if the caller has premium
/// access, 402 if they do not. Kid tokens are rejected 403 by AdultAuth.
pub async fn premium_check(
    State(state): State<AppState>,
    AdultAuth(claims): AdultAuth,
) -> impl IntoResponse {
    let sub = state
        .billing
        .subscriptions
        .find_by_account(claims.account_id)
        .await;

    let (status, period_end) = match sub {
        Ok(Some(ref s)) => (s.status.clone(), s.current_period_end),
        Ok(None) => (
            SubscriptionStatus::Incomplete,
            Utc.timestamp_opt(0, 0).unwrap(),
        ),
        Err(e) => {
            tracing::error!("premium_check error: {e}");
            return problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal-error",
                "Could not check subscription",
            )
            .into_response();
        }
    };

    let now = Utc::now();
    if is_premium(&status, period_end, now) {
        (StatusCode::OK, "premium").into_response()
    } else {
        problem(
            StatusCode::PAYMENT_REQUIRED,
            "premium-required",
            "An active subscription is required to access this content",
        )
        .into_response()
    }
}

// ── POST /webhooks/stripe ─────────────────────────────────────────────────────
//
// This route MUST be excluded from auth and consent middleware.
// The body is read as raw bytes so the signature covers the exact wire payload.

#[derive(Deserialize)]
struct StripeWebhookPayload {
    id: String,
    #[serde(rename = "type")]
    event_type: String,
    data: StripeData,
}

#[derive(Deserialize)]
struct StripeData {
    object: serde_json::Value,
}

pub async fn stripe_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    // 1. Verify signature
    let sig = match headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
    {
        Some(s) => s.to_owned(),
        None => {
            return problem(
                StatusCode::BAD_REQUEST,
                "missing-signature",
                "Stripe-Signature header required",
            )
            .into_response()
        }
    };

    if let Err(e) = state.billing.gateway.verify_webhook_signature(&body, &sig) {
        tracing::warn!("webhook signature verification failed: {e}");
        return problem(
            StatusCode::BAD_REQUEST,
            "invalid-signature",
            "Webhook signature verification failed",
        )
        .into_response();
    }

    // 2. Parse event
    let event: StripeWebhookPayload = match serde_json::from_slice(&body) {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!("webhook parse error: {e}");
            return problem(
                StatusCode::BAD_REQUEST,
                "invalid-payload",
                "Could not parse webhook payload",
            )
            .into_response();
        }
    };

    // 3. Idempotency check
    let now = Utc::now();
    let is_new = state
        .billing
        .webhook_log
        .try_record(&event.id, &event.event_type, now)
        .await;

    match is_new {
        Ok(false) => {
            tracing::debug!("duplicate webhook event {}, skipping", event.id);
            return StatusCode::OK.into_response();
        }
        Err(e) => {
            tracing::error!("webhook_log.try_record error: {e}");
            return problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal-error",
                "Could not record webhook event",
            )
            .into_response();
        }
        Ok(true) => {}
    }

    // 4. Dispatch by event type
    let Some(kind) = WebhookEventKind::from_stripe_type(&event.event_type) else {
        // Unknown event — acknowledge so Stripe doesn't retry
        return StatusCode::OK.into_response();
    };

    let obj = &event.data.object;

    let (provider_sub_id, provider_customer_id, new_period_end) = match &kind {
        WebhookEventKind::CheckoutCompleted => {
            let sub_id = obj["subscription"].as_str().unwrap_or("").to_owned();
            let cust_id = obj["customer"].as_str().unwrap_or("").to_owned();
            (sub_id, cust_id, None)
        }
        WebhookEventKind::PaymentSucceeded | WebhookEventKind::PaymentFailed => {
            let sub_id = obj["subscription"].as_str().unwrap_or("").to_owned();
            let cust_id = obj["customer"].as_str().unwrap_or("").to_owned();
            let period_end = extract_invoice_period_end(obj);
            (sub_id, cust_id, period_end)
        }
        WebhookEventKind::SubscriptionDeleted => {
            let sub_id = obj["id"].as_str().unwrap_or("").to_owned();
            let cust_id = obj["customer"].as_str().unwrap_or("").to_owned();
            (sub_id, cust_id, None)
        }
    };

    // 5. For checkout.session.completed: create the subscription record from metadata
    if kind == WebhookEventKind::CheckoutCompleted {
        // Extract account_id and plan from Stripe checkout session metadata
        let meta = &obj["metadata"];
        let account_id_str = meta["account_id"].as_str().unwrap_or("");
        let plan_str = meta["plan"].as_str().unwrap_or("monthly");

        if let Ok(account_id) = account_id_str.parse::<uuid::Uuid>() {
            let plan = Plan::from_db(plan_str).unwrap_or(Plan::Monthly);
            // Use a far-future period_end as placeholder (will be updated on invoice.payment_succeeded)
            let period_end = now + chrono::Duration::days(30);
            let mut sub = Subscription::new(
                account_id,
                plan,
                &provider_customer_id,
                &provider_sub_id,
                period_end,
                now,
            );
            apply_webhook_event(&mut sub, &kind, None, now);
            if let Err(e) = state.billing.subscriptions.upsert(&sub).await {
                tracing::error!("webhook upsert error: {e}");
                return problem(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal-error",
                    "Could not persist subscription",
                )
                .into_response();
            }
            return StatusCode::OK.into_response();
        }
    }

    // 6. For subsequent events: find existing subscription and update it
    let existing = state
        .billing
        .subscriptions
        .find_by_provider_subscription(&provider_sub_id)
        .await;

    let mut sub = match existing {
        Ok(Some(s)) => s,
        Ok(None) => {
            // Subscription not found — could be a race or an event for an untracked sub.
            // Try by customer ID as a fallback.
            match state
                .billing
                .subscriptions
                .find_by_provider_customer(&provider_customer_id)
                .await
            {
                Ok(Some(s)) => s,
                _ => {
                    tracing::warn!(
                        "webhook: no subscription found for sub={} cust={}",
                        provider_sub_id,
                        provider_customer_id
                    );
                    return StatusCode::OK.into_response();
                }
            }
        }
        Err(e) => {
            tracing::error!("webhook subscription lookup error: {e}");
            return problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal-error",
                "Could not look up subscription",
            )
            .into_response();
        }
    };

    apply_webhook_event(&mut sub, &kind, new_period_end, now);

    if let Err(e) = state.billing.subscriptions.upsert(&sub).await {
        tracing::error!("webhook upsert error: {e}");
        return problem(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal-error",
            "Could not persist subscription update",
        )
        .into_response();
    }

    StatusCode::OK.into_response()
}

// ── helpers ───────────────────────────────────────────────────────────────────

fn extract_invoice_period_end(obj: &serde_json::Value) -> Option<DateTime<Utc>> {
    // invoice.payment_succeeded objects contain line items with period.end (unix timestamp)
    let ts = obj["lines"]["data"][0]["period"]["end"].as_i64()?;
    Utc.timestamp_opt(ts, 0).single()
}
