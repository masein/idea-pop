-- Email notification preferences, one row per adult account.
-- Rows are created lazily on first PUT; a missing row means "all defaults"
-- (everything off — notifications are strictly opt-in on a kids' platform).
--
-- Append-only + reversible. To reverse:
--   DROP TABLE email_preferences;

CREATE TABLE email_preferences (
    account_id       UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    marketing        BOOLEAN NOT NULL DEFAULT FALSE,
    new_content      BOOLEAN NOT NULL DEFAULT FALSE,
    activity_reports BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
