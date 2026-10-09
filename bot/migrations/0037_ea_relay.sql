-- EA blocks the Worker's network, so a name search the site data can't answer is relayed through a GitHub Actions job
-- (.github/workflows/ea-relay.yml → scripts/ea-relay.mjs → POST /api/burners/relay). One row per waiting Discord reply;
-- the interaction token only ever lives here (never in the workflow inputs) and the row is deleted once answered.
CREATE TABLE IF NOT EXISTS ea_relay (
  ref TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  q TEXT NOT NULL,
  token TEXT NOT NULL,
  app_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
