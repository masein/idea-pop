-- Phase 13b: Course metadata for the redesigned Library course-detail header.
-- Adds difficulty / age_min / materials so the UI can show real "Easy · 11+ ·
-- laptop + internet" style pills instead of hardcoded values.
--
-- Append-only + reversible. To reverse:
--   ALTER TABLE courses
--     DROP COLUMN materials,
--     DROP COLUMN age_min,
--     DROP COLUMN difficulty;

ALTER TABLE courses
    ADD COLUMN difficulty SMALLINT  NOT NULL DEFAULT 1
        CHECK (difficulty BETWEEN 1 AND 3),
    ADD COLUMN age_min    SMALLINT  NOT NULL DEFAULT 8,
    ADD COLUMN materials  TEXT[]    NOT NULL DEFAULT '{}';
