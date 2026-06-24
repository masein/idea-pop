-- Phase 3b: Challenge engine — data-driven 8-step design-thinking missions.
-- steps, tools, and age_tier_variants are stored as JSONB so new challenges
-- require no schema changes; the engine is a generic renderer over this shape.

CREATE TABLE challenges (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title              TEXT        NOT NULL,
    slug               TEXT        NOT NULL UNIQUE,
    season             SMALLINT    NOT NULL,
    week_number        SMALLINT    NOT NULL,
    xp_reward          SMALLINT    NOT NULL DEFAULT 20,
    -- Exactly 8 ChallengeStep objects (validated at write time by the domain).
    steps              JSONB       NOT NULL,
    -- Recommended thinking tools per age mode.
    tools              JSONB       NOT NULL DEFAULT '[]',
    -- At least one AgeTierVariant (validated at write time by the domain).
    age_tier_variants  JSONB       NOT NULL DEFAULT '[]',
    -- Optional cross-references to Explore videos and Library lessons.
    related_video_ids  UUID[]      NOT NULL DEFAULT '{}',
    skill_refs         UUID[]      NOT NULL DEFAULT '{}',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX challenges_season_idx ON challenges (season);
CREATE INDEX challenges_week_idx   ON challenges (season, week_number);
