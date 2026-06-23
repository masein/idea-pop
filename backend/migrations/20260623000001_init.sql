-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trivial validation table: confirms the SQLx pipeline (migrations, query macros,
-- offline cache) works end-to-end before Phase 1 domain tables land.
CREATE TABLE health_log (
    id         UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    message    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
