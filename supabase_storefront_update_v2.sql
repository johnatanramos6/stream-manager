-- ALTER TABLE para agregar whatsapp_number y announcement_text a store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS announcement_text TEXT;

COMMENT ON COLUMN store_settings.whatsapp_number IS 'Número de WhatsApp de soporte para los distribuidores (con código de país, ej: 573001234567)';
COMMENT ON COLUMN store_settings.announcement_text IS 'Texto de anuncio o aviso que se mostrará en la parte superior de la tienda';
