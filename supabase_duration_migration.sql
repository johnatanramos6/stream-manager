-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30;
