-- Phase 4: Progress & Gamification
-- Append-only XP ledger, materialized progress cache, activity tracking,
-- creative cycle, badge engine, and analytics events.

-- ── XP ledger (source of truth, append-only) ─────────────────────────────────
CREATE TABLE xp_events (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id     UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    source_type  TEXT        NOT NULL
                             CHECK (source_type IN ('explore','learn','solve','cycle_bonus')),
    source_id    UUID        NOT NULL,
    amount       SMALLINT    NOT NULL CHECK (amount > 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each (child, source_type, content-item) can earn XP only once.
-- cycle_bonus events use the creative_cycles row id as source_id;
-- their idempotency is enforced by creative_cycles.bonus_awarded.
CREATE UNIQUE INDEX xp_events_source_unique
    ON xp_events (child_id, source_type, source_id);

CREATE INDEX xp_events_child_idx ON xp_events (child_id, created_at);

-- ── Progress cache (derived, upserted after each XP award) ───────────────────
CREATE TABLE child_progress (
    child_id   UUID        PRIMARY KEY REFERENCES child_profiles(id) ON DELETE CASCADE,
    xp_total   INT         NOT NULL DEFAULT 0,
    level      SMALLINT    NOT NULL DEFAULT 1,
    rank       TEXT        NOT NULL DEFAULT 'explorer',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Video views ───────────────────────────────────────────────────────────────
CREATE TABLE video_views (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id  UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    video_id  UUID        NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (child_id, video_id)
);

-- ── Lesson completions ────────────────────────────────────────────────────────
CREATE TABLE lesson_completions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id     UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    lesson_id    UUID        NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (child_id, lesson_id)
);

-- ── Challenge attempts ────────────────────────────────────────────────────────
CREATE TABLE challenge_attempts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id     UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    challenge_id UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    current_step SMALLINT    NOT NULL DEFAULT 1
                             CHECK (current_step BETWEEN 1 AND 8),
    status       TEXT        NOT NULL DEFAULT 'in_progress'
                             CHECK (status IN ('in_progress','completed','abandoned')),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX challenge_attempts_child_idx ON challenge_attempts (child_id);

-- ── Creative cycles ───────────────────────────────────────────────────────────
-- Tracks per-week progress toward the Creative Cycle bonus.
-- bonus_awarded = true means the +15 XP has been claimed for this week.
CREATE TABLE creative_cycles (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id      UUID    NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    iso_year      INT     NOT NULL,
    iso_week      INT     NOT NULL,
    explore_done  BOOLEAN NOT NULL DEFAULT false,
    learn_done    BOOLEAN NOT NULL DEFAULT false,
    solve_done    BOOLEAN NOT NULL DEFAULT false,
    bonus_awarded BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (child_id, iso_year, iso_week)
);

-- ── Badges ────────────────────────────────────────────────────────────────────
CREATE TABLE badges (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT        NOT NULL UNIQUE,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    icon_url    TEXT        NOT NULL DEFAULT '',
    criteria    JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE child_badges (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id   UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    badge_id   UUID        NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (child_id, badge_id)
);

-- ── Analytics events ──────────────────────────────────────────────────────────
CREATE TABLE analytics_events (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id   UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    event_type TEXT        NOT NULL,
    payload    JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_child_idx ON analytics_events (child_id);
CREATE INDEX analytics_events_type_idx  ON analytics_events (event_type, created_at);
