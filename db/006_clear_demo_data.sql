BEGIN;

-- Remove demo transactional data, keeping items/prices/balances intact

DELETE FROM charge_lines;
DELETE FROM stock_request_lines;
DELETE FROM stock_requests;
DELETE FROM inventory_transactions;
DELETE FROM inventory_locations WHERE location_type = 'cafe';
DELETE FROM cafes;

COMMIT;
