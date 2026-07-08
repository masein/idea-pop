-- Scoped AI mission helper (per AI-helper-spec.md).
--
-- help_messages is the APPEND-ONLY transcript of every helper exchange:
-- (question, answer, moderation verdict) per child + challenge + step,
-- reviewable by the child's parent and teacher. Rows are never updated.
--
-- child_profiles.helper_enabled is the per-child opt-in toggle (off by
-- default; a parent flips it). The global dark-ship switch is the
-- MISSION_HELPER_ENABLED env flag, checked server-side.
--
-- Append-only + reversible. To reverse:
--   ALTER TABLE child_profiles DROP COLUMN helper_enabled;
--   DROP TABLE help_messages;

CREATE TABLE help_messages (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id     UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    challenge_id UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    step         SMALLINT    NOT NULL CHECK (step BETWEEN 1 AND 8),
    question     TEXT        NOT NULL,
    -- NULL when the input was blocked before any model call.
    answer       TEXT,
    -- Moderation verdict: true when the exchange was refused/blocked.
    blocked      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate-limit lookups (per-child hourly cap) and parent/teacher review feeds.
CREATE INDEX help_messages_child_recent_idx ON help_messages (child_id, created_at DESC);

ALTER TABLE child_profiles
    ADD COLUMN helper_enabled BOOLEAN NOT NULL DEFAULT FALSE;
