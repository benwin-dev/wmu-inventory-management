CREATE TABLE IF NOT EXISTS user_roles (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'commissary', 'cafe', 'driver')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed admin
INSERT INTO user_roles (email, role)
VALUES ('benwin.george@wmich.edu', 'admin')
ON CONFLICT (email) DO NOTHING;
