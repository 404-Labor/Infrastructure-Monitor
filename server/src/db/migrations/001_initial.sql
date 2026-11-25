CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  settings_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  client_fingerprint_id TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT NOT NULL,
  browser TEXT NOT NULL,
  browser_version TEXT NOT NULL,
  os TEXT NOT NULL,
  os_version TEXT NOT NULL,
  device_type TEXT NOT NULL,
  viewport TEXT NOT NULL,
  connection_type TEXT,
  language TEXT NOT NULL,
  timezone TEXT NOT NULL,
  country TEXT,
  isp TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_client
  ON sessions(project_id, client_fingerprint_id);

CREATE INDEX IF NOT EXISTS idx_sessions_last_seen
  ON sessions(last_seen_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT NOT NULL,
  severity TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  timestamp TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_session_timestamp
  ON events(session_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_events_type_category
  ON events(type, category);

CREATE TABLE IF NOT EXISTS vitals_aggregated (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  lcp_p75 REAL,
  inp_p75 REAL,
  cls_p75 REAL,
  ttfb_p75 REAL,
  fcp_p75 REAL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
