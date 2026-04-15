export type Platform = 
  | 'Netflix'
  | 'Amazon Prime Video'
  | 'Disney Premium'
  | 'HBO Max'
  | 'IPTV Premium'
  | 'Star Plus'
  | 'Crunchyroll'
  | 'Claro Video'
  | 'Otro';

export type PaymentStatus = 'pagado' | 'debe' | 'cobrar';

export interface Subscription {
  id: string;
  platform: Platform;
  accountEmail: string;
  accountPassword: string;
  clientName: string;
  purchaseDate: string; // ISO date string
  profilePin: string;
  paymentStatus: PaymentStatus;
  notes: string;
  accountName?: string; // optional grouping label
  salePriceOverride?: number; // Precio de cobro específico acordado (IPTV combos)
}

export const PLATFORMS: Platform[] = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Premium',
  'HBO Max',
  'IPTV Premium',
  'Star Plus',
  'Crunchyroll',
  'Claro Video',
  'Otro',
];

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

export function getNextPaymentDate(purchaseDate: string): Date {
  const purchase = new Date(purchaseDate + 'T12:00:00');
  const now = new Date();
  const next = new Date(purchase);
  
  // Move forward month by month until we pass today
  while (next <= now) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function getDaysUntilPayment(purchaseDate: string): number {
  const next = getNextPaymentDate(purchaseDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getRowStatus(purchaseDate: string): 'normal' | 'warning' | 'danger' {
  const days = getDaysUntilPayment(purchaseDate);
  if (days <= 0) return 'danger';
  if (days <= 2) return 'warning';
  return 'normal';
}
