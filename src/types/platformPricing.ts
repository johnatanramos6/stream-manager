export type CostType = 'per_screen' | 'per_account';

export interface PlatformPricing {
  platform: string;
  costType: CostType;     // determina si el costo es por cada usuario o por cuenta agrupadora
  costPrice: number;      // precio de compra (depende del costType)
  salePrice: number;      // precio de venta referencial (por pantalla)
}

const STORAGE_KEY = 'platform-pricing';

export const DEFAULT_PRICING: PlatformPricing[] = [
  { platform: 'Netflix', costType: 'per_screen', costPrice: 10000, salePrice: 16000 },
  { platform: 'Disney Premium', costType: 'per_screen', costPrice: 8000, salePrice: 15000 },
  { platform: 'Amazon Prime Video', costType: 'per_screen', costPrice: 2500, salePrice: 12000 },
  { platform: 'IPTV Premium', costType: 'per_account', costPrice: 8000, salePrice: 20000 },
  { platform: 'HBO Max', costType: 'per_screen', costPrice: 2500, salePrice: 12000 },
  { platform: 'Star Plus', costType: 'per_screen', costPrice: 5000, salePrice: 12000 },
  { platform: 'Crunchyroll', costType: 'per_screen', costPrice: 5000, salePrice: 12000 },
  { platform: 'Claro Video', costType: 'per_screen', costPrice: 5000, salePrice: 12000 },
  { platform: 'Otro', costType: 'per_screen', costPrice: 5000, salePrice: 15000 },
];

export function loadPricing(): PlatformPricing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      // Data migration hook
      return parsed.map(p => ({
        ...p,
        costType: p.costType || (p.platform === 'IPTV Premium' ? 'per_account' : 'per_screen')
      }));
    }
  } catch {}
  return [...DEFAULT_PRICING];
}

export function savePricing(pricing: PlatformPricing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pricing));
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
