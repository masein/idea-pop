-- Accounts and refresh-session tables for Phase 2a.

CREATE TABLE accounts (
    id                              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email                           VARCHAR(254) NOT NULL UNIQUE,
    password_hash                   TEXT         NOT NULL,
    role                            VARCHAR(20)  NOT NULL DEFAULT 'parent',
    email_verified_at               TIMESTAMPTZ,
    locale                          VARCHAR(10)  NOT NULL DEFAULT 'en',
    verification_token_hash         TEXT         UNIQUE,
    verification_token_expires_at   TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_sessions (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    refresh_token_hash  TEXT         NOT NULL UNIQUE,
    expires_at          TIMESTAMPTZ  NOT NULL,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_sessions_account_id        ON refresh_sessions(account_id);
CREATE INDEX idx_refresh_sessions_refresh_token_hash ON refresh_sessions(refresh_token_hash);
