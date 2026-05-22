-- YSY Market CRM - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Products / Inventory
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otro',
  sale_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC,           -- null = sin costo registrado
  cost_has_iva BOOLEAN DEFAULT true,
  stock_current INTEGER NOT NULL DEFAULT 0,
  stock_min INTEGER NOT NULL DEFAULT 5,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',  -- Efectivo | Debito | Transfer.
  is_historical BOOLEAN DEFAULT false,              -- true = cargada desde historicos
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Items (detail lines)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);

-- Purchases (restock)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  has_iva BOOLEAN DEFAULT true,
  is_historical BOOLEAN DEFAULT false,
  supplier TEXT DEFAULT 'Otro',
  document_type TEXT DEFAULT 'Factura',  -- Factura | Boleta
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses (gastos)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,       -- Electricidad, Agua, Arriendo, etc.
  document_type TEXT DEFAULT 'Factura',
  has_iva BOOLEAN DEFAULT true,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, for multi-tenant use)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Public policies (single-user app – adjust if multi-tenant needed)
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON expenses FOR ALL USING (true) WITH CHECK (true);
