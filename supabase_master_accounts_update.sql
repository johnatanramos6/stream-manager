-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE master_accounts ADD COLUMN IF NOT EXISTS purchase_date date DEFAULT CURRENT_DATE;
ALTER TABLE master_accounts ADD COLUMN IF NOT EXISTS supplier_phone text DEFAULT NULL;
