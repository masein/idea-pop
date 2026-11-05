-- Review ownership isn't decided yet: an idea can wait with no owner, and no AI review runs.
ALTER TABLE idea_reviews DROP CONSTRAINT IF EXISTS idea_reviews_owner_check;
ALTER TABLE idea_reviews ADD CONSTRAINT idea_reviews_owner_check
    CHECK (owner IN ('unassigned', 'ai', 'human', 'hybrid'));
UPDATE idea_reviews SET owner = 'unassigned' WHERE status = 'pending_review' AND outcome IS NULL;
