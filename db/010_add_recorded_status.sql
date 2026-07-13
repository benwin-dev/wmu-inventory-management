-- Expand status constraint
ALTER TABLE stock_requests
  DROP CONSTRAINT IF EXISTS stock_requests_status_check;

ALTER TABLE stock_requests
  ADD CONSTRAINT stock_requests_status_check
  CHECK (status IN ('submitted', 'fulfilled', 'partially_fulfilled', 'cancelled', 'recorded'));

-- Track who fulfilled and when
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS fulfilled_by TEXT;
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- Track who recorded and when
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS recorded_by TEXT;
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;
