-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE master_accounts ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30;
