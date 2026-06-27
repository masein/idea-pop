-- Phase 5: Portfolio, sharing, moderation, and reporting tables.
--
-- Safety invariants enforced by schema:
--   projects.effective_visibility always starts 'private'; set to requested level only after approval.
--   challenge_ideas: UNIQUE (child_id, challenge_id) — one submission per child per challenge.
--   idea_reactions: PK (idea_id, child_id, reaction_type) — idempotent reactions.

CREATE TABLE projects (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id              UUID         NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    origin_type           VARCHAR(20)  NOT NULL CHECK (origin_type IN ('challenge', 'lesson', 'quick_make')),
    origin_id             UUID         NOT NULL,
    title                 TEXT         NOT NULL,
    description           TEXT         NOT NULL DEFAULT '',
    materials             TEXT         NOT NULL DEFAULT '',
    what_was_hard         TEXT         NOT NULL DEFAULT '',
    what_to_improve       TEXT         NOT NULL DEFAULT '',
    photo_keys            TEXT[]       NOT NULL DEFAULT '{}',
    requested_visibility  VARCHAR(10)  NOT NULL DEFAULT 'private',
    effective_visibility  VARCHAR(10)  NOT NULL DEFAULT 'private',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX projects_child_idx ON projects (child_id, created_at DESC);

-- Generic moderation queue for both projects and ideas.
CREATE TABLE moderation_queue (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('project', 'idea')),
    content_id   UUID        NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
    reason       TEXT,
    reviewer_id  UUID        REFERENCES accounts(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at  TIMESTAMPTZ,
    due_at       TIMESTAMPTZ NOT NULL
);

-- Fast lookup for pending moderation items
CREATE INDEX moderation_queue_pending_idx ON moderation_queue (status, created_at)
    WHERE status = 'pending';
-- Look up current pending item for a given piece of content
CREATE INDEX moderation_queue_content_idx ON moderation_queue (content_type, content_id, status)
    WHERE status = 'pending';

-- One idea per child per challenge. Ideas enter moderation on submit.
CREATE TABLE challenge_ideas (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id          UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    challenge_id      UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    text              TEXT        NOT NULL,
    photo_key         TEXT,
    remix_of          UUID        REFERENCES challenge_ideas(id),
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                                  CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (child_id, challenge_id)
);

CREATE INDEX challenge_ideas_challenge_approved_idx ON challenge_ideas (challenge_id, created_at)
    WHERE moderation_status = 'approved';

-- Idempotent reactions: a child can clap, star, and lightbulb the same idea once each.
CREATE TABLE idea_reactions (
    idea_id       UUID        NOT NULL REFERENCES challenge_ideas(id) ON DELETE CASCADE,
    child_id      UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('claps', 'stars', 'lightbulbs')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (idea_id, child_id, reaction_type)
);

-- Reports carry a 24-hour SLA (due_at = created_at + 24h).
CREATE TABLE reports (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id  UUID        NOT NULL REFERENCES accounts(id),
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('project', 'idea')),
    content_id   UUID        NOT NULL,
    reason       TEXT        NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'resolved')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX reports_pending_idx ON reports (status, due_at)
    WHERE status = 'pending';
