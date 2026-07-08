-- Kid avatars are semantic ids ("cat", "dolphin", …) everywhere in the
-- product: the onboarding picker sends them, every API response already
-- returns avatar_id as a string, and the frontend art lookup is keyed by
-- name. The SMALLINT column was a leftover from the placeholder art era and
-- made real kid self-signup impossible (type mismatch → 422).
--
-- Existing numeric rows are carried over as their digit strings ("2", "5"),
-- which the frontend already tolerates via its emoji fallback.
--
-- Append-only + reversible. To reverse:
--   ALTER TABLE child_profiles ALTER COLUMN avatar_id TYPE SMALLINT
--     USING NULLIF(regexp_replace(avatar_id, '\D', '', 'g'), '')::smallint;
--   ALTER TABLE child_profiles ADD CONSTRAINT child_profiles_avatar_id_check
--     CHECK (avatar_id >= 0);

ALTER TABLE child_profiles DROP CONSTRAINT child_profiles_avatar_id_check;
ALTER TABLE child_profiles
    ALTER COLUMN avatar_id TYPE VARCHAR(32) USING avatar_id::text;
