-- Teacher-created class students: a PIN sign-in path for kids who have no
-- email/password (COPPA data-minimisation stays intact — still only nickname,
-- avatar, birth year). The responsible adult is the teacher's account
-- (parent_account_id), and consent is recorded as 'class_granted' (class
-- sharing only, never public) via the normal parental_consents row.
--
-- All columns are nullable / defaulted so existing self-signup kids are
-- unaffected: login_pin_hash stays NULL for them and they never use PIN login.

ALTER TABLE child_profiles
    -- Argon2 hash of the kid's class login PIN. NULL for self-signup kids.
    ADD COLUMN login_pin_hash   TEXT,
    -- Brute-force guard for PIN login (reset on success).
    ADD COLUMN pin_attempts     SMALLINT    NOT NULL DEFAULT 0,
    ADD COLUMN pin_locked_until  TIMESTAMPTZ;
