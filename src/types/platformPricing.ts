export type CostType = 'per_screen' | 'per_account';

export interface PlatformPricing {
  platform: string;
  costType: CostType;
  costPrice: number;
  salePrice: number;
}

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

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
