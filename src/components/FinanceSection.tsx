import { useState, useMemo } from 'react';
import { Subscription } from '@/types/subscription';
import { PlatformPricing, loadPricing, savePricing, formatCOP } from '@/types/platformPricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, Monitor, Save, AlertCircle, Plus, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  subscriptions: Subscription[];
}

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b', '#84cc16'];

export default function FinanceSection({ subscriptions }: Props) {
  const [pricing, setPricing] = useState<PlatformPricing[]>(loadPricing);
  const [editing, setEditing] = useState(false);

  const handlePricingChange = (index: number, field: keyof PlatformPricing, value: string | number) => {
    setPricing(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleAddPlatform = () => {
    setPricing(prev => [...prev, { platform: '', costType: 'per_screen', costPrice: 0, salePrice: 0 }]);
  };

  const handleRemovePlatform = (index: number) => {
    setPricing(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePricing = () => {
    savePricing(pricing);
    setEditing(false);
  };

  const stats = useMemo(() => {
    const pricingMap = new Map(pricing.map(p => [p.platform, p]));

    const platformStatsMap = new Map<string, { accounts: number; clients: number; revenue: number; cost: number; profit: number; marginPercent: number }>();
    const uniqueAccounts = new Set<string>();

    subscriptions.forEach(sub => {
      const p = pricingMap.get(sub.platform);
      
      // Calculate revenue (using override if provided for IPTV combinations or individual deals)
      const salePrice = p ? p.salePrice : 0;
      const actualRevenue = sub.salePriceOverride ?? salePrice;

      const ps = platformStatsMap.get(sub.platform) || { accounts: 0, clients: 0, revenue: 0, cost: 0, profit: 0, marginPercent: 0 };
      ps.clients++;
      ps.revenue += actualRevenue;

      // Grouping logic for accounts
      const key = sub.accountEmail
        ? `${sub.platform}::${sub.accountEmail.trim().toLowerCase()}`
        : `ungrouped::${sub.id}`;

      if (!uniqueAccounts.has(key)) {
        uniqueAccounts.add(key);
        ps.accounts++;
      }

      platformStatsMap.set(sub.platform, ps);
    });

    let totalRevenue = 0;
    let totalCost = 0;
    const platformStats: { platform: string; accounts: number; clients: number; cost: number; revenue: number; profit: number; marginPercent: number }[] = [];

    platformStatsMap.forEach((ps, platform) => {
      // @ts-ignore - backward compatibility for items missing costType
      const p = pricingMap.get(platform) || { costPrice: 0, salePrice: 0, costType: platform === 'IPTV Premium' ? 'per_account' : 'per_screen' };
      const cType = (p as any).costType || (platform === 'IPTV Premium' ? 'per_account' : 'per_screen');

      // Si es de tipo cuenta, el costo se multiplica por las cuentas únicas. Si es por pantalla, se multiplica por cuántos clientes hay.
      ps.cost = cType === 'per_account' ? (ps.accounts * p.costPrice) : (ps.clients * p.costPrice);
      ps.profit = ps.revenue - ps.cost;
      ps.marginPercent = ps.revenue > 0 ? (ps.profit / ps.revenue) * 100 : 0;

      totalCost += ps.cost;
      totalRevenue += ps.revenue;

      platformStats.push({ platform, ...ps });
    });

    platformStats.sort((a, b) => b.profit - a.profit);

    // Pending collections
    const pendingCount = subscriptions.filter(s => s.paymentStatus === 'debe' || s.paymentStatus === 'cobrar').length;
    const pendingAmount = subscriptions
      .filter(s => s.paymentStatus === 'debe' || s.paymentStatus === 'cobrar')
      .reduce((acc, s) => {
        const p = pricingMap.get(s.platform);
        const actualPrice = s.salePriceOverride ?? (p?.salePrice || 0);
        return acc + actualPrice;
      }, 0);

    return { totalRevenue, totalCost, totalProfit: totalRevenue - totalCost, platformStats, totalClients: subscriptions.length, pendingCount, pendingAmount };
  }, [subscriptions, pricing]);

  const chartData = stats.platformStats.map(ps => ({
    name: ps.platform.length > 12 ? ps.platform.substring(0, 10) + '…' : ps.platform,
    Ganancia: ps.profit,
    Costo: ps.cost,
    Ingreso: ps.revenue,
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Ingresos mensuales', value: formatCOP(stats.totalRevenue), icon: DollarSign, color: 'text-primary', bg: 'stat-gradient-primary', iconBg: 'bg-primary/10' },
          { label: 'Costos mensuales', value: formatCOP(stats.totalCost), icon: Monitor, color: 'text-destructive', bg: 'stat-gradient-danger', iconBg: 'bg-destructive/10' },
          { label: 'Ganancia mensual', value: formatCOP(stats.totalProfit), icon: TrendingUp, color: 'text-emerald-500', bg: 'stat-gradient-success', iconBg: 'bg-emerald-500/10' },
          { label: 'Total pantallas', value: stats.totalClients, icon: Users, color: 'text-amber-500', bg: 'stat-gradient-warning', iconBg: 'bg-amber-500/10' },
          { label: 'Cobros pendientes', value: `${stats.pendingCount}`, icon: AlertCircle, color: 'text-orange-500', bg: 'stat-gradient-warning', iconBg: 'bg-orange-500/10' },
        ].map((s, i) => (
          <div key={s.label} className={`${s.bg} rounded-xl border p-4 flex items-center gap-3 card-hover animate-fade-in-up delay-${i + 1}`}>
            <div className={`${s.iconBg} ${s.color} rounded-xl p-2.5 shrink-0`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base lg:text-lg font-bold truncate">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending collections alert */}
      {stats.pendingCount > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              Tienes {stats.pendingCount} cobro{stats.pendingCount > 1 ? 's' : ''} pendiente{stats.pendingCount > 1 ? 's' : ''} por {formatCOP(stats.pendingAmount)}
            </p>
            <p className="text-xs text-muted-foreground">Revisa la pestaña de clientes para gestionar los pagos.</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden animate-fade-in-up">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Ganancia por plataforma</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Comparación visual de ganancias</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCOP(value)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '12px' }}
                />
                <Bar dataKey="Ganancia" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Profit by platform table */}
      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Detalle por plataforma</h3>
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
                <th className="text-right p-3 font-semibold">Ganancia Neta</th>
                <th className="text-right p-3 font-semibold">Margen</th>
              </tr>
            </thead>
            <tbody>
              {stats.platformStats.map(ps => (
                <tr key={ps.platform} className="border-t transition-colors hover:bg-muted/30">
                  <td className="p-3 font-medium">{ps.platform}</td>
                  <td className="p-3 text-right">{ps.accounts}</td>
                  <td className="p-3 text-right">{ps.clients}</td>
                  <td className="p-3 text-right text-destructive">{formatCOP(ps.cost)}</td>
                  <td className="p-3 text-right">{formatCOP(ps.revenue)}</td>
                  <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(ps.profit)}</td>
                  <td className="p-3 text-right text-muted-foreground">{ps.marginPercent.toFixed(1)}%</td>
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
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{formatCOP(stats.totalProfit)}</td>
                <td className="p-3 text-right text-muted-foreground">
                  {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Editable pricing */}
      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Precios por plataforma</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Configura tus costos y precios de venta</p>
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleAddPlatform} className="gap-1.5 border-dashed">
                <Plus className="h-3.5 w-3.5" /> Agregar Plataforma
              </Button>
              <Button size="sm" onClick={handleSavePricing} className="gap-1.5 shadow-lg shadow-primary/20">
                <Save className="h-3.5 w-3.5" /> Guardar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar precios</Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-semibold">Plataforma</th>
                <th className="text-right p-3 font-semibold">Costo COMPRA (por Cuenta)</th>
                <th className="text-right p-3 font-semibold">Precio VENTA (por Pantalla)</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map((p, i) => (
                <tr key={i} className="border-t transition-colors hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {editing ? (
                      <Input value={p.platform} onChange={e => handlePricingChange(i, 'platform', e.target.value)} placeholder="Nombre plataforma" className="w-full min-w-[140px]" />
                    ) : p.platform}
                  </td>
                  <td className="p-3 text-right">
                    {editing ? (
                      <Input type="number" value={p.costPrice || ''} onChange={e => handlePricingChange(i, 'costPrice', e.target.value === '' ? 0 : Number(e.target.value))} className="w-28 ml-auto text-right" placeholder="0" />
                    ) : formatCOP(p.costPrice)}
                  </td>
                  <td className="p-3 text-right">
                    {editing ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Input type="number" value={p.salePrice || ''} onChange={e => handlePricingChange(i, 'salePrice', e.target.value === '' ? 0 : Number(e.target.value))} className="w-28 text-right" placeholder="0" />
                        <button type="button" onClick={() => handleRemovePlatform(i)} className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors" title="Eliminar plataforma">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : formatCOP(p.salePrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
