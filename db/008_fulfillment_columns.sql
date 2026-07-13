ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS fulfillment_notes TEXT;
ALTER TABLE stock_request_lines ADD COLUMN IF NOT EXISTS fulfilled_qty NUMERIC(10,4);
