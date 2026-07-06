-- Phase 13b: premium-gating for challenges.
-- Free challenges are visible to everyone; premium ones are locked for kids
-- whose family has no active subscription (the API computes `locked` per caller).
--
-- Append-only + reversible. To reverse:
--   ALTER TABLE challenges DROP COLUMN is_premium;

ALTER TABLE challenges
    ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
