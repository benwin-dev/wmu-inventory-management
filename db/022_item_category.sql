ALTER TABLE items
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'food'
  CHECK (category IN ('food', 'nonfood', 'produce'));
