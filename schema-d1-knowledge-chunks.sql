-- schema-d1-knowledge-chunks.sql
-- Chunk store for the knowledge base (functions/api/knowledge/ingest.ts, lib/kb/retrieve.ts).
-- Requires the documents table from schema-d1-knowledgeos.sql.
-- Apply with:
--   npx wrangler d1 execute myai --remote --file schema-d1-knowledge-chunks.sql

CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_num INTEGER,
  section TEXT,
  embedding TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant ON document_chunks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks (document_id);
