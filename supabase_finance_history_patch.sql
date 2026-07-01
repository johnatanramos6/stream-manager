-- =====================================================================
-- PARCHE DE FINANZAS: Tabla de Snapshots Mensuales Históricos
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.monthly_finance_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 0 AND month <= 11),
  revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  clients INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, year, month)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.monthly_finance_snapshots ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes para evitar errores por duplicado
DROP POLICY IF EXISTS "Activos de finanzas por vendedor" ON public.monthly_finance_snapshots;
DROP POLICY IF EXISTS "El Super-admin ve finanzas" ON public.monthly_finance_snapshots;

-- Políticas de Seguridad (RLS)
CREATE POLICY "Activos de finanzas por vendedor" ON public.monthly_finance_snapshots
  FOR ALL USING (auth.uid() = vendor_id);

CREATE POLICY "El Super-admin ve finanzas" ON public.monthly_finance_snapshots
  FOR ALL USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'johnatanramos6@gmail.com'
  );

-- RECONSTRUCCIÓN HISTÓRICA:
-- Calcula los ciclos de suscripciones y cuentas maestras basándose en su fecha de creación
-- para rellenar automáticamente los datos reales de Mayo (4) y Junio (5) de 2026.
INSERT INTO public.monthly_finance_snapshots (vendor_id, year, month, revenue, cost, profit, clients)
WITH RECURSIVE sub_cycles AS (
  SELECT 
    id,
    vendor_id,
    platform,
    COALESCE(profiles_sold, 1) as profiles_sold,
    sale_price_override,
    master_account_id,
    COALESCE(duration_days, 30) as duration_days,
    (created_at AT TIME ZONE 'UTC')::date as cycle_date,
    purchase_date as last_purchase_date
  FROM public.subscriptions
  
  UNION ALL
  
  SELECT 
    id,
    vendor_id,
    platform,
    profiles_sold,
    sale_price_override,
    master_account_id,
    duration_days,
    (cycle_date + duration_days)::date,
    last_purchase_date
  FROM sub_cycles
  WHERE (cycle_date + duration_days)::date <= last_purchase_date
),
ma_cycles AS (
  SELECT 
    id,
    vendor_id,
    platform,
    purchase_price,
    COALESCE(duration_days, 30) as duration_days,
    (created_at AT TIME ZONE 'UTC')::date as cycle_date,
    COALESCE(purchase_date, (created_at AT TIME ZONE 'UTC')::date) as last_purchase_date
  FROM public.master_accounts
  
  UNION ALL
  
  SELECT 
    id,
    vendor_id,
    platform,
    purchase_price,
    duration_days,
    (cycle_date + duration_days)::date,
    last_purchase_date
  FROM ma_cycles
  WHERE (cycle_date + duration_days)::date <= last_purchase_date
),
monthly_stats AS (
  SELECT 
    v.auth_user_id as vendor_id,
    2026 as year,
    m.month_val as month,
    
    -- Ingresos
    COALESCE((
      SELECT SUM(
        COALESCE(
          s.sale_price_override,
          (SELECT selling_price FROM public.store_catalog WHERE platform = s.platform AND manager_id = s.vendor_id LIMIT 1),
          15000
        )
      )
      FROM sub_cycles s
      WHERE s.vendor_id = v.auth_user_id
        AND EXTRACT(YEAR FROM s.cycle_date) = 2026
        AND EXTRACT(MONTH FROM s.cycle_date) - 1 = m.month_val
    ), 0) as revenue,
    
    -- Costos
    COALESCE((
      SELECT SUM(ma.purchase_price)
      FROM ma_cycles ma
      WHERE ma.vendor_id = v.auth_user_id
        AND EXTRACT(YEAR FROM ma.cycle_date) = 2026
        AND EXTRACT(MONTH FROM ma.cycle_date) - 1 = m.month_val
    ), 0) as cost,
    
    -- Ganancia
    COALESCE((
      SELECT SUM(
        COALESCE(
          s.sale_price_override,
          (SELECT selling_price FROM public.store_catalog WHERE platform = s.platform AND manager_id = s.vendor_id LIMIT 1),
          15000
        ) - 
        COALESCE(
          (SELECT (ma.purchase_price / NULLIF(ma.total_profiles, 0)) * s.profiles_sold 
           FROM public.master_accounts ma 
           WHERE ma.id = s.master_account_id),
          0
        )
      )
      FROM sub_cycles s
      WHERE s.vendor_id = v.auth_user_id
        AND EXTRACT(YEAR FROM s.cycle_date) = 2026
        AND EXTRACT(MONTH FROM s.cycle_date) - 1 = m.month_val
    ), 0) as profit,
    
    -- Clientes
    COALESCE((
      SELECT COUNT(DISTINCT s.id)
      FROM sub_cycles s
      WHERE s.vendor_id = v.auth_user_id
        AND EXTRACT(YEAR FROM s.cycle_date) = 2026
        AND EXTRACT(MONTH FROM s.cycle_date) - 1 = m.month_val
    ), 0) as clients
    
  FROM public.vendors v
  CROSS JOIN (SELECT 4 as month_val UNION ALL SELECT 5) m
  WHERE v.auth_user_id IS NOT NULL
)
SELECT vendor_id, year, month, revenue, cost, profit, clients
FROM monthly_stats
ON CONFLICT (vendor_id, year, month) 
DO UPDATE SET
  revenue = EXCLUDED.revenue,
  cost = EXCLUDED.cost,
  profit = EXCLUDED.profit,
  clients = EXCLUDED.clients,
  updated_at = now();
