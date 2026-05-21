BEGIN;

-- 1) Locations
-- Convert existing main hub row to COMMISSARY if one already exists.
UPDATE inventory_locations
SET code = 'COMMISSARY',
    name = 'Commissary',
    active = TRUE,
    updated_at = NOW()
WHERE location_type = 'main_hub'
  AND code <> 'COMMISSARY';

-- If no main hub exists yet, create COMMISSARY.
INSERT INTO inventory_locations (code, name, location_type, active)
SELECT 'COMMISSARY', 'Commissary', 'main_hub', TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_locations
  WHERE location_type = 'main_hub'
);

-- Remove legacy VALLEY2 location data if present.
DELETE FROM inventory_transactions t
USING inventory_locations l
WHERE t.location_id = l.id
  AND l.code = 'VALLEY2';

DELETE FROM inventory_balances b
USING inventory_locations l
WHERE b.location_id = l.id
  AND l.code = 'VALLEY2';

DELETE FROM inventory_locations
WHERE code = 'VALLEY2';

-- 2) Cafes
INSERT INTO cafes (code, name, active)
VALUES
  ('PARKVIEW', 'Parkview', TRUE),
  ('BELLA_VITA', 'Bella Vita', TRUE),
  ('BOOKMARK', 'Bookmark', TRUE),
  ('FLOSSIES', 'Flossie''s', TRUE),
  ('SCHNEIDER', 'Schneider', TRUE),
  ('BISTRO', 'Bistro', TRUE),
  ('PLAZA', 'Plaza', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Optional cafe locations for future multi-location reporting.
INSERT INTO inventory_locations (code, name, location_type, active)
SELECT c.code, c.name, 'cafe', TRUE
FROM cafes c
ON CONFLICT (code) DO NOTHING;

-- 3) Master item list (Commissary)
INSERT INTO items (sku, name, unit_type, active)
VALUES
  ('POP-20OZ', 'Pop 20oz', 'each', TRUE),
  ('DOLE-LEMONADE-20OZ', 'Dole Lemonade 20oz', 'each', TRUE),
  ('BB-5-GAL', 'BB 5 gal', 'each', TRUE),
  ('BIB-3-GAL-GATORADE', 'BIB 3 gal Gatorade', 'each', TRUE),
  ('CO2-TANK', 'CO2 tank', 'each', TRUE),
  ('KICKSTART-16OZ', 'Kickstart 16oz', 'each', TRUE),
  ('LIPTON-PURELEAF-18-5OZ', '18.5oz Lipton PureLeaf', 'each', TRUE),
  ('MUSCLE-MILK-14OZ', 'Muscle Milk 14oz', 'each', TRUE),
  ('AMP-16OZ', 'Amp 16oz', 'each', TRUE),
  ('CELSIUS-12OZ', 'Celsius', 'each', TRUE),
  ('ROCKSTAR-ORIG-16OZ', 'Rockstar Energy Original 16oz', 'each', TRUE),
  ('FAST-TWITCH', 'Fast Twitch', 'each', TRUE),
  ('GAME-FUEL', 'Game Fuel', 'each', TRUE),
  ('PROPEL-20OZ', 'Propel 20oz', 'each', TRUE),
  ('GATORADE-20OZ', 'Gatorade 20oz', 'each', TRUE),
  ('GATORADE-24OZ', 'Gatorade 24oz', 'each', TRUE),
  ('GATORADE-28OZ', 'Gatorade 28 oz', 'each', TRUE),
  ('GATORLITE', 'Gatorlite', 'each', TRUE),
  ('AQUAFINA-20OZ', 'Water Aquafina 20oz', 'each', TRUE),
  ('AQUAFINA-1L', 'Water Aquafina 1L', 'each', TRUE),
  ('DISTILLED-GALLON', 'Distilled Water Gallon', 'each', TRUE),
  ('BUBLY-SPARKLING', 'Bubly sparkling', 'each', TRUE),
  ('NAKED-JUICE', 'Naked juice', 'each', TRUE),
  ('KEVITA-KOMBUCHA', 'Kevita Kombucha', 'each', TRUE),
  ('BRISK-TEA-1L', 'Brisk tea 1L', 'each', TRUE),
  ('PINK-DRINK-PARADISE-12CS', 'Pink Drink/Paradise(yellow) 12cs', 'each', TRUE),
  ('DOUBLE-SHOT-STARBUCKS-6-5OZ', 'Double Shot Starbucks 6.5oz', 'each', TRUE),
  ('TRIPLE-SHOT-STARBUCKS-15OZ', 'Triple Shot Starbucks 15 oz', 'each', TRUE),
  ('ENERGY-DOUBLE-SHOT-15OZ', 'Energy double shot 15oz', 'each', TRUE),
  ('FRAPPUCCINO-GLASS-9-5OZ', 'Frappuccino glass 9.5 oz', 'each', TRUE),
  ('FRAPPUCCINO-13-7OZ', 'Frappuccino 13.7oz', 'each', TRUE),
  ('PROTEIN-DOUBLE-SHOT', 'Protein Double Shot', 'each', TRUE),
  ('NITRO-COLD-BREW', 'Nitro Cold Brew', 'each', TRUE),
  ('LIFE-WATER-700ML', 'Life water 700 mL', 'each', TRUE),
  ('LIFE-WATER-1L', 'Life water 1L', 'each', TRUE),
  ('TROPICANA-OJ', 'Tropicana OJ', 'each', TRUE),
  ('TROPICANA-APPLE', 'Tropicana Apple', 'each', TRUE),
  ('TROPICANA-LEMONADE', 'Tropicana lemonade', 'each', TRUE),
  ('GATORADE-BAR', 'Gatorade Bar', 'each', TRUE),
  ('HALF-HALF-CREAMER-BULK-3CS', '1/2 & 1/2 creamer bulk 3/cs', 'bag', TRUE),
  ('HALF-HALF-CREAMER', '1/2 & 1/2 creamer', 'tub', TRUE),
  ('FRENCH-VANILLA-CREAMER-PC', 'French vanilla creamer PC', 'each', TRUE),
  ('FRENCH-VANILLA-CREAMER-PUMP-2', 'French vanilla creamer pump (2)', 'each', TRUE),
  ('OAT-MILK-CREAMERS', 'Oat Milk Creamers', 'box', TRUE),
  ('SOY-MILK', 'Soy Milk', 'each', TRUE),
  ('FRUIT-FRESH', 'Fruit Fresh', 'each', TRUE),
  ('MILK-HALF-PINT', 'Milk 1/2pint', 'each', TRUE),
  ('HALF-GAL-MILK', 'Half Gal Milk', 'each', TRUE),
  ('GAL-MILK', 'Gal Milk', 'each', TRUE),
  ('MILK-14OZ', '14 oz Milk', 'each', TRUE),
  ('COTTAGE-CHEESE-CUP', 'Cottage Cheese cup', 'each', TRUE),
  ('WS-HOUSE-MEXICO', 'WS House Mexico', 'each', TRUE),
  ('WS-FRENCH-ROAST', 'WS French Roast', 'each', TRUE),
  ('WS-DECAF', 'WS Decaf', 'each', TRUE),
  ('HOT-CHOC-POWDER', 'Hot Choc Powder', 'box', TRUE),
  ('TEA', 'Tea', 'box', TRUE),
  ('BLACK-TEA-INV-10-BX-CS', 'Black Tea inv 10 bx/cs', 'box', TRUE),
  ('NUTRIGRAIN-BARS', 'Nutrigrain bars', 'box', TRUE),
  ('COOKIE-PUCK-CHOC-CHUNK', 'Cookie puck choc chunk', 'each', TRUE),
  ('PEANUT-BUTTER-CHOC-113CS', 'peanut butter choc 113cs', 'each', TRUE)
