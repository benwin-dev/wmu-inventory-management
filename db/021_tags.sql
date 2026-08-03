CREATE TABLE IF NOT EXISTS tags (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS item_tags_tag_idx ON item_tags (tag_id);

-- Seed first tag
INSERT INTO tags (name, slug) VALUES ('Daily Count', 'daily-count')
ON CONFLICT (slug) DO NOTHING;
