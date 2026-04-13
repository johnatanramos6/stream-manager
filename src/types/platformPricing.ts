export interface PlatformPricing {
  platform: string;
  costPrice: number;      // precio de compra de la cuenta completa
  salePrice: number;      // precio de venta por pantalla
}

const STORAGE_KEY = 'platform-pricing';

export const DEFAULT_PRICING: PlatformPricing[] = [
  { platform: 'Netflix', costPrice: 10000, salePrice: 16000 },
  { platform: 'Disney Premium', costPrice: 8000, salePrice: 15000 },
  { platform: 'Amazon Prime Video', costPrice: 2500, salePrice: 12000 },
  { platform: 'IPTV Premium', costPrice: 8000, salePrice: 20000 },
  { platform: 'HBO Max', costPrice: 2500, salePrice: 12000 },
  { platform: 'Star Plus', costPrice: 5000, salePrice: 12000 },
  { platform: 'Crunchyroll', costPrice: 5000, salePrice: 12000 },
  { platform: 'Claro Video', costPrice: 5000, salePrice: 12000 },
  { platform: 'Otro', costPrice: 5000, salePrice: 15000 },
];

export function loadPricing(): PlatformPricing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...DEFAULT_PRICING];
}

export function savePricing(pricing: PlatformPricing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pricing));
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}