ON CONFLICT (sku) DO NOTHING;

-- 4) Current prices (per unit)
INSERT INTO item_prices (item_id, price_per_unit, effective_from, effective_to)
SELECT i.id, v.price_per_unit, DATE '2026-05-01', NULL
FROM (
  VALUES
    ('POP-20OZ', 1.0700::numeric),
    ('DOLE-LEMONADE-20OZ', 1.0650::numeric),
    ('BB-5-GAL', 70.1500::numeric),
    ('BIB-3-GAL-GATORADE', 46.0500::numeric),
    ('CO2-TANK', 20.5000::numeric),
    ('KICKSTART-16OZ', 1.5200::numeric),
    ('LIPTON-PURELEAF-18-5OZ', 1.8000::numeric),
    ('MUSCLE-MILK-14OZ', 2.6700::numeric),
    ('AMP-16OZ', 0.8300::numeric),
    ('CELSIUS-12OZ', 1.6300::numeric),
    ('ROCKSTAR-ORIG-16OZ', 2.2500::numeric),
    ('FAST-TWITCH', 1.7500::numeric),
    ('GAME-FUEL', 2.1300::numeric),
    ('PROPEL-20OZ', 1.1900::numeric),
    ('GATORADE-20OZ', 1.0700::numeric),
    ('GATORADE-24OZ', 1.5600::numeric),
    ('GATORADE-28OZ', 1.1800::numeric),
    ('GATORLITE', 2.8600::numeric),
    ('AQUAFINA-20OZ', 0.6700::numeric),
    ('AQUAFINA-1L', 1.2400::numeric),
    ('DISTILLED-GALLON', 1.2000::numeric),
    ('BUBLY-SPARKLING', 1.0000::numeric),
    ('NAKED-JUICE', 2.8500::numeric),
    ('BRISK-TEA-1L', 1.3000::numeric),
    ('TRIPLE-SHOT-STARBUCKS-15OZ', 2.8400::numeric),
    ('ENERGY-DOUBLE-SHOT-15OZ', 2.7300::numeric),
    ('FRAPPUCCINO-GLASS-9-5OZ', 7.5500::numeric),
    ('FRAPPUCCINO-13-7OZ', 2.9800::numeric),
    ('PROTEIN-DOUBLE-SHOT', 32.7300::numeric),
    ('NITRO-COLD-BREW', 2.4300::numeric),
    ('LIFE-WATER-700ML', 1.5800::numeric),
    ('LIFE-WATER-1L', 1.9700::numeric),
    ('TROPICANA-OJ', 1.5900::numeric),
    ('TROPICANA-APPLE', 1.6100::numeric),
    ('TROPICANA-LEMONADE', 1.5900::numeric),
    ('GATORADE-BAR', 1.8100::numeric),
    ('HALF-HALF-CREAMER-BULK-3CS', 15.5800::numeric),
    ('HALF-HALF-CREAMER', 3.5100::numeric),
    ('FRENCH-VANILLA-CREAMER-PC', 4.9400::numeric),
    ('FRENCH-VANILLA-CREAMER-PUMP-2', 15.9400::numeric),
    ('OAT-MILK-CREAMERS', 5.4800::numeric),
    ('SOY-MILK', 1.2300::numeric),
    ('FRUIT-FRESH', 0.3500::numeric),
    ('MILK-HALF-PINT', 0.3200::numeric),
    ('HALF-GAL-MILK', 2.5600::numeric),
    ('GAL-MILK', 3.1000::numeric),
    ('MILK-14OZ', 0.9500::numeric),
    ('COTTAGE-CHEESE-CUP', 0.5200::numeric),
    ('WS-HOUSE-MEXICO', 2.1500::numeric),
    ('WS-FRENCH-ROAST', 2.1500::numeric),
    ('WS-DECAF', 2.1900::numeric),
    ('HOT-CHOC-POWDER', 8.8400::numeric),
    ('TEA', 4.9200::numeric),
    ('BLACK-TEA-INV-10-BX-CS', 2.8300::numeric),
    ('NUTRIGRAIN-BARS', 4.9200::numeric),
    ('COOKIE-PUCK-CHOC-CHUNK', 0.5700::numeric)
) AS v(sku, price_per_unit)
JOIN items i ON i.sku = v.sku
WHERE NOT EXISTS (
  SELECT 1 FROM item_prices p
  WHERE p.item_id = i.id
    AND p.effective_from = DATE '2026-05-01'
);

