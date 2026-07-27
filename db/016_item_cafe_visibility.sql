CREATE TABLE IF NOT EXISTS item_cafe_visibility (
  item_id  INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  cafe_id  INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, cafe_id)
);

CREATE INDEX IF NOT EXISTS item_cafe_visibility_cafe_idx ON item_cafe_visibility (cafe_id);
