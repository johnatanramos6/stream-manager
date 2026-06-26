-- =====================================================================
-- PARCHE DE ACTUALIZACIÓN V4: Sincronización del teléfono de WhatsApp del revendedor
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================================

CREATE OR REPLACE FUNCTION public.secure_execute_purchase(
  p_reseller_id UUID,
  p_manager_id UUID,
  p_catalog_item_id UUID,
  p_reseller_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reseller_balance NUMERIC;
  v_reseller_status TEXT;
  v_reseller_email_name TEXT;
  v_reseller_phone TEXT; -- Teléfono de WhatsApp del revendedor
  v_catalog_price NUMERIC;
  v_catalog_platform TEXT;
  v_catalog_type TEXT;
  v_catalog_display_name TEXT;
  
  v_selected_ma_id UUID;
  v_selected_email TEXT;
  v_selected_password TEXT;
  v_selected_total_profiles INT;
  v_selected_duration_days INT;
  v_selected_profiles_config JSONB;
  
  v_profiles_used INT;
  v_profiles_available INT;
  v_profile_index INT;
  v_profile_pin TEXT;
  v_profile_name TEXT;
  v_profiles_sold INT;
  
  v_new_sub_id UUID;
  v_new_order_id UUID;
  v_order_notes TEXT;
  v_credentials JSONB;
  v_response JSONB;
  
  v_temp_record RECORD;
BEGIN
  -- A. Validar revendedor y saldo en una sola transacción bloqueando la fila (FOR UPDATE)
  -- Obtenemos el whatsapp_number también
  SELECT balance, status, name, whatsapp_number 
  INTO v_reseller_balance, v_reseller_status, v_reseller_email_name, v_reseller_phone
  FROM public.resellers
  WHERE id = p_reseller_id AND manager_id = p_manager_id
  FOR UPDATE; -- Bloquea la fila del revendedor para evitar compras paralelas simultáneas

  IF v_reseller_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se encontró el revendedor.');
  END IF;

  IF v_reseller_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tu cuenta está bloqueada.');
  END IF;

  -- B. Validar ítem del catálogo
  SELECT selling_price, platform, type, display_name 
  INTO v_catalog_price, v_catalog_platform, v_catalog_type, v_catalog_display_name
  FROM public.store_catalog
  WHERE id = p_catalog_item_id AND manager_id = p_manager_id AND is_active = true;

  IF v_catalog_platform IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El producto ya no está activo o no existe.');
  END IF;

  IF v_reseller_balance < v_catalog_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente para esta compra.');
  END IF;

  -- C. Buscar cuenta maestra (FIFO)
  v_selected_ma_id := NULL;
  
  FOR v_temp_record IN 
    SELECT ma.id, ma.account_email, ma.account_password, ma.total_profiles, ma.duration_days, ma.profiles_config,
           COALESCE(SUM(s.profiles_sold), 0) as used_profiles
    FROM public.master_accounts ma
    LEFT JOIN public.subscriptions s ON s.master_account_id = ma.id AND s.vendor_id = p_manager_id
    WHERE ma.vendor_id = p_manager_id AND ma.platform = v_catalog_platform
    GROUP BY ma.id, ma.account_email, ma.account_password, ma.total_profiles, ma.duration_days, ma.profiles_config, ma.purchase_date, ma.created_at
    ORDER BY ma.purchase_date ASC, ma.created_at ASC
  LOOP
    IF v_catalog_type = 'profile' THEN
      -- Pantalla individual: debe tener al menos 1 libre
      IF (v_temp_record.total_profiles - v_temp_record.used_profiles) > 0 THEN
        v_selected_ma_id := v_temp_record.id;
        v_selected_email := v_temp_record.account_email;
        v_selected_password := v_temp_record.account_password;
        v_selected_total_profiles := v_temp_record.total_profiles;
        v_selected_duration_days := v_temp_record.duration_days;
        v_selected_profiles_config := v_temp_record.profiles_config;
        v_profiles_used := v_temp_record.used_profiles;
        EXIT;
      END IF;
    ELSE
      -- Cuenta completa: debe estar completamente limpia
      IF v_temp_record.used_profiles = 0 THEN
        v_selected_ma_id := v_temp_record.id;
        v_selected_email := v_temp_record.account_email;
        v_selected_password := v_temp_record.account_password;
        v_selected_total_profiles := v_temp_record.total_profiles;
        v_selected_duration_days := v_temp_record.duration_days;
        v_selected_profiles_config := v_temp_record.profiles_config;
        v_profiles_used := 0;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF v_selected_ma_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay cuentas disponibles en este momento. Intenta más tarde.');
  END IF;

  -- D. Definir PIN y perfil
  v_profile_index := v_profiles_used;
  v_profile_pin := LPAD((v_profile_index + 1)::TEXT, 4, '0');
  v_profile_name := 'Perfil ' || (v_profile_index + 1)::TEXT;

  IF jsonb_typeof(v_selected_profiles_config) = 'array' THEN
    IF jsonb_array_length(v_selected_profiles_config) > v_profile_index THEN
      IF (v_selected_profiles_config->v_profile_index->'pin') IS NOT NULL THEN
        v_profile_pin := replace((v_selected_profiles_config->v_profile_index->>'pin'), '"', '');
      END IF;
      IF (v_selected_profiles_config->v_profile_index->'name') IS NOT NULL THEN
        v_profile_name := replace((v_selected_profiles_config->v_profile_index->>'name'), '"', '');
      END IF;
    END IF;
  END IF;

  v_profiles_sold := CASE WHEN v_catalog_type = 'full_account' THEN v_selected_total_profiles ELSE 1 END;

  -- E. Insertar suscripción
  -- Rellenamos client_phone automáticamente con el whatsapp_number del revendedor
  INSERT INTO public.subscriptions (
    vendor_id, platform, account_email, account_password, client_name, client_phone,
    purchase_date, profile_pin, payment_status, notes, account_name, sale_price_override,
    master_account_id, profiles_sold, duration_days
  ) VALUES (
    p_manager_id, v_catalog_platform, v_selected_email, v_selected_password, p_reseller_name || ' (Tienda)', COALESCE(v_reseller_phone, ''),
    CURRENT_DATE, v_profile_pin, 'pagado', 'Compra automática - Revendedor: ' || v_reseller_email_name,
    'Tienda - ' || v_catalog_display_name || ' - ' || v_profile_name, v_catalog_price,
    v_selected_ma_id, v_profiles_sold, COALESCE(v_selected_duration_days, 30)
  ) RETURNING id INTO v_new_sub_id;

  -- F. Descontar saldo del revendedor
  UPDATE public.resellers 
  SET balance = balance - v_catalog_price
  WHERE id = p_reseller_id;

  -- G. Registrar transacción en la billetera
  INSERT INTO public.wallet_transactions (
    reseller_id, manager_id, amount, type, description, reference_id, balance_after
  ) VALUES (
    p_reseller_id, p_manager_id, -v_catalog_price, 'purchase',
    'Compra: ' || v_catalog_display_name || ' (' || CASE WHEN v_catalog_type = 'profile' THEN '1 Pantalla' ELSE 'Cuenta Completa' END || ')',
    v_new_sub_id, v_reseller_balance - v_catalog_price
  );

  -- H. Registrar orden y generar credenciales
  IF v_catalog_type = 'full_account' THEN
    IF jsonb_typeof(v_selected_profiles_config) = 'array' THEN
      v_order_notes := 'Cuenta completa con ' || v_selected_total_profiles || ' perfiles configurados.';
    ELSE
      v_order_notes := 'Cuenta completa con ' || v_selected_total_profiles || ' perfiles.';
    END IF;
  ELSE
    v_order_notes := 'Usa el ' || v_profile_name;
  END IF;

  v_credentials := jsonb_build_object(
    'email', v_selected_email,
    'password', v_selected_password,
    'pin', v_profile_pin,
    'profile_name', v_profile_name,
    'notes', v_order_notes,
    'purchase_date', CURRENT_DATE::TEXT,
    'duration_days', COALESCE(v_selected_duration_days, 30)
  );

  INSERT INTO public.store_orders (
    reseller_id, manager_id, catalog_item_id, master_account_id, subscription_id,
    platform, type, amount, credentials, status
  ) VALUES (
    p_reseller_id, p_manager_id, p_catalog_item_id, v_selected_ma_id, v_new_sub_id,
    v_catalog_platform, v_catalog_type, v_catalog_price, v_credentials, 'completed'
  ) RETURNING id INTO v_new_order_id;

  -- Retornar credenciales de forma segura
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_reseller_balance - v_catalog_price,
    'credentials', v_credentials,
    'order_id', v_new_order_id
  );
END;
$$;