-- 5) Initial Commissary on-hand balances
INSERT INTO inventory_balances (location_id, item_id, on_hand_qty)
SELECT l.id, i.id, v.qty
FROM inventory_locations l
JOIN (
  VALUES
    ('POP-20OZ', 120.000::numeric),
    ('DOLE-LEMONADE-20OZ', 120.000::numeric),
    ('BB-5-GAL', 8.000::numeric),
    ('BIB-3-GAL-GATORADE', 12.000::numeric),
    ('CO2-TANK', 6.000::numeric),
    ('KICKSTART-16OZ', 72.000::numeric),
    ('LIPTON-PURELEAF-18-5OZ', 60.000::numeric),
    ('MUSCLE-MILK-14OZ', 48.000::numeric),
    ('AMP-16OZ', 72.000::numeric),
    ('CELSIUS-12OZ', 72.000::numeric),
    ('ROCKSTAR-ORIG-16OZ', 90.000::numeric),
    ('FAST-TWITCH', 48.000::numeric),
    ('GAME-FUEL', 72.000::numeric),
    ('PROPEL-20OZ', 96.000::numeric),
    ('GATORADE-20OZ', 120.000::numeric),
    ('GATORADE-24OZ', 96.000::numeric),
    ('GATORADE-28OZ', 60.000::numeric),
    ('GATORLITE', 48.000::numeric),
    ('AQUAFINA-20OZ', 200.000::numeric),
    ('AQUAFINA-1L', 120.000::numeric),
    ('DISTILLED-GALLON', 36.000::numeric),
    ('BUBLY-SPARKLING', 72.000::numeric),
    ('NAKED-JUICE', 48.000::numeric),
    ('KEVITA-KOMBUCHA', 48.000::numeric),
    ('BRISK-TEA-1L', 72.000::numeric),
    ('PINK-DRINK-PARADISE-12CS', 24.000::numeric),
    ('DOUBLE-SHOT-STARBUCKS-6-5OZ', 72.000::numeric),
    ('TRIPLE-SHOT-STARBUCKS-15OZ', 60.000::numeric),
    ('ENERGY-DOUBLE-SHOT-15OZ', 60.000::numeric),
    ('FRAPPUCCINO-GLASS-9-5OZ', 48.000::numeric),
    ('FRAPPUCCINO-13-7OZ', 72.000::numeric),
    ('PROTEIN-DOUBLE-SHOT', 48.000::numeric),
    ('NITRO-COLD-BREW', 72.000::numeric),
    ('LIFE-WATER-700ML', 72.000::numeric),
    ('LIFE-WATER-1L', 72.000::numeric),
    ('TROPICANA-OJ', 72.000::numeric),
    ('TROPICANA-APPLE', 72.000::numeric),
    ('TROPICANA-LEMONADE', 72.000::numeric),
    ('GATORADE-BAR', 48.000::numeric),
    ('HALF-HALF-CREAMER-BULK-3CS', 18.000::numeric),
    ('HALF-HALF-CREAMER', 36.000::numeric),
    ('FRENCH-VANILLA-CREAMER-PC', 72.000::numeric),
    ('FRENCH-VANILLA-CREAMER-PUMP-2', 24.000::numeric),
    ('OAT-MILK-CREAMERS', 48.000::numeric),
    ('SOY-MILK', 60.000::numeric),
    ('FRUIT-FRESH', 120.000::numeric),
    ('MILK-HALF-PINT', 240.000::numeric),
    ('HALF-GAL-MILK', 36.000::numeric),
    ('GAL-MILK', 24.000::numeric),
    ('MILK-14OZ', 120.000::numeric),
    ('COTTAGE-CHEESE-CUP', 120.000::numeric),
    ('WS-HOUSE-MEXICO', 48.000::numeric),
    ('WS-FRENCH-ROAST', 48.000::numeric),
    ('WS-DECAF', 24.000::numeric),
    ('HOT-CHOC-POWDER', 24.000::numeric),
    ('TEA', 48.000::numeric),
    ('BLACK-TEA-INV-10-BX-CS', 48.000::numeric),
    ('NUTRIGRAIN-BARS', 48.000::numeric),
    ('COOKIE-PUCK-CHOC-CHUNK', 96.000::numeric),
    ('PEANUT-BUTTER-CHOC-113CS', 96.000::numeric)
) AS v(sku, qty) ON TRUE
JOIN items i ON i.sku = v.sku
WHERE l.code = 'COMMISSARY'
ON CONFLICT (location_id, item_id)
DO UPDATE SET on_hand_qty = EXCLUDED.on_hand_qty, updated_at = NOW();

