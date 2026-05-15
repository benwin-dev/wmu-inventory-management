BEGIN;

-- 1) Locations
INSERT INTO inventory_locations (code, name, location_type, active)
VALUES
  ('VALLEY2', 'Valley 2', 'main_hub', TRUE)
ON CONFLICT (code) DO NOTHING;

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

-- 3) Minimal item master
INSERT INTO items (sku, name, unit_type, active)
VALUES
  ('DOLE-LEMONADE-20OZ', 'Dole Lemonade 20oz', 'each', TRUE),
  ('ROCKSTAR-ORIG-16OZ', 'Rockstar Energy Original 16oz', 'each', TRUE),
  ('AQUAFINA-20OZ', 'Aquafina 20oz', 'each', TRUE),
  ('APPLE-EACH', 'Apple', 'each', TRUE),
  ('BAG-SANDWICH-300', 'Bag Reclosable Sandwich 300ct', 'case', TRUE)
ON CONFLICT (sku) DO NOTHING;

-- 4) Current prices
INSERT INTO item_prices (item_id, price_per_unit, effective_from, effective_to)
SELECT i.id, v.price_per_unit, DATE '2026-05-01', NULL
FROM (
  VALUES
    ('DOLE-LEMONADE-20OZ', 1.0650::numeric),
    ('ROCKSTAR-ORIG-16OZ', 2.2500::numeric),
    ('AQUAFINA-20OZ', 0.9500::numeric),
    ('APPLE-EACH', 0.7000::numeric),
    ('BAG-SANDWICH-300', 52.1700::numeric)
) AS v(sku, price_per_unit)
JOIN items i ON i.sku = v.sku
WHERE NOT EXISTS (
  SELECT 1 FROM item_prices p
  WHERE p.item_id = i.id
    AND p.effective_from = DATE '2026-05-01'
);

-- 5) Initial Valley 2 on-hand balances
INSERT INTO inventory_balances (location_id, item_id, on_hand_qty)
SELECT l.id, i.id, v.qty
FROM inventory_locations l
JOIN (
  VALUES
    ('DOLE-LEMONADE-20OZ', 120.000::numeric),
    ('ROCKSTAR-ORIG-16OZ', 90.000::numeric),
    ('AQUAFINA-20OZ', 200.000::numeric),
    ('APPLE-EACH', 75.000::numeric),
    ('BAG-SANDWICH-300', 6.000::numeric)
) AS v(sku, qty) ON TRUE
JOIN items i ON i.sku = v.sku
WHERE l.code = 'VALLEY2'
ON CONFLICT (location_id, item_id)
DO UPDATE SET on_hand_qty = EXCLUDED.on_hand_qty, updated_at = NOW();

-- 6) Delivery-in transactions backing demo inventory
INSERT INTO inventory_transactions (item_id, location_id, txn_type, qty_delta, reference_type, reference_id, note, created_by)
SELECT i.id, l.id, 'delivery_in', v.qty, 'seed_demo', 1, 'Initial demo stock', 'seed'
FROM inventory_locations l
JOIN (
  VALUES
    ('DOLE-LEMONADE-20OZ', 120.000::numeric),
    ('ROCKSTAR-ORIG-16OZ', 90.000::numeric),
    ('AQUAFINA-20OZ', 200.000::numeric),
    ('APPLE-EACH', 75.000::numeric),
    ('BAG-SANDWICH-300', 6.000::numeric)
) AS v(sku, qty) ON TRUE
JOIN items i ON i.sku = v.sku
WHERE l.code = 'VALLEY2'
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
    ('APPLE-EACH', 20.000::numeric, 0.000::numeric, 'unavailable'::text, 'Out of stock')
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

-- 9) Fulfillment-out inventory transactions + rebalance Valley 2
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
JOIN inventory_locations l ON l.code = 'VALLEY2'
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
  WHERE l.code = 'VALLEY2'
  GROUP BY t.location_id, t.item_id
) x
WHERE b.location_id = x.location_id
  AND b.item_id = x.item_id;

COMMIT;
