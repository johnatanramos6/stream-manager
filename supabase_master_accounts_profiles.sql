-- =============================================
-- STREAM MANAGER: Migración para perfiles personalizados
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

ALTER TABLE master_accounts ADD COLUMN IF NOT EXISTS profiles_config jsonb DEFAULT '[]'::jsonb;

-- Comentario descriptivo para la columna
COMMENT ON COLUMN master_accounts.profiles_config IS 'Arreglo JSON conteniendo la configuración de nombres y PINs personalizados para cada perfil de la cuenta';
