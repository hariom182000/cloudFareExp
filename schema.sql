CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'processing', -- processing | done | error
  error TEXT,
  stage TEXT,
  text TEXT,
  notes TEXT, -- JSON
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id TEXT NOT NULL,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_paper ON chat_messages(paper_id, id);