-- 6) Delivery-in transactions backing initial inventory
INSERT INTO inventory_transactions (item_id, location_id, txn_type, qty_delta, reference_type, reference_id, note, created_by)
SELECT i.id, l.id, 'delivery_in', v.qty, 'seed_demo', 1, 'Initial demo stock', 'seed'
FROM inventory_locations l
JOIN (
  VALUES
    ('POP-20OZ', 120.000::numeric),
    ('DOLE-LEMONADE-20OZ', 120.000::numeric),
    ('BB-5-GAL', 8.000::numeric),
    ('BIB-3-GAL-GATORADE', 12.000::numeric),
    ('CO2-TANK', 6.000::numeric),
    ('KICKSTART-16OZ', 72.000::numeric),
    ('LIPTON-PURELEAF-18-5OZ', 60.000::numeric),
    ('MUSCLE-MILK-14OZ', 48.000::numeric),
    ('AMP-16OZ', 72.000::numeric),
    ('CELSIUS-12OZ', 72.000::numeric),
    ('ROCKSTAR-ORIG-16OZ', 90.000::numeric),
    ('FAST-TWITCH', 48.000::numeric),
    ('GAME-FUEL', 72.000::numeric),
    ('PROPEL-20OZ', 96.000::numeric),
    ('GATORADE-20OZ', 120.000::numeric),
    ('GATORADE-24OZ', 96.000::numeric),
    ('GATORADE-28OZ', 60.000::numeric),
    ('GATORLITE', 48.000::numeric),
    ('AQUAFINA-20OZ', 200.000::numeric),
    ('AQUAFINA-1L', 120.000::numeric),
    ('DISTILLED-GALLON', 36.000::numeric),
    ('BUBLY-SPARKLING', 72.000::numeric),
    ('NAKED-JUICE', 48.000::numeric),
    ('KEVITA-KOMBUCHA', 48.000::numeric),
    ('BRISK-TEA-1L', 72.000::numeric),
    ('PINK-DRINK-PARADISE-12CS', 24.000::numeric),
    ('DOUBLE-SHOT-STARBUCKS-6-5OZ', 72.000::numeric),
    ('TRIPLE-SHOT-STARBUCKS-15OZ', 60.000::numeric),
    ('ENERGY-DOUBLE-SHOT-15OZ', 60.000::numeric),
    ('FRAPPUCCINO-GLASS-9-5OZ', 48.000::numeric),
    ('FRAPPUCCINO-13-7OZ', 72.000::numeric),
    ('PROTEIN-DOUBLE-SHOT', 48.000::numeric),
    ('NITRO-COLD-BREW', 72.000::numeric),
    ('LIFE-WATER-700ML', 72.000::numeric),
    ('LIFE-WATER-1L', 72.000::numeric),
    ('TROPICANA-OJ', 72.000::numeric),
    ('TROPICANA-APPLE', 72.000::numeric),
    ('TROPICANA-LEMONADE', 72.000::numeric),
    ('GATORADE-BAR', 48.000::numeric),
    ('HALF-HALF-CREAMER-BULK-3CS', 18.000::numeric),
    ('HALF-HALF-CREAMER', 36.000::numeric),
    ('FRENCH-VANILLA-CREAMER-PC', 72.000::numeric),
    ('FRENCH-VANILLA-CREAMER-PUMP-2', 24.000::numeric),
    ('OAT-MILK-CREAMERS', 48.000::numeric),
    ('SOY-MILK', 60.000::numeric),
    ('FRUIT-FRESH', 120.000::numeric),
    ('MILK-HALF-PINT', 240.000::numeric),
    ('HALF-GAL-MILK', 36.000::numeric),
    ('GAL-MILK', 24.000::numeric),
    ('MILK-14OZ', 120.000::numeric),
    ('COTTAGE-CHEESE-CUP', 120.000::numeric),
    ('WS-HOUSE-MEXICO', 48.000::numeric),
    ('WS-FRENCH-ROAST', 48.000::numeric),
    ('WS-DECAF', 24.000::numeric),
    ('HOT-CHOC-POWDER', 24.000::numeric),
    ('TEA', 48.000::numeric),
    ('BLACK-TEA-INV-10-BX-CS', 48.000::numeric),
    ('NUTRIGRAIN-BARS', 48.000::numeric),
    ('COOKIE-PUCK-CHOC-CHUNK', 96.000::numeric),
    ('PEANUT-BUTTER-CHOC-113CS', 96.000::numeric)
) AS v(sku, qty) ON TRUE
JOIN items i ON i.sku = v.sku
WHERE l.code = 'COMMISSARY'
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_transactions t
    WHERE t.item_id = i.id
      AND t.location_id = l.id
      AND t.reference_type = 'seed_demo'
      AND t.reference_id = 1
  );

