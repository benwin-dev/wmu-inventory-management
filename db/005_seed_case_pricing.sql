BEGIN;

-- Update case_size on items
UPDATE items SET case_size = v.case_size
FROM (VALUES
  ('POP-20OZ',                    'case'),
  ('DOLE-LEMONADE-20OZ',          'case'),
  ('BB-5-GAL',                    'each'),
  ('BIB-3-GAL-GATORADE',          'each'),
  ('CO2-TANK',                    'each'),
  ('KICKSTART-16OZ',              'case(12)'),
  ('LIPTON-PURELEAF-18-5OZ',      'case(12)'),
  ('MUSCLE-MILK-14OZ',            'case(12)'),
  ('AMP-16OZ',                    'case(12)'),
  ('CELSIUS-12OZ',                'case(12)'),
  ('ROCKSTAR-ORIG-16OZ',          'case(24)'),
  ('FAST-TWITCH',                 'case(12)'),
  ('GAME-FUEL',                   'case(24)'),
  ('PROPEL-20OZ',                 'case(24)'),
  ('GATORADE-20OZ',               'case(24)'),
  ('GATORADE-24OZ',               'case(24)'),
  ('GATORADE-28OZ',               'case(15)'),
  ('GATORLITE',                   'case(12)'),
  ('AQUAFINA-20OZ',               'case(24)'),
  ('AQUAFINA-1L',                 'case(15)'),
  ('DISTILLED-GALLON',            'case(6)'),
  ('BUBLY-SPARKLING',             'case(12)'),
  ('NAKED-JUICE',                 'case(8)'),
  ('KEVITA-KOMBUCHA',             'case(12)'),
  ('BRISK-TEA-1L',                'case(15)'),
  ('PINK-DRINK-PARADISE-12CS',    'case(12)'),
  ('DOUBLE-SHOT-STARBUCKS-6-5OZ', 'case(24)'),
  ('TRIPLE-SHOT-STARBUCKS-15OZ',  'case(12)'),
  ('ENERGY-DOUBLE-SHOT-15OZ',     'case(12)')
) AS v(sku, case_size)
WHERE items.sku = v.sku;

-- Update case_price on the current active item_prices row
UPDATE item_prices SET case_price = v.case_price
FROM (VALUES
  ('POP-20OZ',                    25.56::numeric),
  ('DOLE-LEMONADE-20OZ',          25.56::numeric),
  ('BB-5-GAL',                    70.15::numeric),
  ('BIB-3-GAL-GATORADE',          46.05::numeric),
  ('CO2-TANK',                    20.50::numeric),
  ('KICKSTART-16OZ',              18.27::numeric),
  ('LIPTON-PURELEAF-18-5OZ',      21.62::numeric),
  ('MUSCLE-MILK-14OZ',            32.00::numeric),
  ('AMP-16OZ',                    20.03::numeric),
  ('CELSIUS-12OZ',                26.40::numeric),
  ('ROCKSTAR-ORIG-16OZ',          22.78::numeric),
  ('FAST-TWITCH',                 21.00::numeric),
  ('GAME-FUEL',                   25.56::numeric),
  ('PROPEL-20OZ',                 14.31::numeric),
  ('GATORADE-20OZ',               25.76::numeric),
  ('GATORADE-24OZ',               37.49::numeric),
  ('GATORADE-28OZ',               28.30::numeric),
  ('GATORLITE',                   34.35::numeric),
  ('AQUAFINA-20OZ',               16.00::numeric),
  ('AQUAFINA-1L',                 18.55::numeric),
  ('DISTILLED-GALLON',             7.17::numeric),
  ('BUBLY-SPARKLING',             12.03::numeric),
  ('NAKED-JUICE',                 22.82::numeric),
  ('KEVITA-KOMBUCHA',             26.40::numeric),
  ('BRISK-TEA-1L',                19.49::numeric),
  ('PINK-DRINK-PARADISE-12CS',    30.81::numeric),
  ('DOUBLE-SHOT-STARBUCKS-6-5OZ', 31.56::numeric),
  ('TRIPLE-SHOT-STARBUCKS-15OZ',  28.41::numeric),
  ('ENERGY-DOUBLE-SHOT-15OZ',     32.73::numeric)
) AS v(sku, case_price)
JOIN items i ON i.sku = v.sku
WHERE item_prices.item_id = i.id
  AND item_prices.effective_to IS NULL;

COMMIT;
