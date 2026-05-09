-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE master_accounts ADD COLUMN IF NOT EXISTS purchase_date date DEFAULT CURRENT_DATE;