-- 7) One sample cafe request (Parkview) and fulfillment
WITH parkview AS (
  SELECT id FROM cafes WHERE code = 'PARKVIEW'
),
ins_req AS (
  INSERT INTO stock_requests (
    cafe_id, request_date, status, submitted_by, submitted_at, fulfilled_by, fulfilled_at
  )
  SELECT p.id, DATE '2026-05-06', 'fulfilled', 'parkview_manager', NOW(), 'valley2_stock_1', NOW()
  FROM parkview p
  WHERE NOT EXISTS (
    SELECT 1
    FROM stock_requests r
    WHERE r.cafe_id = p.id
      AND r.request_date = DATE '2026-05-06'
      AND r.submitted_by = 'parkview_manager'
  )
  RETURNING id
),
req_id AS (
  SELECT id FROM ins_req
  UNION ALL
  SELECT r.id
  FROM stock_requests r
  JOIN parkview p ON p.id = r.cafe_id
  WHERE r.request_date = DATE '2026-05-06'
    AND r.submitted_by = 'parkview_manager'
  LIMIT 1
)
INSERT INTO stock_request_lines (stock_request_id, item_id, requested_qty, fulfilled_qty, fulfillment_status, note)
SELECT r.id, i.id, v.requested_qty, v.fulfilled_qty, v.status, v.note
FROM req_id r
JOIN (
  VALUES
    ('DOLE-LEMONADE-20OZ', 12.000::numeric, 12.000::numeric, 'as_requested'::text, NULL::text),
    ('ROCKSTAR-ORIG-16OZ', 10.000::numeric, 8.000::numeric, 'different_amount'::text, 'Shorted by 2'),
    ('AQUAFINA-20OZ', 20.000::numeric, 0.000::numeric, 'unavailable'::text, 'Out of stock')
) AS v(sku, requested_qty, fulfilled_qty, status, note) ON TRUE
JOIN items i ON i.sku = v.sku
ON CONFLICT (stock_request_id, item_id)
DO UPDATE SET
  requested_qty = EXCLUDED.requested_qty,
  fulfilled_qty = EXCLUDED.fulfilled_qty,
  fulfillment_status = EXCLUDED.fulfillment_status,
  note = EXCLUDED.note,
  updated_at = NOW();

