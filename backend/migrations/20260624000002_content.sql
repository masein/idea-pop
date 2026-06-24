-- Phase 3a: Explore & Library content tables.
-- All slugs are UNIQUE to support idempotent seeding via ON CONFLICT DO NOTHING.

-- ── Creators ─────────────────────────────────────────────────────────────────

CREATE TABLE creators (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT       NOT NULL,
    bio         TEXT        NOT NULL DEFAULT '',
    studio      TEXT        NOT NULL,   -- craft|art|music|code|science|nature
    avatar_url  TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Courses ───────────────────────────────────────────────────────────────────

CREATE TABLE courses (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    studio      TEXT        NOT NULL,
    creator_id  UUID        NOT NULL REFERENCES creators(id),
    summary     TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX courses_studio_idx ON courses (studio);

-- ── Lessons ───────────────────────────────────────────────────────────────────

CREATE TABLE lessons (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    ordinal     SMALLINT    NOT NULL,
    title       TEXT        NOT NULL,
    video_url   TEXT        NOT NULL,
    duration_s  INTEGER     NOT NULL,
    xp_reward   SMALLINT    NOT NULL DEFAULT 10,
    UNIQUE (course_id, ordinal)
);

CREATE INDEX lessons_course_idx ON lessons (course_id);

-- ── Explore videos ────────────────────────────────────────────────────────────

CREATE TABLE explore_videos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    slug            TEXT        NOT NULL UNIQUE,
    habitat         TEXT        NOT NULL,   -- ocean|jungle|desert|sky
    taxonomy        TEXT        NOT NULL,
    video_url       TEXT        NOT NULL,
    duration_s      INTEGER     NOT NULL,
    design_secret   TEXT        NOT NULL,
    sticker_id      TEXT        NOT NULL,
    xp_reward       SMALLINT    NOT NULL DEFAULT 5,
    ai_generated    BOOLEAN     NOT NULL DEFAULT FALSE,
    age_modes       TEXT[]      NOT NULL DEFAULT '{young,older}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX explore_habitat_idx ON explore_videos (habitat);
CREATE INDEX explore_age_modes_idx ON explore_videos USING GIN (age_modes);

-- ── Quick makes ───────────────────────────────────────────────────────────────

CREATE TABLE quick_makes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    slug            TEXT        NOT NULL UNIQUE,
    studio          TEXT        NOT NULL,
    difficulty      SMALLINT    NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
    time_minutes    SMALLINT    NOT NULL,
    materials       TEXT[]      NOT NULL DEFAULT '{}',
    mess_level      SMALLINT    NOT NULL CHECK (mess_level BETWEEN 1 AND 3),
    video_url       TEXT        NOT NULL,
    xp_reward       SMALLINT    NOT NULL DEFAULT 5,
    ai_generated    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quick_makes_studio_idx ON quick_makes (studio);
