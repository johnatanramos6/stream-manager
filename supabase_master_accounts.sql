-- =============================================
-- STREAM MANAGER: Sistema de Cuentas Maestras
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de cuentas maestras (inventario/stock)
CREATE TABLE IF NOT EXISTS master_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES auth.users(id) NOT NULL,
  platform text NOT NULL,
  account_email text NOT NULL,
  account_password text NOT NULL,
  total_profiles integer NOT NULL DEFAULT 4,
  purchase_price numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- RLS: cada vendedor solo ve sus cuentas
ALTER TABLE master_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own master_accounts" ON master_accounts FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Users can insert own master_accounts" ON master_accounts FOR INSERT WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Users can update own master_accounts" ON master_accounts FOR UPDATE USING (auth.uid() = vendor_id);
CREATE POLICY "Users can delete own master_accounts" ON master_accounts FOR DELETE USING (auth.uid() = vendor_id);

-- Agregar columna a subscriptions para enlazar perfil vendido con cuenta maestra
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS master_account_id uuid REFERENCES master_accounts(id) ON DELETE SET NULL;
