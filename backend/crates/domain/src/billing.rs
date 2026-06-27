//! Subscription & billing domain types, state machine, and entitlement logic.
//!
//! This module is intentionally pure — no IO, no HTTP, no DB.
//! Business rules:
//! - Every project is private by default; visibility changes to Class/Public
//!   require a moderation step (enforced in portfolio.rs).
//! - Subscriptions start INCOMPLETE and become ACTIVE only after the provider
//!   confirms payment via a webhook event.
//! - PastDue accounts retain premium access for GRACE_PERIOD_HOURS after their
//!   current_period_end, giving time for a card retry before content is locked.
//! - Kid tokens are NEVER allowed on billing routes (enforced at the API layer
//!   via AdultAuth; this module has no knowledge of HTTP).

use chrono::{DateTime, Duration, Utc};
use uuid::Uuid;

// ── Plan ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Plan {
    Monthly,
    Annual,
}

impl Plan {
    pub fn as_str(&self) -> &'static str {
        match self {
            Plan::Monthly => "monthly",
            Plan::Annual => "annual",
        }
    }

    pub fn from_db(s: &str) -> Option<Self> {
        match s {
            "monthly" => Some(Plan::Monthly),
            "annual" => Some(Plan::Annual),
            _ => None,
        }
    }
}

// ── SubscriptionStatus ────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SubscriptionStatus {
    /// Checkout initiated but payment not yet confirmed.
    Incomplete,
    /// Payment confirmed; full premium access.
    Active,
    /// Renewal payment failed; grace-period access still applies.
    PastDue,
    /// Subscription cancelled by user or provider; no access.
    Canceled,
}

impl SubscriptionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SubscriptionStatus::Incomplete => "incomplete",
            SubscriptionStatus::Active => "active",
            SubscriptionStatus::PastDue => "past_due",
            SubscriptionStatus::Canceled => "canceled",
        }
    }

    pub fn from_db(s: &str) -> Option<Self> {
        match s {
            "incomplete" => Some(SubscriptionStatus::Incomplete),
            "active" => Some(SubscriptionStatus::Active),
            "past_due" => Some(SubscriptionStatus::PastDue),
            "canceled" => Some(SubscriptionStatus::Canceled),
            _ => None,
        }
    }
}

// ── Subscription ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct Subscription {
    pub id: Uuid,
    pub account_id: Uuid,
    pub plan: Plan,
    pub status: SubscriptionStatus,
    pub current_period_end: DateTime<Utc>,
    /// Stripe customer ID (cus_…). Never a card number.
    pub provider_customer_id: String,
    /// Stripe subscription ID (sub_…). Never a card number.
    pub provider_subscription_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Subscription {
    pub fn new(
        account_id: Uuid,
        plan: Plan,
        provider_customer_id: impl Into<String>,
        provider_subscription_id: impl Into<String>,
        current_period_end: DateTime<Utc>,
        now: DateTime<Utc>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            account_id,
            plan,
            status: SubscriptionStatus::Incomplete,
            current_period_end,
            provider_customer_id: provider_customer_id.into(),
            provider_subscription_id: provider_subscription_id.into(),
            created_at: now,
            updated_at: now,
        }
    }
}

// ── Webhook event kinds ───────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WebhookEventKind {
    /// checkout.session.completed — first payment confirmed.
    CheckoutCompleted,
    /// invoice.payment_succeeded — renewal payment confirmed.
    PaymentSucceeded,
    /// invoice.payment_failed — renewal failed.
    PaymentFailed,
    /// customer.subscription.deleted — user or provider cancelled.
    SubscriptionDeleted,
}

impl WebhookEventKind {
    pub fn from_stripe_type(t: &str) -> Option<Self> {
        match t {
            "checkout.session.completed" => Some(Self::CheckoutCompleted),
            "invoice.payment_succeeded" => Some(Self::PaymentSucceeded),
            "invoice.payment_failed" => Some(Self::PaymentFailed),
            "customer.subscription.deleted" => Some(Self::SubscriptionDeleted),
            _ => None,
        }
    }
}

