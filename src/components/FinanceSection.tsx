import { useState, useMemo } from 'react';
import { Subscription } from '@/types/subscription';
import { PlatformPricing, loadPricing, savePricing, formatCOP } from '@/types/platformPricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, Monitor, Save } from 'lucide-react';

interface Props {
  subscriptions: Subscription[];
}

export default function FinanceSection({ subscriptions }: Props) {
  const [pricing, setPricing] = useState<PlatformPricing[]>(loadPricing);
  const [editing, setEditing] = useState(false);

  const handlePricingChange = (index: number, field: 'costPrice' | 'salePrice', value: string) => {
    setPricing(prev => prev.map((p, i) => i === index ? { ...p, [field]: Number(value) || 0 } : p));
  };

  const handleSavePricing = () => {
    savePricing(pricing);
    setEditing(false);
  };

  const stats = useMemo(() => {
    const pricingMap = new Map(pricing.map(p => [p.platform, p]));

    // Group subscriptions by platform
    const byPlatform = new Map<string, Subscription[]>();
    subscriptions.forEach(sub => {
      const list = byPlatform.get(sub.platform) || [];
      list.push(sub);
      byPlatform.set(sub.platform, list);
    });

    // Group by unique account (accountEmail + accountPassword combo)
    const uniqueAccounts = new Map<string, { platform: string; clients: number }>();
    subscriptions.forEach(sub => {
      const key = `${sub.platform}::${sub.accountEmail}::${sub.accountPassword}`;
      const existing = uniqueAccounts.get(key);
      if (existing) {
        existing.clients++;
      } else {
        uniqueAccounts.set(key, { platform: sub.platform, clients: 1 });
      }
    });

    let totalRevenue = 0;
    let totalCost = 0;

    const platformStats: {
      platform: string;
      accounts: number;
      clients: number;
      cost: number;
      revenue: number;
      profit: number;
      profitPerScreen: number;
    }[] = [];

    const platformAccounts = new Map<string, { accounts: number; clients: number }>();
    uniqueAccounts.forEach(({ platform, clients }) => {
      const existing = platformAccounts.get(platform) || { accounts: 0, clients: 0 };
      existing.accounts++;
      existing.clients += clients;
      platformAccounts.set(platform, existing);
    });

    platformAccounts.forEach((data, platform) => {
      const p = pricingMap.get(platform) || { costPrice: 0, salePrice: 0 };
      const cost = data.accounts * p.costPrice;
      const revenue = data.clients * p.salePrice;
      const profit = revenue - cost;

      totalCost += cost;
      totalRevenue += revenue;

      platformStats.push({
        platform,
        accounts: data.accounts,
        clients: data.clients,
        cost,
        revenue,
        profit,
        profitPerScreen: data.clients > 0 ? profit / data.clients : 0,
      });
    });

    platformStats.sort((a, b) => b.profit - a.profit);

    return { totalRevenue, totalCost, totalProfit: totalRevenue - totalCost, platformStats, totalClients: subscriptions.length };
  }, [subscriptions, pricing]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos mensuales', value: formatCOP(stats.totalRevenue), icon: DollarSign, color: 'text-primary' },
          { label: 'Costos mensuales', value: formatCOP(stats.totalCost), icon: Monitor, color: 'text-destructive' },
          { label: 'Ganancia mensual', value: formatCOP(stats.totalProfit), icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Total pantallas', value: stats.totalClients, icon: Users, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className={`${s.color} bg-muted rounded-lg p-2`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Profit by platform */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Ganancia por plataforma</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-semibold">Plataforma</th>
                <th className="text-right p-3 font-semibold">Cuentas</th>
                <th className="text-right p-3 font-semibold">Pantallas</th>
                <th className="text-right p-3 font-semibold">Costo</th>
                <th className="text-right p-3 font-semibold">Ingresos</th>
                <th className="text-right p-3 font-semibold">Ganancia</th>
                <th className="text-right p-3 font-semibold">Por pantalla</th>
              </tr>
            </thead>
            <tbody>
              {stats.platformStats.map(ps => (
                <tr key={ps.platform} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{ps.platform}</td>
                  <td className="p-3 text-right">{ps.accounts}</td>
                  <td className="p-3 text-right">{ps.clients}</td>
                  <td className="p-3 text-right text-destructive">{formatCOP(ps.cost)}</td>
                  <td className="p-3 text-right">{formatCOP(ps.revenue)}</td>
                  <td className="p-3 text-right font-bold text-emerald-600">{formatCOP(ps.profit)}</td>
                  <td className="p-3 text-right text-muted-foreground">{formatCOP(ps.profitPerScreen)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-bold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right">{stats.platformStats.reduce((a, b) => a + b.accounts, 0)}</td>
                <td className="p-3 text-right">{stats.totalClients}</td>
                <td className="p-3 text-right text-destructive">{formatCOP(stats.totalCost)}</td>
                <td className="p-3 text-right">{formatCOP(stats.totalRevenue)}</td>
                <td className="p-3 text-right text-emerald-600">{formatCOP(stats.totalProfit)}</td>
                <td className="p-3 text-right text-muted-foreground">{stats.totalClients > 0 ? formatCOP(stats.totalProfit / stats.totalClients) : '$0'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Editable pricing */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Precios por plataforma</h3>
          {editing ? (
            <Button size="sm" onClick={handleSavePricing} className="gap-1">
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar precios</Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-semibold">Plataforma</th>
                <th className="text-right p-3 font-semibold">Precio compra (cuenta)</th>
                <th className="text-right p-3 font-semibold">Precio venta (pantalla)</th>
                <th className="text-right p-3 font-semibold">Margen por pantalla</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map((p, i) => (
                <tr key={p.platform} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{p.platform}</td>
                  <td className="p-3 text-right">
                    {editing ? (
                      <Input type="number" value={p.costPrice} onChange={e => handlePricingChange(i, 'costPrice', e.target.value)} className="w-28 ml-auto text-right" />
                    ) : formatCOP(p.costPrice)}
                  </td>
                  <td className="p-3 text-right">
                    {editing ? (
                      <Input type="number" value={p.salePrice} onChange={e => handlePricingChange(i, 'salePrice', e.target.value)} className="w-28 ml-auto text-right" />
                    ) : formatCOP(p.salePrice)}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-600">{formatCOP(p.salePrice - p.costPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
