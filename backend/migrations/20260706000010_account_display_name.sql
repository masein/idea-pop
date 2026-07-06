-- Phase 13b: a friendly display name on accounts, shown in the parent/teacher
-- portal header ("Hi Susan"). Optional; defaults to empty.
--
-- Append-only + reversible. To reverse:
--   ALTER TABLE accounts DROP COLUMN display_name;

ALTER TABLE accounts
    ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
