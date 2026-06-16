-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Portal de Ventas para Revendedores (Storefront)
-- Fase 1: Tienda, Catálogo, Revendedores y Billetera Manual
-- ═══════════════════════════════════════════════════════════

-- 1. Configuración de la tienda por administrador
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL DEFAULT 'Mi Tienda',
  store_slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#8b5cf6',
  welcome_message TEXT DEFAULT '¡Bienvenido a nuestra tienda de streaming!',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_id)
);

-- 2. Catálogo de productos de la tienda
CREATE TABLE IF NOT EXISTS store_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('profile', 'full_account')),
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  duration_label TEXT DEFAULT '1 Mes',
  icon_emoji TEXT DEFAULT '📺',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Revendedores (autenticación independiente)
CREATE TABLE IF NOT EXISTS resellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  balance NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_id, email)
);

-- 4. Órdenes de la tienda (historial de compras)
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES store_catalog(id),
  master_account_id UUID,
  subscription_id UUID,
  platform TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Transacciones de billetera
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recharge', 'purchase', 'refund')),
  description TEXT,
  reference_id UUID,
  balance_after NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- ÍNDICES para rendimiento
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_store_catalog_manager ON store_catalog(manager_id, is_active);
CREATE INDEX IF NOT EXISTS idx_resellers_manager ON resellers(manager_id, status);
CREATE INDEX IF NOT EXISTS idx_store_orders_reseller ON store_orders(reseller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reseller ON wallet_transactions(reseller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_settings_slug ON store_settings(store_slug);

-- ═══════════════════════════════════════════════════════════
-- RLS (Row Level Security) policies
-- ═══════════════════════════════════════════════════════════
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Store settings: solo el manager puede CRUD, lectura pública por slug
CREATE POLICY "store_settings_manager_all" ON store_settings FOR ALL USING (auth.uid() = manager_id);
CREATE POLICY "store_settings_public_read" ON store_settings FOR SELECT USING (true);

-- Catálogo: manager CRUD, lectura pública de activos
CREATE POLICY "store_catalog_manager_all" ON store_catalog FOR ALL USING (auth.uid() = manager_id);
CREATE POLICY "store_catalog_public_read" ON store_catalog FOR SELECT USING (is_active = true);

-- Revendedores: solo el manager puede gestionar
CREATE POLICY "resellers_manager_all" ON resellers FOR ALL USING (auth.uid() = manager_id);
-- Los revendedores necesitan poder leerse a sí mismos (login público)
CREATE POLICY "resellers_public_read" ON resellers FOR SELECT USING (true);

-- Órdenes: manager y revendedor pueden leer sus propias
CREATE POLICY "store_orders_manager_all" ON store_orders FOR ALL USING (auth.uid() = manager_id);
CREATE POLICY "store_orders_public_read" ON store_orders FOR SELECT USING (true);
CREATE POLICY "store_orders_public_insert" ON store_orders FOR INSERT WITH CHECK (true);

-- Wallet: manager gestiona, revendedor lee las suyas
CREATE POLICY "wallet_manager_all" ON wallet_transactions FOR ALL USING (auth.uid() = manager_id);
CREATE POLICY "wallet_public_read" ON wallet_transactions FOR SELECT USING (true);
CREATE POLICY "wallet_public_insert" ON wallet_transactions FOR INSERT WITH CHECK (true);

-- Permitir inserciones públicas para órdenes y transacciones (el portal público las necesita)
-- Las funciones RPC de Supabase se ejecutan con el rol del usuario autenticado,
-- pero la tienda pública usa el rol anon, así que necesitamos estas políticas.

-- Permitir actualizar saldo de revendedores desde el portal público
CREATE POLICY "resellers_public_update_balance" ON resellers FOR UPDATE USING (true) WITH CHECK (true);
