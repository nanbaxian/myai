-- schema-d1-memory-chat.sql
-- D1 tables that cover chat history, memory, plans and settings.
-- Apply with:
--   npx wrangler d1 execute myai --remote --file schema-d1-memory-chat.sql

-- messages was created by schema-d1-knowledgeos.sql with conversation_id NOT NULL.
-- Chat history stores messages by session_id, so the table is rebuilt.
-- It was empty when this was written; check before re-running on populated data.
DROP TABLE IF EXISTS messages;

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  session_id TEXT,
  persona_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  image_url TEXT,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  memory_tier TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '新对话',
  persona_id TEXT,
  session_type TEXT NOT NULL DEFAULT 'text',
  last_message_preview TEXT NOT NULL DEFAULT '',
  last_message_at TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_order ON chat_sessions (is_pinned DESC, last_message_at DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS core_memories (
  id TEXT PRIMARY KEY,
  fact TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  importance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_snapshots (
  id TEXT PRIMARY KEY,
  tier TEXT NOT NULL,
  summary_text TEXT NOT NULL DEFAULT '',
  key_facts TEXT NOT NULL DEFAULT '[]',
  emotional_tone TEXT NOT NULL DEFAULT '',
  clarity_score REAL NOT NULL DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS user_plans (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  updated_at TEXT NOT NULL
);
