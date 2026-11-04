-- A kid's idea and what happens to it afterwards are kept apart. idea_submissions is the kid's
-- original, never edited: a changed idea is a new row, so earlier versions stay. idea_reviews is
-- an append-only history (status, feedback, verified references) that can come from AI, a person,
-- or both; `owner` records which. Private to the kid: nothing here is shown to anyone else.
CREATE TABLE IF NOT EXISTS idea_submissions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id      UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    challenge_id  UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    hero_index    SMALLINT,
    hero_name     TEXT,
    original_text TEXT        NOT NULL,
    -- The voice note itself stays on the kid's device and is never uploaded.
    has_voice     BOOLEAN     NOT NULL DEFAULT false,
    version       INTEGER     NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idea_submissions_child_challenge
    ON idea_submissions (child_id, challenge_id, version);

CREATE TABLE IF NOT EXISTS idea_reviews (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id           UUID        NOT NULL REFERENCES idea_submissions(id) ON DELETE CASCADE,
    status            TEXT        NOT NULL CHECK (status IN ('pending_review', 'reviewed', 'later_guidance')),
    outcome           TEXT        CHECK (outcome IN ('related', 'unrelated', 'not_testable_yet')),
    owner             TEXT        NOT NULL CHECK (owner IN ('ai', 'human', 'hybrid')),
    feedback          TEXT,
    experiment        JSONB,
    verified_references JSONB     NOT NULL DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idea_reviews_idea ON idea_reviews (idea_id, created_at);
