-- The three challenge stars (Max's challenge is the template): one row per star a kid has
-- earned on a challenge. The primary key keeps every star once. `note` keeps the words that
-- went with it: the prototype description (star 2, when there is no photo) or the improved
-- idea (star 3).
CREATE TABLE IF NOT EXISTS challenge_stars (
    child_id     UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    challenge_id UUID        NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    star         SMALLINT    NOT NULL CHECK (star BETWEEN 1 AND 3),
    note         TEXT,
    earned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (child_id, challenge_id, star)
);
