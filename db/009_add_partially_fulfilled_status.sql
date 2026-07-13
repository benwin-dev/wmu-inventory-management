ALTER TABLE stock_requests
  DROP CONSTRAINT IF EXISTS stock_requests_status_check;

ALTER TABLE stock_requests
  ADD CONSTRAINT stock_requests_status_check
  CHECK (status IN ('submitted', 'fulfilled', 'partially_fulfilled', 'cancelled'));
