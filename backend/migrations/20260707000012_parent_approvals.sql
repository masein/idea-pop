-- Parent portal: per-child display mode + kid premium-unlock requests.
--
-- display_mode controls how the child is shown wherever their work appears
-- (gallery, Ideas Wall). Defaults to avatar + nickname.
--
-- premium_unlock_requests is the producer side of the parent "Needs your OK"
-- queue: a kid tapping a locked mission records a request; the parent approves
-- or dismisses it from their own dashboard. Kids still can NEVER check out —
-- approval only signals intent; payment stays on the parent's session.
-- At most one pending request per child (partial unique index).
--
-- Append-only + reversible. To reverse:
--   DROP TABLE premium_unlock_requests;
--   ALTER TABLE child_profiles DROP COLUMN display_mode;

ALTER TABLE child_profiles
    ADD COLUMN display_mode VARCHAR(20) NOT NULL DEFAULT 'avatar_nickname'
    CHECK (display_mode IN ('avatar_nickname', 'first_name', 'anonymous'));

CREATE TABLE premium_unlock_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id    UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'dismissed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID        REFERENCES accounts(id)
);

CREATE UNIQUE INDEX premium_unlock_requests_pending_idx
    ON premium_unlock_requests (child_id) WHERE status = 'pending';
