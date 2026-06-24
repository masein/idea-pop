-- Phase 2b: child profiles, parental consents, classes, and class memberships.
--
-- Safety: child_profiles collects ONLY nickname, avatar_id, birth_year.
-- No full name, address, phone, school, or face photo (COPPA minimisation).

CREATE TABLE child_profiles (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_account_id   UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    nickname            VARCHAR(30) NOT NULL,
    avatar_id           SMALLINT    NOT NULL CHECK (avatar_id >= 0),
    birth_year          SMALLINT    NOT NULL CHECK (birth_year BETWEEN 1980 AND 2020),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_child_profiles_parent ON child_profiles(parent_account_id);

-- Consent status is an enum-like varchar for readability and append-only migrations.
-- Valid values: 'pending' | 'granted' | 'revoked' | 'class_granted'
CREATE TABLE parental_consents (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id    UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    granted_at  TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_parental_consents_child_id   ON parental_consents(child_id);
CREATE INDEX idx_parental_consents_token_hash  ON parental_consents(token_hash);

CREATE TABLE classes (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_account_id  UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    class_code          VARCHAR(10)  NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_teacher ON classes(teacher_account_id);
CREATE INDEX idx_classes_code    ON classes(class_code);

CREATE TABLE class_memberships (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    child_id    UUID        NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, child_id)
);

CREATE INDEX idx_class_memberships_class ON class_memberships(class_id);
CREATE INDEX idx_class_memberships_child ON class_memberships(child_id);