// ── State machine (pure) ──────────────────────────────────────────────────────

/// Apply a single webhook event to a subscription in memory.
///
/// This is a pure function — callers must persist the mutation separately.
/// Idempotency is enforced at the webhook-log layer (unique event_id in DB),
/// not here — applying the same event twice is safe but a no-op in practice
/// because the second delivery is rejected before reaching this function.
pub fn apply_webhook_event(
    sub: &mut Subscription,
    kind: &WebhookEventKind,
    new_period_end: Option<DateTime<Utc>>,
    now: DateTime<Utc>,
) {
    match kind {
        WebhookEventKind::CheckoutCompleted => {
            sub.status = SubscriptionStatus::Active;
        }
        WebhookEventKind::PaymentSucceeded => {
            sub.status = SubscriptionStatus::Active;
            if let Some(end) = new_period_end {
                sub.current_period_end = end;
            }
        }
        WebhookEventKind::PaymentFailed => {
            sub.status = SubscriptionStatus::PastDue;
        }
        WebhookEventKind::SubscriptionDeleted => {
            sub.status = SubscriptionStatus::Canceled;
        }
    }
    sub.updated_at = now;
}

// ── Entitlement ───────────────────────────────────────────────────────────────

/// Grace period after a payment failure before premium access is revoked.
pub const GRACE_PERIOD_HOURS: i64 = 72;

/// Returns true if a subscription with the given status grants premium access now.
///
/// Active → always premium.
/// PastDue → premium within GRACE_PERIOD_HOURS after current_period_end.
/// Incomplete / Canceled → never premium.
pub fn is_premium(
    status: &SubscriptionStatus,
    current_period_end: DateTime<Utc>,
    now: DateTime<Utc>,
) -> bool {
    match status {
        SubscriptionStatus::Active => true,
        SubscriptionStatus::PastDue => {
            now <= current_period_end + Duration::hours(GRACE_PERIOD_HOURS)
        }
        SubscriptionStatus::Incomplete | SubscriptionStatus::Canceled => false,
    }
}

// ── CheckoutResult ────────────────────────────────────────────────────────────

/// Returned by PaymentGateway::create_checkout_session.
pub struct CheckoutResult {
    /// Hosted checkout URL to redirect the user to.
    pub url: String,
    /// Provider customer ID (e.g. cus_…) assigned during checkout.
    pub provider_customer_id: String,
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn make_sub(now: DateTime<Utc>) -> Subscription {
        Subscription::new(
            Uuid::new_v4(),
            Plan::Monthly,
            "cus_test",
            "sub_test",
            now + Duration::days(30),
            now,
        )
    }

    #[test]
    fn new_subscription_is_incomplete() {
        let now = Utc::now();
        let sub = make_sub(now);
        assert_eq!(sub.status, SubscriptionStatus::Incomplete);
    }

    #[test]
    fn checkout_completed_activates() {
        let now = Utc::now();
        let mut sub = make_sub(now);
        apply_webhook_event(&mut sub, &WebhookEventKind::CheckoutCompleted, None, now);
        assert_eq!(sub.status, SubscriptionStatus::Active);
    }

    #[test]
    fn payment_succeeded_activates_and_extends_period() {
        let now = Utc::now();
        let mut sub = make_sub(now);
        sub.status = SubscriptionStatus::PastDue;
        let new_end = now + Duration::days(60);
        apply_webhook_event(
            &mut sub,
            &WebhookEventKind::PaymentSucceeded,
            Some(new_end),
            now,
        );
        assert_eq!(sub.status, SubscriptionStatus::Active);
        assert_eq!(sub.current_period_end, new_end);
    }

