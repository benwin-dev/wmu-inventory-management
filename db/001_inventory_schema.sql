BEGIN;

CREATE TABLE IF NOT EXISTS cafes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('main_hub','cafe')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  location_id BIGINT NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  on_hand_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (location_id, item_id)
);

CREATE TABLE IF NOT EXISTS stock_requests (
  id BIGSERIAL PRIMARY KEY,
  cafe_id BIGINT NOT NULL REFERENCES cafes(id) ON DELETE RESTRICT,
  request_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','fulfilled','closed')) DEFAULT 'draft',
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  fulfilled_by TEXT,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_request_lines (
  id BIGSERIAL PRIMARY KEY,
  stock_request_id BIGINT NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  requested_qty NUMERIC(14,3) NOT NULL CHECK (requested_qty >= 0),
  fulfilled_qty NUMERIC(14,3) CHECK (fulfilled_qty >= 0),
  fulfillment_status TEXT CHECK (fulfillment_status IN ('as_requested','different_amount','unavailable')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stock_request_id, item_id)
);

CREATE TABLE IF NOT EXISTS item_prices (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price_per_unit NUMERIC(14,4) NOT NULL CHECK (price_per_unit >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS charge_lines (
  id BIGSERIAL PRIMARY KEY,
  stock_request_line_id BIGINT NOT NULL REFERENCES stock_request_lines(id) ON DELETE CASCADE,
  qty_charged NUMERIC(14,3) NOT NULL CHECK (qty_charged >= 0),
  unit_price_used NUMERIC(14,4) NOT NULL CHECK (unit_price_used >= 0),
  line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  location_id BIGINT NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  txn_type TEXT NOT NULL CHECK (txn_type IN ('delivery_in','fulfillment_out','adjustment')),
  qty_delta NUMERIC(14,3) NOT NULL,
  reference_type TEXT,
  reference_id BIGINT,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_requests_cafe_date
  ON stock_requests(cafe_id, request_date);

CREATE INDEX IF NOT EXISTS idx_stock_request_lines_request
  ON stock_request_lines(stock_request_id);

CREATE INDEX IF NOT EXISTS idx_item_prices_item_effective
  ON item_prices(item_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_charge_lines_request_line
  ON charge_lines(stock_request_line_id);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_loc_item_created
  ON inventory_transactions(location_id, item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_txn_reference
  ON inventory_transactions(reference_type, reference_id);

-- Ensure exactly one main hub row can exist.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_main_hub
  ON inventory_locations((location_type))
  WHERE location_type = 'main_hub';

COMMIT;
