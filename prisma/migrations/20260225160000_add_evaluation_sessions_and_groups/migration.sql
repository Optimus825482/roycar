-- Değerlendirme Oturumları
CREATE TABLE evaluation_sessions (
  id BIGSERIAL PRIMARY KEY,
  label TEXT,
  description TEXT,
  criteria JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aday Grupları
CREATE TABLE candidate_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aday Grup Üyeleri
CREATE TABLE candidate_group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES candidate_groups(id) ON DELETE CASCADE,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  evaluation_session_id BIGINT REFERENCES evaluation_sessions(id) ON DELETE SET NULL,
  evaluation_id BIGINT REFERENCES evaluations(id) ON DELETE SET NULL,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, application_id)
);

CREATE INDEX idx_candidate_group_members_group ON candidate_group_members(group_id);
CREATE INDEX idx_candidate_group_members_app ON candidate_group_members(application_id);
CREATE INDEX idx_candidate_group_members_session ON candidate_group_members(evaluation_session_id);

-- Evaluations tablosuna session_id ekle
ALTER TABLE evaluations ADD COLUMN session_id BIGINT REFERENCES evaluation_sessions(id) ON DELETE SET NULL;
CREATE INDEX idx_evaluations_session ON evaluations(session_id);
