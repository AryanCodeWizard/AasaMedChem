-- ─────────────────────────────────────────────
-- Migration: 001_initial.sql
-- AasaMedChem Inventory & Order Management
-- ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'seller'
                            CHECK (role IN ('admin', 'seller')),
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── Product Categories ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT  NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Units ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  code       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  dimension  TEXT NOT NULL
             CHECK (dimension IN ('weight', 'volume', 'count')),
  base_unit  TEXT NOT NULL,
  to_base    NUMERIC(18, 10) NOT NULL
             CHECK (to_base > 0)
);

-- Seed units
INSERT INTO units (code, label, dimension, base_unit, to_base) VALUES
  ('g',    'Grams',       'weight', 'g',    1),
  ('kg',   'Kilograms',   'weight', 'g',    1000),
  ('mL',   'Millilitres', 'volume', 'mL',   1),
  ('L',    'Litres',      'volume', 'mL',   1000),
  ('item', 'Items',       'count',  'item', 1)
ON CONFLICT (code) DO NOTHING;

-- ── Products ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT           NOT NULL,
  sku              TEXT           UNIQUE,
  description      TEXT,
  category_id      UUID           REFERENCES categories(id) ON DELETE SET NULL,
  base_unit        TEXT           NOT NULL REFERENCES units(code),
  allowed_units    TEXT[]         NOT NULL,
  price_per_base_unit NUMERIC(18, 6) NOT NULL CHECK (price_per_base_unit >= 0),
  stock_quantity   NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_alert  NUMERIC(20, 6) NOT NULL DEFAULT 0,
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  created_by       UUID           NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name      ON products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_base_unit ON products(base_unit);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ── Quotations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no   TEXT        NOT NULL UNIQUE,
  seller_id      UUID        NOT NULL REFERENCES users(id),
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  subtotal_inr   NUMERIC(18, 6) NOT NULL DEFAULT 0,
  total_inr      NUMERIC(18, 6) NOT NULL DEFAULT 0,
  notes          TEXT,
  admin_notes    TEXT,
  reviewed_by    UUID        REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_seller ON quotations(seller_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_no     ON quotations(quotation_no);

-- ── Quotation Line Items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotation_line_items (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id    UUID           NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id      UUID           NOT NULL REFERENCES products(id),
  ordered_unit    TEXT           NOT NULL REFERENCES units(code),
  ordered_qty     NUMERIC(20, 6) NOT NULL CHECK (ordered_qty > 0),
  base_unit       TEXT           NOT NULL REFERENCES units(code),
  base_qty        NUMERIC(20, 6) NOT NULL CHECK (base_qty > 0),
  unit_price_snapshot  NUMERIC(18, 6) NOT NULL,
  line_total_inr  NUMERIC(18, 6) NOT NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qli_quotation ON quotation_line_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_qli_product   ON quotation_line_items(product_id);

-- ── Audit Log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id),
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  payload     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_quotations_updated_at ON quotations;
CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Quotation number sequence ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS quotation_seq START 1;
