import { useState, useMemo } from 'react';
import { Subscription } from '@/types/subscription';
import { PlatformPricing, loadPricing, savePricing, formatCOP } from '@/types/platformPricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Users, Monitor, Save, AlertCircle, Plus, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface Props {
  subscriptions: Subscription[];
}

const getPlatformBrandColor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('netflix')) return '#E50914';
  if (n.includes('disney')) return '#040b3c'; // Disney dark blue
  if (n.includes('amazon') || n.includes('prime')) return '#00A8E1';
  if (n.includes('hbo') || n.includes('max')) return '#991EEB';
  if (n.includes('star')) return '#F97316'; // Star+ orange/red
  if (n.includes('crunchyroll')) return '#F47521';
  if (n.includes('claro')) return '#DC2626';
  if (n.includes('hulu')) return '#1CE783';
  if (n.includes('apple')) return '#111827';
  if (n.includes('spotify')) return '#1DB954';
  if (n.includes('paramount')) return '#0064FF';
  if (n.includes('iptv')) return '#10B981'; // Generic IPTV green
  if (n.includes('youtube')) return '#FF0000';
  if (n.includes('vix')) return '#f91d58';
  
  // Fallback map
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  const fallbacks = ['#4f46e5', '#06b6d4', '#8b5cf6', '#84cc16', '#f59e0b', '#ec4899', '#64748b'];
  return fallbacks[Math.abs(hash) % fallbacks.length];
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function FinanceSection({ subscriptions }: Props) {
  const [pricing, setPricing] = useState<PlatformPricing[]>(loadPricing);
  const [editing, setEditing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  // ── Datos mensuales para el gráfico de tendencia ──
  const currentMonthIdx = new Date().getMonth();
  const isCurrentYear = selectedYear === new Date().getFullYear();
  const lastRealMonth = isCurrentYear ? currentMonthIdx : 11;

  const monthlyData = useMemo(() => {
    const pricingMap = new Map(pricing.map(p => [p.platform, p]));
    const months: { month: string; monthFull: string; Ingresos: number | null; Costos: number | null; Ganancia: number | null; IngresosProj: number | null; CostosProj: number | null; GananciaProj: number | null; clients: number; isFuture: boolean }[] = [];

    for (let m = 0; m < 12; m++) {
      const isFuture = isCurrentYear && m > currentMonthIdx;

      const subsInMonth = subscriptions.filter(sub => {
        const d = new Date(sub.purchaseDate + 'T12:00:00');
        const subStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const targetMonth = new Date(selectedYear, m, 1);
        return subStart <= targetMonth;
      });

      let revenue = 0;
      let cost = 0;
      const uniqueAccounts = new Set<string>();

      subsInMonth.forEach(sub => {
        const p = pricingMap.get(sub.platform);
        const salePrice = p ? p.salePrice : 0;
        revenue += sub.salePriceOverride ?? salePrice;

        const key = sub.accountEmail
          ? `${sub.platform}::${sub.accountEmail.trim().toLowerCase()}`
          : `ungrouped::${sub.id}`;

        const cType = (p as any)?.costType || 'per_screen';
        if (cType === 'per_account') {
          if (!uniqueAccounts.has(key)) {
            uniqueAccounts.add(key);
            cost += p?.costPrice || 0;
          }
        } else {
          cost += p?.costPrice || 0;
        }
      });

      months.push({
        month: MONTH_NAMES[m],
        monthFull: MONTH_FULL[m],
        Ingresos: !isFuture ? revenue : null,
        Costos: !isFuture ? cost : null,
        Ganancia: !isFuture ? revenue - cost : null,
        IngresosProj: (m === lastRealMonth || isFuture) ? revenue : null,
        CostosProj: (m === lastRealMonth || isFuture) ? cost : null,
        GananciaProj: (m === lastRealMonth || isFuture) ? revenue - cost : null,
        clients: subsInMonth.length,
        isFuture
      });
    }
    return months;
  }, [subscriptions, pricing, selectedYear, currentMonthIdx, isCurrentYear, lastRealMonth]);

  // Solo sumar meses reales (no futuros) para el total anual
  const realMonths = monthlyData.filter(m => !m.isFuture);
  const annualTotal = realMonths.reduce((acc, m) => acc + (m.Ingresos || 0), 0);
  const annualProfit = realMonths.reduce((acc, m) => acc + (m.Ganancia || 0), 0);
  const currentMonthRevenue = monthlyData[currentMonthIdx]?.Ingresos || 0;
  const prevMonthRevenue = currentMonthIdx > 0 ? (monthlyData[currentMonthIdx - 1]?.Ingresos || 0) : 0;
  const trendPercent = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
  const isGrowing = trendPercent >= 0;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    subscriptions.forEach(s => {
      const y = new Date(s.purchaseDate + 'T12:00:00').getFullYear();
      if (y > 2020) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [subscriptions]);

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

      {/* ── Gráfico de Tendencia Mensual ── */}
      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in-up shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/10">
          <div>
            <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Tendencia Mensual de Ingresos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Visualiza el crecimiento mes a mes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y - 1)} disabled={!availableYears.includes(selectedYear - 1) && selectedYear - 1 < Math.min(...availableYears)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold min-w-[50px] text-center">{selectedYear}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= new Date().getFullYear()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tarjetas de resumen anual */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b bg-muted/5">
          <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-lg sm:text-xl font-bold text-primary">{formatCOP(annualTotal)}</p>
            <p className="text-[10px] text-muted-foreground">Facturado {selectedYear}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(annualProfit)}</p>
            <p className="text-[10px] text-muted-foreground">Ganancia {selectedYear}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(currentMonthRevenue)}</p>
            <p className="text-[10px] text-muted-foreground">{MONTH_FULL[currentMonthIdx]} (actual)</p>
          </div>
          <div className={`text-center p-3 rounded-lg border ${isGrowing ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
            <p className={`text-lg sm:text-xl font-bold flex items-center justify-center gap-1 ${isGrowing ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {isGrowing ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {prevMonthRevenue > 0 ? `${trendPercent > 0 ? '+' : ''}${trendPercent.toFixed(1)}%` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">vs. {currentMonthIdx > 0 ? MONTH_FULL[currentMonthIdx - 1] : '—'}</p>
          </div>
        </div>

        <div className="p-4 pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGanancia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCostos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '13px', padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                formatter={(value: number | null, name: string) => {
                  if (value === null || value === undefined) return [null, null];
                  const isProj = name.includes('Proj');
                  const cleanName = name.replace('Proj', '');
                  const icon = cleanName === 'Ingresos' ? '💰' : cleanName === 'Ganancia' ? '📈' : '📉';
                  return [formatCOP(value), `${icon} ${cleanName}${isProj ? ' (proyección)' : ''}`];
                }}
                labelFormatter={(label) => `${MONTH_FULL[MONTH_NAMES.indexOf(label)]} ${selectedYear}`}
              />
              {/* Líneas reales (sólidas) */}
              <Area type="monotone" dataKey="Ingresos" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gradIngresos)" dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} connectNulls={false} />
              <Area type="monotone" dataKey="Ganancia" stroke="#10b981" strokeWidth={2} fill="url(#gradGanancia)" dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} connectNulls={false} />
              <Area type="monotone" dataKey="Costos" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" fill="url(#gradCostos)" dot={false} connectNulls={false} />
              {/* Líneas de proyección (punteadas, más suaves) */}
              <Area type="monotone" dataKey="IngresosProj" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="6 4" fill="none" dot={{ r: 2, fill: 'hsl(var(--primary))', strokeDasharray: '' }} connectNulls={false} name="IngresosProj" />
              <Area type="monotone" dataKey="GananciaProj" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 4" fill="none" dot={{ r: 2, fill: '#10b981', strokeDasharray: '' }} connectNulls={false} name="GananciaProj" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 sm:gap-6 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" /> Ingresos</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Ganancia</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" /> Costos</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-4 border-t-2 border-dashed border-muted-foreground/50 inline-block" /> Proyección</span>
          </div>
        </div>
      </div>

      {/* Chart de Rentabilidad por plataforma */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden animate-fade-in-up shadow-sm">
          <div className="p-4 border-b flex justify-between items-center bg-muted/10">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Análisis de Rentabilidad por Plataforma</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ingresos divididos en Costo base (Abajo) y Ganancia Neta (Arriba)</p>
            </div>
          </div>
          <div className="p-4 pt-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap="25%" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                  formatter={(value: number, name: string) => [formatCOP(value), name === 'Ganancia' ? '💰 Ganancia Neta' : '📉 Costos (Inversión)']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '13px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 600, padding: '2px 0' }}
                />
                <Bar dataKey="Costo" stackId="a" fill="hsl(var(--destructive)/0.25)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Ganancia" stackId="a" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={getPlatformBrandColor(entry.name)} />
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
