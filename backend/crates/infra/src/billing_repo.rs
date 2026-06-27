//! SQLx repositories and payment gateway adapters for Phase 6 billing.
//!
//! - SqlxSubscriptionRepo — persists Subscription rows.
//! - SqlxWebhookEventLog — idempotency log keyed by provider_event_id.
//! - StripePaymentGateway — calls Stripe REST API; verifies webhook signatures.
//! - MockPaymentGateway  — deterministic fake for integration tests.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use idea_pop_domain::{
    billing::{CheckoutResult, Plan, Subscription, SubscriptionStatus},
    DomainError, PaymentGateway, SubscriptionRepo, WebhookEventLog,
};

// ── helpers ───────────────────────────────────────────────────────────────────

fn db_err(e: sqlx::Error) -> DomainError {
    DomainError::Internal(e.to_string())
}

fn sub_from_row(row: &sqlx::postgres::PgRow) -> Result<Subscription, DomainError> {
    let plan_str: &str = row.try_get("plan").map_err(db_err)?;
    let plan = Plan::from_db(plan_str)
        .ok_or_else(|| DomainError::Internal(format!("unknown plan: {plan_str}")))?;

    let status_str: &str = row.try_get("status").map_err(db_err)?;
    let status = SubscriptionStatus::from_db(status_str)
        .ok_or_else(|| DomainError::Internal(format!("unknown status: {status_str}")))?;

    Ok(Subscription {
        id: row.try_get("id").map_err(db_err)?,
        account_id: row.try_get("account_id").map_err(db_err)?,
        plan,
        status,
        current_period_end: row.try_get("current_period_end").map_err(db_err)?,
        provider_customer_id: row.try_get("provider_customer_id").map_err(db_err)?,
        provider_subscription_id: row.try_get("provider_subscription_id").map_err(db_err)?,
        created_at: row.try_get("created_at").map_err(db_err)?,
        updated_at: row.try_get("updated_at").map_err(db_err)?,
    })
}

// ── SqlxSubscriptionRepo ──────────────────────────────────────────────────────

pub struct SqlxSubscriptionRepo {
    pool: PgPool,
}

