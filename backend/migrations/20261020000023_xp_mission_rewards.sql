-- Badge-reward missions (Max's challenge): 5 XP per distinct badge and 10 XP per optional
-- photo kind. Each reward's source_id is a stable id for (mission, key), so the
-- (child, source_type, source_id) unique index gives every reward once.
ALTER TABLE xp_events DROP CONSTRAINT IF EXISTS xp_events_source_type_check;
ALTER TABLE xp_events ADD CONSTRAINT xp_events_source_type_check
    CHECK (source_type IN ('explore','learn','solve','cycle_bonus','define_bonus','sketch_bonus',
                           'mission_badge','photo_bonus'));
