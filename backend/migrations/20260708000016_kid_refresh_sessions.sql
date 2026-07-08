-- Kid refresh sessions: children previously received only a 15-minute
-- in-memory access token, so ANY full page load signed them out (adults got
-- refresh cookies in the auth-refresh-contract fix; kids were left behind).
-- A refresh session may now carry the child it authenticates: refresh with
-- such a session re-issues a KID token, never the parent's adult token.
--
-- Append-only + reversible. To reverse:
--   ALTER TABLE refresh_sessions DROP COLUMN child_id;

ALTER TABLE refresh_sessions
    ADD COLUMN child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE;