impl SqlxSubscriptionRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SubscriptionRepo for SqlxSubscriptionRepo {
    async fn find_by_account(&self, account_id: Uuid) -> Result<Option<Subscription>, DomainError> {
        let row = sqlx::query(
            "SELECT id, account_id, plan, status, current_period_end,
                    provider_customer_id, provider_subscription_id, created_at, updated_at
             FROM subscriptions WHERE account_id = $1",
        )
        .bind(account_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(db_err)?;
        row.map(|r| sub_from_row(&r)).transpose()
    }

    async fn find_by_provider_subscription(
        &self,
        provider_subscription_id: &str,
    ) -> Result<Option<Subscription>, DomainError> {
        let row = sqlx::query(
            "SELECT id, account_id, plan, status, current_period_end,
                    provider_customer_id, provider_subscription_id, created_at, updated_at
             FROM subscriptions WHERE provider_subscription_id = $1",
        )
        .bind(provider_subscription_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(db_err)?;
        row.map(|r| sub_from_row(&r)).transpose()
    }

    async fn find_by_provider_customer(
        &self,
        provider_customer_id: &str,
    ) -> Result<Option<Subscription>, DomainError> {
        let row = sqlx::query(
            "SELECT id, account_id, plan, status, current_period_end,
                    provider_customer_id, provider_subscription_id, created_at, updated_at
             FROM subscriptions WHERE provider_customer_id = $1
             ORDER BY created_at DESC LIMIT 1",
        )
        .bind(provider_customer_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(db_err)?;
        row.map(|r| sub_from_row(&r)).transpose()
    }

    async fn upsert(&self, sub: &Subscription) -> Result<(), DomainError> {
        sqlx::query(
            "INSERT INTO subscriptions
               (id, account_id, plan, status, current_period_end,
                provider_customer_id, provider_subscription_id, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (provider_subscription_id) DO UPDATE SET
               status               = EXCLUDED.status,
               current_period_end   = EXCLUDED.current_period_end,
               provider_customer_id = EXCLUDED.provider_customer_id,
               updated_at           = EXCLUDED.updated_at",
        )
        .bind(sub.id)
        .bind(sub.account_id)
        .bind(sub.plan.as_str())
        .bind(sub.status.as_str())
        .bind(sub.current_period_end)
        .bind(&sub.provider_customer_id)
        .bind(&sub.provider_subscription_id)
        .bind(sub.created_at)
        .bind(sub.updated_at)
        .execute(&self.pool)
        .await
        .map_err(db_err)?;
        Ok(())
    }
}

// ── SqlxWebhookEventLog ───────────────────────────────────────────────────────

pub struct SqlxWebhookEventLog {
    pool: PgPool,
}

impl SqlxWebhookEventLog {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl WebhookEventLog for SqlxWebhookEventLog {
    async fn try_record(
        &self,
        provider_event_id: &str,
        event_type: &str,
        now: DateTime<Utc>,
    ) -> Result<bool, DomainError> {
        let result = sqlx::query(
            "INSERT INTO webhook_events (provider_event_id, event_type, processed_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (provider_event_id) DO NOTHING",
        )
        .bind(provider_event_id)
        .bind(event_type)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(db_err)?;
        // rows_affected == 0 means the INSERT was a no-op (duplicate)
        Ok(result.rows_affected() > 0)
    }
}

// ── Stripe signature verification (shared) ────────────────────────────────────

fn verify_stripe_sig(
    payload: &[u8],
    signature_header: &str,
    secret: &str,
) -> Result<(), DomainError> {
    let mut timestamp: Option<&str> = None;
    let mut signatures: Vec<&str> = Vec::new();

    for part in signature_header.split(',') {
        if let Some(ts) = part.strip_prefix("t=") {
            timestamp = Some(ts);
        } else if let Some(sig) = part.strip_prefix("v1=") {
            signatures.push(sig);
        }
    }

    let ts = timestamp
        .ok_or_else(|| DomainError::Unauthorized("Stripe-Signature missing timestamp".into()))?;
    if signatures.is_empty() {
        return Err(DomainError::Unauthorized(
            "Stripe-Signature missing v1= value".into(),
        ));
    }

    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|e| DomainError::Internal(e.to_string()))?;
    // signed payload = "{timestamp}.{raw_body}"
    mac.update(ts.as_bytes());
    mac.update(b".");
    mac.update(payload);
    let expected = hex::encode(mac.finalize().into_bytes());

    if signatures.iter().any(|s| *s == expected) {
        Ok(())
    } else {
        Err(DomainError::Unauthorized(
            "Stripe webhook signature mismatch".into(),
        ))
    }
}

// ── StripePaymentGateway ──────────────────────────────────────────────────────

pub struct StripePaymentGateway {
    client: reqwest::Client,
    secret_key: String,
    webhook_secret: String,
    price_monthly: String,
    price_annual: String,
    success_url: String,
    cancel_url: String,
    return_url: String,
}

impl StripePaymentGateway {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        secret_key: impl Into<String>,
        webhook_secret: impl Into<String>,
        price_monthly: impl Into<String>,
        price_annual: impl Into<String>,
        success_url: impl Into<String>,
        cancel_url: impl Into<String>,
        return_url: impl Into<String>,
    ) -> Self {
        Self {
            client: reqwest::Client::new(),
            secret_key: secret_key.into(),
            webhook_secret: webhook_secret.into(),
            price_monthly: price_monthly.into(),
            price_annual: price_annual.into(),
            success_url: success_url.into(),
            cancel_url: cancel_url.into(),
            return_url: return_url.into(),
        }
    }

    fn price_for(&self, plan: &Plan) -> &str {
        match plan {
            Plan::Monthly => &self.price_monthly,
            Plan::Annual => &self.price_annual,
        }
    }
}

#[async_trait]
impl PaymentGateway for StripePaymentGateway {
    async fn create_checkout_session(
        &self,
        account_id: Uuid,
        plan: &Plan,
        _success_url: &str,
        _cancel_url: &str,
        customer_email: Option<&str>,
    ) -> Result<CheckoutResult, DomainError> {
        let price = self.price_for(plan);
        let mut params = vec![
            ("mode", "subscription"),
            ("success_url", &self.success_url),
            ("cancel_url", &self.cancel_url),
            ("line_items[0][price]", price),
            ("line_items[0][quantity]", "1"),
        ];
        let account_id_str = account_id.to_string();
        let plan_str = plan.as_str();
        params.push(("metadata[account_id]", &account_id_str));
        params.push(("metadata[plan]", plan_str));

        let email_owned;
        if let Some(email) = customer_email {
            email_owned = email.to_owned();
            params.push(("customer_email", &email_owned));
        }

        let resp = self
            .client
            .post("https://api.stripe.com/v1/checkout/sessions")
            .bearer_auth(&self.secret_key)
            .form(&params)
            .send()
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        let url = body["url"]
            .as_str()
            .ok_or_else(|| DomainError::Internal("Stripe: missing checkout url".into()))?
            .to_owned();
        let provider_customer_id = body["customer"].as_str().unwrap_or("").to_owned();

        Ok(CheckoutResult {
            url,
            provider_customer_id,
        })
    }

    async fn create_portal_session(
        &self,
        provider_customer_id: &str,
        _return_url: &str,
    ) -> Result<String, DomainError> {
        let params = [
            ("customer", provider_customer_id),
            ("return_url", &self.return_url),
        ];

        let resp = self
            .client
            .post("https://api.stripe.com/v1/billing_portal/sessions")
            .bearer_auth(&self.secret_key)
            .form(&params)
            .send()
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        let url = body["url"]
            .as_str()
            .ok_or_else(|| DomainError::Internal("Stripe: missing portal url".into()))?
            .to_owned();

        Ok(url)
    }

    fn verify_webhook_signature(
        &self,
        payload: &[u8],
        signature_header: &str,
    ) -> Result<(), DomainError> {
        verify_stripe_sig(payload, signature_header, &self.webhook_secret)
    }
}

// ── MockPaymentGateway ────────────────────────────────────────────────────────

/// Deterministic fake for integration tests.
/// Uses real HMAC-SHA256 verification with a configurable test secret so tests
/// can construct both valid and invalid signatures without a live Stripe account.
pub struct MockPaymentGateway {
    pub checkout_url: String,
    pub portal_url: String,
    pub webhook_secret: String,
    pub mock_customer_id: String,
}

impl MockPaymentGateway {
    pub fn new(webhook_secret: impl Into<String>) -> Self {
        Self {
            checkout_url: "https://checkout.stripe.com/pay/test_session".into(),
            portal_url: "https://billing.stripe.com/session/test_portal".into(),
            webhook_secret: webhook_secret.into(),
            mock_customer_id: "cus_test123".into(),
        }
    }

    /// Compute the Stripe-Signature header value for a given payload and timestamp.
    /// Used in tests to produce correctly signed requests.
    pub fn sign(secret: &str, timestamp: &str, payload: &[u8]) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(timestamp.as_bytes());
        mac.update(b".");
        mac.update(payload);
        let sig = hex::encode(mac.finalize().into_bytes());
        format!("t={timestamp},v1={sig}")
    }
}

#[async_trait]
impl PaymentGateway for MockPaymentGateway {
    async fn create_checkout_session(
        &self,
        _account_id: Uuid,
        plan: &Plan,
        _success_url: &str,
        _cancel_url: &str,
        _customer_email: Option<&str>,
    ) -> Result<CheckoutResult, DomainError> {
        Ok(CheckoutResult {
            url: format!("{}?plan={}", self.checkout_url, plan.as_str()),
            provider_customer_id: self.mock_customer_id.clone(),
        })
    }

    async fn create_portal_session(
        &self,
        _provider_customer_id: &str,
        _return_url: &str,
    ) -> Result<String, DomainError> {
        Ok(self.portal_url.clone())
    }

    fn verify_webhook_signature(
        &self,
        payload: &[u8],
        signature_header: &str,
    ) -> Result<(), DomainError> {
        verify_stripe_sig(payload, signature_header, &self.webhook_secret)
    }
}
