BEGIN;

CREATE OR REPLACE VIEW v_valley2_on_hand AS
SELECT
  l.code AS location_code,
  l.name AS location_name,
  i.sku,
  i.name AS item_name,
  i.unit_type,
  b.on_hand_qty,
  b.updated_at
FROM inventory_balances b
JOIN inventory_locations l ON l.id = b.location_id
JOIN items i ON i.id = b.item_id
WHERE l.code = 'VALLEY2'
ORDER BY i.name;

CREATE OR REPLACE VIEW v_daily_cafe_charges AS
SELECT
  sr.request_date,
  c.code AS cafe_code,
  c.name AS cafe_name,
  sr.id AS stock_request_id,
  sr.status,
  COALESCE(SUM(cl.line_total), 0)::numeric(14,2) AS total_charge
FROM stock_requests sr
JOIN cafes c ON c.id = sr.cafe_id
LEFT JOIN stock_request_lines srl ON srl.stock_request_id = sr.id
LEFT JOIN charge_lines cl ON cl.stock_request_line_id = srl.id
GROUP BY sr.request_date, c.code, c.name, sr.id, sr.status
ORDER BY sr.request_date DESC, c.name;

CREATE OR REPLACE VIEW v_request_line_details AS
SELECT
  sr.request_date,
  c.name AS cafe_name,
  sr.id AS stock_request_id,
  i.sku,
  i.name AS item_name,
  srl.requested_qty,
  srl.fulfilled_qty,
  srl.fulfillment_status,
  COALESCE(cl.unit_price_used, 0)::numeric(14,4) AS unit_price_used,
  COALESCE(cl.line_total, 0)::numeric(14,2) AS line_total
FROM stock_request_lines srl
JOIN stock_requests sr ON sr.id = srl.stock_request_id
JOIN cafes c ON c.id = sr.cafe_id
JOIN items i ON i.id = srl.item_id
LEFT JOIN charge_lines cl ON cl.stock_request_line_id = srl.id
ORDER BY sr.request_date DESC, c.name, i.name;

COMMIT;
