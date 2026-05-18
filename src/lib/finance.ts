import { MasterAccount } from '@/types/masterAccount';
import { PlatformPricing } from '@/types/platformPricing';
import { Subscription } from '@/types/subscription';

export interface PlatformFinancialStats {
  platform: string;
  accounts: number;
  clients: number;
  cost: number;
  revenue: number;
  profit: number;
  marginPercent: number;
}

export interface FinancialStats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  platformStats: PlatformFinancialStats[];
  totalClients: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface MonthlyFinancialSnapshot {
  month: string;
  monthFull: string;
  Ingresos: number | null;
  Costos: number | null;
  Ganancia: number | null;
  IngresosProj: number | null;
  CostosProj: number | null;
  GananciaProj: number | null;
  clients: number;
  isFuture: boolean;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getDurationMonths = (durationDays?: number) => Math.max(1, (durationDays || 30) / 30);

const getProfilesSold = (sub: Subscription) => Math.max(1, sub.profiles_sold || 1);

export const getSubscriptionRevenue = (sub: Subscription, pricing?: PlatformPricing) => {
  const salePrice = pricing?.salePrice || 0;
  return (sub.salePriceOverride ?? (salePrice * getProfilesSold(sub))) / getDurationMonths(sub.duration_days);
};

const getManualSubscriptionCost = (
  sub: Subscription,
  pricing: PlatformPricing | undefined,
  isNewAccount: boolean
) => {
  const costType = pricing?.costType || (sub.platform === 'IPTV Premium' ? 'per_account' : 'per_screen');
  const costPrice = pricing?.costPrice || 0;

  if (costType === 'per_account') {
    return isNewAccount ? costPrice / getDurationMonths(sub.duration_days) : 0;
  }

  return (costPrice * getProfilesSold(sub)) / getDurationMonths(sub.duration_days);
};

export const getStockSubscriptionCost = (sub: Subscription, masterAccount?: MasterAccount) => {
  if (!masterAccount || !masterAccount.total_profiles || masterAccount.total_profiles <= 0) return 0;

  const soldProfiles = getProfilesSold(sub);
  const costPerProfile = masterAccount.purchase_price / masterAccount.total_profiles;
  const durationMonths = getDurationMonths(masterAccount.duration_days || sub.duration_days);

  return (costPerProfile * soldProfiles) / durationMonths;
};

const getManualAccountKey = (sub: Subscription) => {
  return sub.accountEmail
    ? `${sub.platform}::${sub.accountEmail.trim().toLowerCase()}`
    : `ungrouped::${sub.id}`;
};

const getMonthStartFromDate = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export function calculateCurrentFinancialStats(
  subscriptions: Subscription[],
  masterAccounts: MasterAccount[],
  pricing: PlatformPricing[]
): FinancialStats {
  const pricingMap = new Map(pricing.map(p => [p.platform, p]));
  const masterAccountsMap = new Map(masterAccounts.map(ma => [ma.id, ma]));
  const platformStatsMap = new Map<string, PlatformFinancialStats>();
  const uniqueManualAccounts = new Set<string>();
  const countedMasterAccounts = new Set<string>();

  const getPlatformStats = (platform: string) => {
    const current = platformStatsMap.get(platform);
    if (current) return current;

    const created = { platform, accounts: 0, clients: 0, revenue: 0, cost: 0, profit: 0, marginPercent: 0 };
    platformStatsMap.set(platform, created);
    return created;
  };

  subscriptions.forEach(sub => {
    const pricingConfig = pricingMap.get(sub.platform);
    const stats = getPlatformStats(sub.platform);

    stats.clients += getProfilesSold(sub);
    stats.revenue += getSubscriptionRevenue(sub, pricingConfig);

    if (sub.master_account_id) {
      const masterAccount = masterAccountsMap.get(sub.master_account_id);
      stats.cost += getStockSubscriptionCost(sub, masterAccount);

      if (masterAccount && !countedMasterAccounts.has(masterAccount.id)) {
        countedMasterAccounts.add(masterAccount.id);
        stats.accounts++;
      }
      return;
    }

    const key = getManualAccountKey(sub);
    const isNewAccount = !uniqueManualAccounts.has(key);
    if (isNewAccount) {
      uniqueManualAccounts.add(key);
      stats.accounts++;
    }

    stats.cost += getManualSubscriptionCost(sub, pricingConfig, isNewAccount);
  });

  masterAccounts.forEach(ma => {
    const stats = getPlatformStats(ma.platform);
    if (!countedMasterAccounts.has(ma.id)) {
      countedMasterAccounts.add(ma.id);
      stats.accounts++;
    }
  });

  let totalRevenue = 0;
  let totalCost = 0;
  const platformStats = Array.from(platformStatsMap.values()).map(stats => {
    const profit = stats.revenue - stats.cost;
    const marginPercent = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;
    totalRevenue += stats.revenue;
    totalCost += stats.cost;
    return { ...stats, profit, marginPercent };
  }).sort((a, b) => b.profit - a.profit);

  const pendingSubscriptions = subscriptions.filter(s => s.paymentStatus === 'debe' || s.paymentStatus === 'cobrar');
  const pendingAmount = pendingSubscriptions.reduce((acc, sub) => {
    return acc + getSubscriptionRevenue(sub, pricingMap.get(sub.platform));
  }, 0);

  return {
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
    platformStats,
    totalClients: subscriptions.reduce((acc, sub) => acc + getProfilesSold(sub), 0),
    pendingCount: pendingSubscriptions.length,
    pendingAmount,
  };
}

export function calculateMonthlyFinancialSnapshots(
  subscriptions: Subscription[],
  masterAccounts: MasterAccount[],
  pricing: PlatformPricing[],
  selectedYear: number,
  now: Date = new Date()
): MonthlyFinancialSnapshot[] {
  const pricingMap = new Map(pricing.map(p => [p.platform, p]));
  const masterAccountsMap = new Map(masterAccounts.map(ma => [ma.id, ma]));
  const isCurrentYear = selectedYear === now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const lastRealMonth = isCurrentYear ? currentMonthIdx : 11;

  return MONTH_NAMES.map((month, index) => {
    const isFuture = isCurrentYear && index > currentMonthIdx;
    const targetMonth = new Date(selectedYear, index, 1);
    const subsInMonth = subscriptions.filter(sub => getMonthStartFromDate(sub.purchaseDate) <= targetMonth);
    const uniqueManualAccounts = new Set<string>();

    let revenue = 0;
    let cost = 0;

    subsInMonth.forEach(sub => {
      const pricingConfig = pricingMap.get(sub.platform);
      revenue += getSubscriptionRevenue(sub, pricingConfig);

      if (sub.master_account_id) {
        cost += getStockSubscriptionCost(sub, masterAccountsMap.get(sub.master_account_id));
        return;
      }

      const key = getManualAccountKey(sub);
      const isNewAccount = !uniqueManualAccounts.has(key);
      if (isNewAccount) uniqueManualAccounts.add(key);
      cost += getManualSubscriptionCost(sub, pricingConfig, isNewAccount);
    });

    const profit = revenue - cost;

    return {
      month,
      monthFull: MONTH_FULL[index],
      Ingresos: !isFuture ? revenue : null,
      Costos: !isFuture ? cost : null,
      Ganancia: !isFuture ? profit : null,
      IngresosProj: (index === lastRealMonth || isFuture) ? revenue : null,
      CostosProj: (index === lastRealMonth || isFuture) ? cost : null,
      GananciaProj: (index === lastRealMonth || isFuture) ? profit : null,
      clients: subsInMonth.reduce((acc, sub) => acc + getProfilesSold(sub), 0),
      isFuture,
    };
  });
}

export const FINANCE_MONTH_FULL = MONTH_FULL;
export const FINANCE_MONTH_NAMES = MONTH_NAMES;
