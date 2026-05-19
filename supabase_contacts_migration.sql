-- =============================================
-- Tabla de contactos persistentes
-- Los contactos NUNCA se borran, incluso si se
-- elimina la suscripción o cuenta maestra asociada.
-- =============================================

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  type text NOT NULL CHECK (type IN ('client', 'provider')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Un vendor no puede tener dos contactos con el mismo nombre y tipo
  UNIQUE(vendor_id, name, type)
);

-- Índice para búsquedas rápidas por vendor y tipo
CREATE INDEX IF NOT EXISTS idx_contacts_vendor_type ON contacts(vendor_id, type);

-- Índice para búsquedas por nombre (autocompletado)
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(vendor_id, name);

-- RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Solo el dueño puede ver sus contactos
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = vendor_id);

-- Solo el dueño puede insertar sus contactos
CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

-- Solo el dueño puede actualizar sus contactos
CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = vendor_id);

-- =============================================
-- Migrar datos existentes a la tabla contacts
-- (Clientes desde subscriptions)
-- =============================================
INSERT INTO contacts (vendor_id, name, phone, type)
SELECT DISTINCT ON (vendor_id, client_name)
  vendor_id,
  client_name,
  client_phone,
  'client'
FROM subscriptions
WHERE client_name IS NOT NULL AND client_name != ''
ON CONFLICT (vendor_id, name, type) DO NOTHING;

-- (Proveedores desde master_accounts)
INSERT INTO contacts (vendor_id, name, phone, type)
SELECT DISTINCT ON (vendor_id, supplier_name)
  vendor_id,
  supplier_name,
  supplier_phone,
  'provider'
FROM master_accounts
WHERE supplier_name IS NOT NULL AND supplier_name != ''
ON CONFLICT (vendor_id, name, type) DO NOTHING;
