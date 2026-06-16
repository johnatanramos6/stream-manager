// ═══════════════════════════════════════════════════════════
// Motor de Compra Automatizada del Storefront
// Lógica FIFO: cuenta maestra más antigua con perfiles disponibles
// ═══════════════════════════════════════════════════════════

import { supabase } from './supabase';
import { StoreCatalogItem, StoreOrder } from '@/types/storefront';

interface PurchaseResult {
  success: boolean;
  order?: StoreOrder;
  credentials?: {
    email: string;
    password: string;
    pin: string;
    profile_name: string;
  };
  error?: string;
}

/**
 * Ejecuta la compra automatizada de un perfil o cuenta completa.
 * 
 * Flujo:
 * 1. Verificar saldo del revendedor
 * 2. Buscar cuenta maestra más antigua (FIFO) con perfiles disponibles
 * 3. Crear suscripción de cliente
 * 4. Descontar saldo y registrar transacción
 * 5. Registrar orden con credenciales
 * 6. Retornar credenciales
 */
export async function executePurchase(
  resellerId: string,
  managerId: string,
  catalogItem: StoreCatalogItem,
  resellerName: string
): Promise<PurchaseResult> {
  try {
    const { data, error } = await supabase.rpc('secure_execute_purchase', {
      p_reseller_id: resellerId,
      p_manager_id: managerId,
      p_catalog_item_id: catalogItem.id,
      p_reseller_name: resellerName
    });

    if (error || !data || !data.success) {
      return { success: false, error: (data && data.error) || error?.message || 'Error al procesar la compra.' };
    }

    return {
      success: true,
      credentials: data.credentials,
      order: {
        id: data.order_id,
        reseller_id: resellerId,
        manager_id: managerId,
        catalog_item_id: catalogItem.id,
        master_account_id: null,
        subscription_id: null,
        platform: catalogItem.platform,
        type: catalogItem.type,
        amount: catalogItem.selling_price,
        credentials: data.credentials,
        status: 'completed',
        created_at: new Date().toISOString()
      } as any
    };
  } catch (err) {
    console.error('Error en executePurchase:', err);
    return { success: false, error: 'Error inesperado. Intenta de nuevo.' };
  }
}

/**
 * Recarga manual de saldo de un revendedor
 */
export async function rechargeBalance(
  resellerId: string,
  managerId: string,
  amount: number,
  description: string = 'Recarga manual'
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    if (amount <= 0) return { success: false, error: 'El monto debe ser mayor a 0.' };

    const { data: reseller } = await supabase
      .from('resellers')
      .select('balance')
      .eq('id', resellerId)
      .single();

    if (!reseller) return { success: false, error: 'Revendedor no encontrado.' };

    const newBalance = (Number(reseller.balance) || 0) + amount;

    const { error } = await supabase
      .from('resellers')
      .update({ balance: newBalance })
      .eq('id', resellerId);

    if (error) return { success: false, error: 'Error al actualizar el saldo.' };

    await supabase.from('wallet_transactions').insert({
      reseller_id: resellerId,
      manager_id: managerId,
      amount: amount,
      type: 'recharge',
      description,
      balance_after: newBalance,
    });

    return { success: true, newBalance };
  } catch (err) {
    return { success: false, error: 'Error inesperado.' };
  }
}
