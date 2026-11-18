-- AcroLog sync: one row per person (latest snapshot only).
CREATE TABLE IF NOT EXISTS snaps (
  id TEXT PRIMARY KEY,       -- sync id = first 32 hex chars of sha256(key)
  key_hash TEXT NOT NULL,    -- full sha256(key); the key itself never leaves the phone except as a Bearer token
  data TEXT NOT NULL,        -- the snapshot JSON (same content as a share link)
  at TEXT NOT NULL,          -- snapshot time (ISO)
  updated INTEGER NOT NULL   -- server time of the last write (ms)
);
