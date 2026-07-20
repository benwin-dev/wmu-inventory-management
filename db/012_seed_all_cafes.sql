INSERT INTO cafes (code, name, active) VALUES
  ('BELLA_VITA',  'Bella Vita Cafe',  TRUE),
  ('PLAZA',       'Plaza Cafe',       TRUE),
  ('FLOSSIES',    'Flossie''s Cafe',  TRUE),
  ('SCHNEIDER',   'Schneider Cafe',   TRUE),
  ('BOOKMARK',    'Bookmark Cafe',    TRUE),
  ('BISTRO_BTL',  'Bistro BTL',       TRUE)
ON CONFLICT (code) DO NOTHING;
