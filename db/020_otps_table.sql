CREATE TABLE IF NOT EXISTS otps (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  otp_hash      TEXT NOT NULL,
  salt          TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otps_email_idx ON otps (email);
CREATE INDEX IF NOT EXISTS otps_expires_at_idx ON otps (expires_at);
