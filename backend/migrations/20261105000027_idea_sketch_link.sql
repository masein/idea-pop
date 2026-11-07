-- A kid's paper sketch belongs to their idea: the idea points at the project that holds the
-- sketch's name and photo, so one idea stays one record. The idea's words are not touched.
ALTER TABLE idea_submissions
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
