-- What a kid's project is within a challenge (sketch, model, lab results, practice, new version),
-- so later pages can show each one in its place. Older projects have none and stay as they are.
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS step_type VARCHAR(20);
