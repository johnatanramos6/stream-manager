// ═══════════════════════════════════════════════════════════
// Tipos para el Portal de Ventas (Storefront)
// ═══════════════════════════════════════════════════════════

export interface StoreBanner {
  id: string;
  type: 'image' | 'video';
  url: string;
  title?: string;
  description?: string;
  link?: string;
  sort_order: number;
}

export interface StoreSettings {
  id: string;
  manager_id: string;
  store_name: string;
  store_slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  welcome_message: string;
  is_active: boolean;
  whatsapp_number?: string;
  announcement_text?: string;
  banners?: StoreBanner[];
  created_at: string;
  updated_at: string;
}

export interface StoreCatalogItem {
  id: string;
  manager_id: string;
  platform: string;
  display_name: string;
  type: 'profile' | 'full_account';
  selling_price: number;
  duration_label: string;
  icon_emoji: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Reseller {
  id: string;
  manager_id: string;
  name: string;
  email: string;
  password_hash: string;
  balance: number;
  status: 'active' | 'blocked';
  whatsapp_number?: string;
  created_at: string;
}

export interface StoreOrder {
  id: string;
  reseller_id: string;
  manager_id: string;
  catalog_item_id: string | null;
  master_account_id: string | null;
  subscription_id: string | null;
  platform: string;
  type: string;
  amount: number;
  credentials: {
    email?: string;
    password?: string;
    pin?: string;
    profile_name?: string;
    notes?: string;
  };
  status: 'completed' | 'refunded' | 'cancelled';
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  reseller_id: string;
  manager_id: string;
  amount: number;
  type: 'recharge' | 'purchase' | 'refund';
  description: string | null;
  reference_id: string | null;
  balance_after: number | null;
  created_at: string;
}

// Helper: generar slug a partir del nombre de la tienda
export function generateStoreSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Emojis predeterminados por plataforma
export const PLATFORM_EMOJIS: Record<string, string> = {
  'Netflix': '🔴',
  'Disney Premium': '🏰',
  'Amazon Prime Video': '📦',
  'HBO Max': '💜',
  'IPTV Premium': '📡',
  'Star Plus': '⭐',
  'Crunchyroll': '🍥',
  'Claro Video': '📱',
  'Spotify': '🎵',
  'YouTube Premium': '▶️',
  'Paramount+': '🏔️',
  'Apple TV+': '🍎',
};

export function getPlatformEmoji(platform: string): string {
  return PLATFORM_EMOJIS[platform] || '📺';
}
