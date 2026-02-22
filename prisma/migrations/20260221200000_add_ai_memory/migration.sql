-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Memory table for layered long-term memory
CREATE TABLE ai_memories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  layer TEXT NOT NULL CHECK (layer IN ('episodic', 'semantic', 'strategic')),
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  embedding vector(384),
  entity_type TEXT,
  entity_id TEXT,
  source_type TEXT NOT NULL DEFAULT 'chat',
  importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  access_count INT NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', summary || ' ' || content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_layer ON ai_memories (layer);
CREATE INDEX idx_memories_entity ON ai_memories (entity_type, entity_id);
CREATE INDEX idx_memories_source ON ai_memories (source_type);
CREATE INDEX idx_memories_importance ON ai_memories (importance DESC);
CREATE INDEX idx_memories_created ON ai_memories (created_at DESC);
CREATE INDEX idx_memories_embedding ON ai_memories USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_memories_fts ON ai_memories USING gin (search_vector);