-- 8) Charge lines from latest price
INSERT INTO charge_lines (stock_request_line_id, qty_charged, unit_price_used, line_total)
SELECT srl.id,
       COALESCE(srl.fulfilled_qty,0) AS qty_charged,
       p.price_per_unit,
       ROUND((COALESCE(srl.fulfilled_qty,0) * p.price_per_unit)::numeric, 2) AS line_total
FROM stock_request_lines srl
JOIN stock_requests sr ON sr.id = srl.stock_request_id
JOIN cafes c ON c.id = sr.cafe_id
JOIN LATERAL (
  SELECT ip.price_per_unit
  FROM item_prices ip
  WHERE ip.item_id = srl.item_id
    AND ip.effective_from <= sr.request_date
    AND (ip.effective_to IS NULL OR ip.effective_to >= sr.request_date)
  ORDER BY ip.effective_from DESC
  LIMIT 1
) p ON TRUE
WHERE c.code = 'PARKVIEW'
  AND sr.request_date = DATE '2026-05-06'
  AND NOT EXISTS (
    SELECT 1 FROM charge_lines cl WHERE cl.stock_request_line_id = srl.id
  );

-- 9) Fulfillment-out inventory transactions + rebalance Commissary
INSERT INTO inventory_transactions (item_id, location_id, txn_type, qty_delta, reference_type, reference_id, note, created_by)
SELECT srl.item_id,
       l.id,
       'fulfillment_out',
       -COALESCE(srl.fulfilled_qty,0),
       'stock_request_line',
       srl.id,
       'Demo fulfillment to Parkview',
       'seed'
FROM stock_request_lines srl
JOIN stock_requests sr ON sr.id = srl.stock_request_id
JOIN cafes c ON c.id = sr.cafe_id
JOIN inventory_locations l ON l.code = 'COMMISSARY'
WHERE c.code = 'PARKVIEW'
  AND sr.request_date = DATE '2026-05-06'
  AND COALESCE(srl.fulfilled_qty,0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_transactions t
    WHERE t.reference_type = 'stock_request_line'
      AND t.reference_id = srl.id
      AND t.txn_type = 'fulfillment_out'
  );

UPDATE inventory_balances b
SET on_hand_qty = x.new_qty,
    updated_at = NOW()
FROM (
  SELECT t.location_id, t.item_id, COALESCE(SUM(t.qty_delta),0) AS new_qty
  FROM inventory_transactions t
  JOIN inventory_locations l ON l.id = t.location_id
  WHERE l.code = 'COMMISSARY'
  GROUP BY t.location_id, t.item_id
) x
WHERE b.location_id = x.location_id
  AND b.item_id = x.item_id;

COMMIT;
