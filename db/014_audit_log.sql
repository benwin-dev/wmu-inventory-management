CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_email TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx      ON audit_log (actor_email);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx     ON audit_log (entity_type, entity_id);
