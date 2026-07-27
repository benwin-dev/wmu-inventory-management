INSERT INTO cafes (code, name, active)
VALUES ('CAFE_1903', 'Cafe 1903', TRUE)
ON CONFLICT (code) DO NOTHING;
