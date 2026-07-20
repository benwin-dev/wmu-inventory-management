ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS requested_by_name TEXT;
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS fulfilled_by_name TEXT;
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS recorded_by_name TEXT;
