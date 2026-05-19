export type Platform = string;

export type PaymentStatus = 'pagado' | 'debe' | 'cobrar';

export interface Subscription {
  id: string;
  platform: Platform;
  accountEmail: string;
  accountPassword: string;
  clientName: string;
  clientPhone?: string; // Número de contacto/Whatsapp
  purchaseDate: string; // ISO date string
  profilePin: string;
  paymentStatus: PaymentStatus;
  notes: string;
  accountName?: string; // optional grouping label
  salePriceOverride?: number; // Precio de cobro específico acordado (IPTV combos)
  master_account_id?: string; // Enlace a cuenta maestra de stock
  profiles_sold?: number; // Cantidad de perfiles vendidos (cuenta completa = total_profiles)
  duration_days?: number; // Duración en días (25, 28, 30=1 mes, 60=2 meses)
}

// Array removido ya que ahora se obtiene dinámicamente de Pricing.

export function getPlatformClass(platform: Platform): string {
  const map: Record<string, string> = {
    'Netflix': 'platform-netflix',
    'Amazon Prime Video': 'platform-amazon',
    'Disney Premium': 'platform-disney',
    'HBO Max': 'platform-hbo',
    'IPTV Premium': 'platform-iptv',
    'Star Plus': 'platform-star',
    'Crunchyroll': 'platform-crunchyroll',
    'Claro Video': 'platform-claro',
  };
  return map[platform] || 'platform-default';
}

export function getNextPaymentDate(purchaseDate: string, durationDays: number = 30): Date {
  const purchase = new Date(purchaseDate + 'T12:00:00');
  const next = new Date(purchase);
  next.setHours(0, 0, 0, 0);
  
  // Sumamos los días exactos de duración.
  // Ya no sumamos repetidamente con un bucle while para evitar la "auto-renovación".
  // Si está vencida, debe quedarse vencida.
  next.setDate(next.getDate() + durationDays);
  
  return next;
}

export function getDaysUntilPayment(purchaseDate: string, durationDays: number = 30): number {
  const next = getNextPaymentDate(purchaseDate, durationDays);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getRowStatus(purchaseDate: string, durationDays: number = 30): 'normal' | 'warning' | 'danger' {
  const days = getDaysUntilPayment(purchaseDate, durationDays);
  if (days <= 0) return 'danger';
  if (days <= 2) return 'warning';
  return 'normal';
}
