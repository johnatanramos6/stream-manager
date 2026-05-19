import { describe, expect, it } from 'vitest';
import { calculateCurrentFinancialStats, calculateMonthlyFinancialSnapshots } from './finance';
import { MasterAccount } from '@/types/masterAccount';
import { PlatformPricing } from '@/types/platformPricing';
import { Subscription } from '@/types/subscription';

const pricing: PlatformPricing[] = [
  { platform: 'Netflix', costType: 'per_screen', costPrice: 5000, salePrice: 10000 },
  { platform: 'IPTV Premium', costType: 'per_account', costPrice: 8000, salePrice: 20000 },
];

const masterAccount: MasterAccount = {
  id: 'ma-1',
  vendor_id: 'vendor-1',
  platform: 'Netflix',
  account_email: 'master@example.com',
  account_password: 'secret',
  total_profiles: 4,
  purchase_price: 20000,
  notes: '',
  created_at: '2026-05-18T00:00:00Z',
  purchase_date: '2026-05-18',
  duration_days: 30,
};

const baseSub: Subscription = {
  id: 'sub-1',
  platform: 'Netflix',
  accountEmail: 'master@example.com',
  accountPassword: 'secret',
  clientName: 'Cliente prueba',
  purchaseDate: '2026-05-18',
  profilePin: '1234',
  paymentStatus: 'pagado',
  notes: '',
  duration_days: 30,
};

describe('finance calculations', () => {
  it('recognizes real profit while keeping the master account purchase in monthly costs', () => {
    const fullAccountSale: Subscription = {
      ...baseSub,
      master_account_id: masterAccount.id,
      profiles_sold: 4,
      salePriceOverride: 30000,
    };

    const stats = calculateCurrentFinancialStats([fullAccountSale], [masterAccount], pricing);

    expect(stats.totalRevenue).toBe(30000);
    expect(stats.totalCost).toBe(20000);
    expect(stats.platformStats[0].soldCost).toBe(20000);
    expect(stats.totalProfit).toBe(10000);
    expect(stats.totalClients).toBe(4);
  });

  it('allocates stock cost proportionally for partial profile sales', () => {
    const oneProfileSale: Subscription = {
      ...baseSub,
      master_account_id: masterAccount.id,
      profiles_sold: 1,
      salePriceOverride: 10000,
    };

    const stats = calculateCurrentFinancialStats([oneProfileSale], [masterAccount], pricing);

    expect(stats.totalRevenue).toBe(10000);
    expect(stats.totalCost).toBe(20000);
    expect(stats.platformStats[0].soldCost).toBe(5000);
    expect(stats.totalProfit).toBe(5000);
  });

  it('counts unsold master accounts as monthly costs without reducing real sales profit', () => {
    const stats = calculateCurrentFinancialStats([], [masterAccount], pricing);

    expect(stats.totalRevenue).toBe(0);
    expect(stats.totalCost).toBe(20000);
    expect(stats.totalProfit).toBe(0);
    expect(stats.platformStats[0]).toMatchObject({ platform: 'Netflix', accounts: 1, clients: 0, cost: 20000, soldCost: 0 });
  });

  it('counts per-account manual cost only once for the same account', () => {
    const firstProfile: Subscription = {
      ...baseSub,
      id: 'iptv-1',
      platform: 'IPTV Premium',
      accountEmail: 'iptv@example.com',
      salePriceOverride: 20000,
    };
    const secondProfile: Subscription = {
      ...firstProfile,
      id: 'iptv-2',
      clientName: 'Otro cliente',
    };

    const stats = calculateCurrentFinancialStats([firstProfile, secondProfile], [], pricing);

    expect(stats.totalRevenue).toBe(40000);
    expect(stats.totalCost).toBe(8000);
    expect(stats.totalProfit).toBe(32000);
  });

  it('uses the same separated cost and profit logic in monthly snapshots', () => {
    const fullAccountSale: Subscription = {
      ...baseSub,
      master_account_id: masterAccount.id,
      profiles_sold: 4,
      salePriceOverride: 30000,
    };

    const monthly = calculateMonthlyFinancialSnapshots(
      [fullAccountSale],
      [masterAccount],
      pricing,
      2026,
      new Date('2026-05-18T12:00:00')
    );

    expect(monthly[4].Ingresos).toBe(30000);
    expect(monthly[4].Costos).toBe(20000);
    expect(monthly[4].Ganancia).toBe(10000);
    expect(monthly[4].clients).toBe(4);
  });
});
