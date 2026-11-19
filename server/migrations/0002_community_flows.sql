-- AcroLog community flows (flows people publish for everyone). Safe to run more than once.
-- Apply: npx wrangler d1 execute acrolog --remote --file migrations/0002_community_flows.sql   (see server/README.md)

CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY,                 -- "c" + 15 hex chars, made by the server
  author TEXT NOT NULL,                -- sync id of the author = first 32 hex chars of sha256(key); never returned by the API
  data TEXT NOT NULL,                  -- the validated flow JSON (name, desc, type, level, steps, video, tag, by, lang); "{}" once gone
  state TEXT NOT NULL DEFAULT 'live',  -- live | hidden (reports or moderator) | deleted (author or moderator)
  reports INTEGER NOT NULL DEFAULT 0,  -- distinct reporters (by network) since the last moderator review
  created INTEGER NOT NULL,            -- server time (ms)
  updated INTEGER NOT NULL             -- server time (ms) of the last change, including hide/delete (clients sync on it)
);
CREATE INDEX IF NOT EXISTS flows_updated ON flows (updated, id);
CREATE INDEX IF NOT EXISTS flows_author ON flows (author);

-- One row per reporter and flow. ip = sha256(day + client IP) so one person with many keys counts once a day.
CREATE TABLE IF NOT EXISTS flow_reports (
  flow_id TEXT NOT NULL,
  reporter TEXT NOT NULL,              -- reporter's sync id
  ip TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL,
  PRIMARY KEY (flow_id, reporter)
);

-- Rate limits. who = an author/reporter sync id, or "ip:" + sha256(day + client IP). Rows reset each UTC day.
CREATE TABLE IF NOT EXISTS limits (
  who TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- write | report
  day TEXT NOT NULL,                   -- YYYY-MM-DD (UTC)
  n INTEGER NOT NULL DEFAULT 0,
  last INTEGER NOT NULL DEFAULT 0,     -- ms of the last counted action
  PRIMARY KEY (who, kind)
);
