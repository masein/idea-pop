-- Phase 10a: Replace Explore habitat grouping with superpower_category.
--
-- Additive and reversible: the old `habitat` column is kept (nullable) for
-- rollback. To reverse: drop superpower_category + its index, restore NOT NULL
-- on habitat, and revert the application code.

-- 1. Give habitat a default so existing INSERT statements that omit it still work.
ALTER TABLE explore_videos ALTER COLUMN habitat SET DEFAULT 'ocean';
ALTER TABLE explore_videos ALTER COLUMN habitat DROP NOT NULL;

-- 2. Add the new column; DEFAULT lets the column be NOT NULL immediately.
ALTER TABLE explore_videos
    ADD COLUMN superpower_category TEXT NOT NULL DEFAULT 'masters_of_disguise';

-- 3. Backfill from existing habitat values using the canonical mapping.
--    ocean  → masters_of_disguise  (octopus, cuttlefish — change to survive)
--    jungle → soft_engineers       (spiders, caterpillars — bodies that think)
--    desert → speed_champions      (cheetah, roadrunner — fast movers)
--    sky    → master_builders      (birds, bees — builders of remarkable structures)
UPDATE explore_videos
SET superpower_category = CASE habitat
    WHEN 'ocean'   THEN 'masters_of_disguise'
    WHEN 'jungle'  THEN 'soft_engineers'
    WHEN 'desert'  THEN 'speed_champions'
    WHEN 'sky'     THEN 'master_builders'
    ELSE                'masters_of_disguise'
END;

-- 4. Index for the filter query (replaces explore_habitat_idx for new reads).
CREATE INDEX explore_superpower_category_idx ON explore_videos (superpower_category);

-- explore_habitat_idx is left in place to support rollback.