    #[test]
    fn payment_failed_sets_past_due() {
        let now = Utc::now();
        let mut sub = make_sub(now);
        sub.status = SubscriptionStatus::Active;
        apply_webhook_event(&mut sub, &WebhookEventKind::PaymentFailed, None, now);
        assert_eq!(sub.status, SubscriptionStatus::PastDue);
    }

    #[test]
    fn subscription_deleted_cancels() {
        let now = Utc::now();
        let mut sub = make_sub(now);
        sub.status = SubscriptionStatus::Active;
        apply_webhook_event(&mut sub, &WebhookEventKind::SubscriptionDeleted, None, now);
        assert_eq!(sub.status, SubscriptionStatus::Canceled);
    }

    #[test]
    fn is_premium_active() {
        let now = Utc::now();
        let period_end = now + Duration::days(30);
        assert!(is_premium(&SubscriptionStatus::Active, period_end, now));
    }

    #[test]
    fn is_premium_past_due_within_grace() {
        let now = Utc::now();
        let period_end = now - Duration::hours(1);
        assert!(is_premium(&SubscriptionStatus::PastDue, period_end, now));
    }

    #[test]
    fn is_premium_past_due_beyond_grace() {
        let now = Utc::now();
        let period_end = now - Duration::hours(GRACE_PERIOD_HOURS + 1);
        assert!(!is_premium(&SubscriptionStatus::PastDue, period_end, now));
    }

    #[test]
    fn canceled_not_premium() {
        let now = Utc::now();
        let period_end = now + Duration::days(10);
        assert!(!is_premium(&SubscriptionStatus::Canceled, period_end, now));
    }

    #[test]
    fn incomplete_not_premium() {
        let now = Utc::now();
        let period_end = now + Duration::days(10);
        assert!(!is_premium(
            &SubscriptionStatus::Incomplete,
            period_end,
            now
        ));
    }

    #[test]
    fn applying_same_event_twice_is_idempotent_on_state() {
        let now = Utc::now();
        let mut sub = make_sub(now);
        apply_webhook_event(&mut sub, &WebhookEventKind::PaymentFailed, None, now);
        assert_eq!(sub.status, SubscriptionStatus::PastDue);
        apply_webhook_event(&mut sub, &WebhookEventKind::PaymentFailed, None, now);
        assert_eq!(sub.status, SubscriptionStatus::PastDue);
    }

    #[test]
    fn plan_round_trips() {
        assert_eq!(Plan::from_db("monthly"), Some(Plan::Monthly));
        assert_eq!(Plan::from_db("annual"), Some(Plan::Annual));
        assert_eq!(Plan::Monthly.as_str(), "monthly");
        assert_eq!(Plan::Annual.as_str(), "annual");
    }

    #[test]
    fn status_round_trips() {
        for (s, v) in [
            ("incomplete", SubscriptionStatus::Incomplete),
            ("active", SubscriptionStatus::Active),
            ("past_due", SubscriptionStatus::PastDue),
            ("canceled", SubscriptionStatus::Canceled),
        ] {
            assert_eq!(SubscriptionStatus::from_db(s), Some(v.clone()));
            assert_eq!(v.as_str(), s);
        }
    }

    #[test]
    fn webhook_event_kind_parses_stripe_types() {
        assert_eq!(
            WebhookEventKind::from_stripe_type("checkout.session.completed"),
            Some(WebhookEventKind::CheckoutCompleted)
        );
        assert_eq!(
            WebhookEventKind::from_stripe_type("invoice.payment_succeeded"),
            Some(WebhookEventKind::PaymentSucceeded)
        );
        assert_eq!(
            WebhookEventKind::from_stripe_type("invoice.payment_failed"),
            Some(WebhookEventKind::PaymentFailed)
        );
        assert_eq!(
            WebhookEventKind::from_stripe_type("customer.subscription.deleted"),
            Some(WebhookEventKind::SubscriptionDeleted)
        );
        assert_eq!(WebhookEventKind::from_stripe_type("unrelated.event"), None);
    }
}
