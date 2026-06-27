-- Phase 6: Subscriptions & billing
-- NEVER store card data — only provider (Stripe) IDs.

CREATE TABLE subscriptions (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id               UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan                     VARCHAR(20) NOT NULL CHECK (plan IN ('monthly', 'annual')),
    status                   VARCHAR(20) NOT NULL DEFAULT 'incomplete'
                                         CHECK (status IN ('incomplete', 'active', 'past_due', 'canceled')),
    current_period_end       TIMESTAMPTZ NOT NULL,
    provider_customer_id     TEXT        NOT NULL,
    provider_subscription_id TEXT        NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One subscription record per account (upserted on webhook events).
CREATE UNIQUE INDEX idx_subscriptions_account        ON subscriptions(account_id);
CREATE UNIQUE INDEX idx_subscriptions_provider_sub   ON subscriptions(provider_subscription_id);
CREATE        INDEX idx_subscriptions_provider_cust  ON subscriptions(provider_customer_id);

-- Idempotency log for Stripe webhook events.
-- provider_event_id is UNIQUE — INSERT fails on duplicate, keeping state changes exactly-once.
CREATE TABLE webhook_events (
    id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_event_id TEXT    NOT NULL UNIQUE,
    event_type        TEXT    NOT NULL,
    processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_processed ON webhook_events(processed_at);
