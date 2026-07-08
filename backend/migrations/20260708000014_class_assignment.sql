-- Teacher class dashboard: the currently assigned mission per class.
--
-- Append-only + reversible. To reverse:
--   ALTER TABLE classes DROP COLUMN assigned_challenge_id;

ALTER TABLE classes
    ADD COLUMN assigned_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL;
