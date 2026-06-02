import { useState, useMemo, useEffect } from 'react';
import { Subscription } from '@/types/subscription';
import { PlatformPricing, DEFAULT_PRICING, formatCOP } from '@/types/platformPricing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Users, Monitor, Save, AlertCircle, Plus, X, ChevronLeft, ChevronRight, CalendarDays, Loader2, Calendar, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { MasterAccount } from '@/types/masterAccount';
import { calculateCurrentFinancialStats, calculateMonthlyFinancialSnapshots, getSubscriptionRevenue, getStockSubscriptionCost, getMasterAccountMonthlyCost, FINANCE_MONTH_FULL, FINANCE_MONTH_NAMES } from '@/lib/finance';

interface Props {
  subscriptions: Subscription[];
  masterAccounts: MasterAccount[];
  onPricingSaved?: () => void;
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

// ── Helper: calcular finanzas de un día específico ──
function calculateDailyStats(
  subscriptions: Subscription[],
  masterAccounts: MasterAccount[],
  pricing: PlatformPricing[],
  targetDate: Date
) {
  const pricingMap = new Map(pricing.map(p => [p.platform, p]));
  const masterAccountsMap = new Map(masterAccounts.map(ma => [ma.id, ma]));
  const dateStr = targetDate.toISOString().split('T')[0];

  // Suscripciones activas en ese día
  const activeSubs = subscriptions.filter(sub => {
    const purchaseDate = sub.purchaseDate;
    const days = sub.duration_days || 30;
    const start = new Date(purchaseDate + 'T12:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const target = new Date(dateStr + 'T12:00:00');
    return target >= start && target <= end;
  });

  // Suscripciones creadas ese día
  const createdSubs = subscriptions.filter(sub => sub.purchaseDate === dateStr);

  // Suscripciones que vencen ese día
  const expiringSubs = subscriptions.filter(sub => {
    const start = new Date(sub.purchaseDate + 'T12:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + (sub.duration_days || 30));
    const endStr = end.toISOString().split('T')[0];
    return endStr === dateStr;
  });

  let revenue = 0;
  let cost = 0;
  activeSubs.forEach(sub => {
    const pricingConfig = pricingMap.get(sub.platform);
    const subRevenue = getSubscriptionRevenue(sub, pricingConfig);
    // Prorrateado diario
    const days = sub.duration_days || 30;
    revenue += subRevenue / 30 * 1; // Revenue mensual / 30 = diario

    if (sub.master_account_id) {
      const ma = masterAccountsMap.get(sub.master_account_id);
      if (ma) {
        cost += getStockSubscriptionCost(sub, ma) / 30;
      }
    } else {
      const costPrice = pricingConfig?.costPrice || 0;
      cost += costPrice / 30;
    }
  });

  const profit = revenue - cost;

  return {
    activeSubs: activeSubs.length,
    createdSubs: createdSubs.length,
    expiringSubs: expiringSubs.length,
    revenue,
    cost,
    profit,
    details: activeSubs,
  };
}

export default function FinanceSection({ subscriptions, masterAccounts, onPricingSaved }: Props) {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<PlatformPricing[]>(DEFAULT_PRICING);
  const [editing, setEditing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isSaving, setIsSaving] = useState(false);
  const [showDailyView, setShowDailyView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) return;
    const fetchPricing = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.user_metadata?.pricing_config) {
        setPricing(authData.user.user_metadata.pricing_config);
      } else {
        setPricing([...DEFAULT_PRICING]);
      }
    };
    fetchPricing();
  }, [user]);

  const handlePricingChange = (index: number, field: keyof PlatformPricing, value: string | number) => {
    setPricing(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleAddPlatform = () => {
    setPricing(prev => [...prev, { platform: '', costType: 'per_screen', costPrice: 0, salePrice: 0 }]);
  };

  const handleRemovePlatform = (index: number) => {
    setPricing(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePricing = async () => {
    if (!user) return;
    
    // Validar que no haya plataformas vacías
    const hasEmptyPlatforms = pricing.some(p => !p.platform || p.platform.trim() === '');
    if (hasEmptyPlatforms) {
      toast.error('No puedes guardar plataformas con nombres vacíos.');
      return;
    }

    setIsSaving(true);
    // Guardar en user_metadata no requiere SQL y no tiene bloqueos de RLS
    const { error } = await supabase.auth.updateUser({
      data: { pricing_config: pricing }
    });
    setIsSaving(false);
    
    if (error) {
      toast.error('Error al guardar los precios');
      console.error(error);
    } else {
      toast.success('Precios guardados en la nube correctamente');
      setEditing(false);
      if (onPricingSaved) onPricingSaved();
    }
  };

  const stats = useMemo(() => {
    return calculateCurrentFinancialStats(subscriptions, masterAccounts, pricing);
  }, [subscriptions, masterAccounts, pricing]);

  const chartData = stats.platformStats.map(ps => ({
    name: ps.platform.length > 12 ? ps.platform.substring(0, 10) + '…' : ps.platform,
    Ganancia: ps.profit,
    Costo: ps.cost,
    Ingreso: ps.revenue,
  }));

  // ── Datos mensuales para el gráfico de tendencia ──
  const currentMonthIdx = new Date().getMonth();
  const monthlyData = useMemo(() => {
    return calculateMonthlyFinancialSnapshots(subscriptions, masterAccounts, pricing, selectedYear);
  }, [subscriptions, masterAccounts, pricing, selectedYear]);

  // Solo sumar meses reales (no futuros) para el total anual
  const realMonths = monthlyData.filter(m => !m.isFuture);
  const annualTotal = realMonths.reduce((acc, m) => acc + (m.Ingresos || 0), 0);
  const annualProfit = realMonths.reduce((acc, m) => acc + (m.Ganancia || 0), 0);
  const annualCost = realMonths.reduce((acc, m) => acc + (m.Costos || 0), 0);
  const currentMonthRevenue = monthlyData[currentMonthIdx]?.Ingresos || 0;
  const currentMonthProfit = monthlyData[currentMonthIdx]?.Ganancia || 0;
  const currentMonthCost = monthlyData[currentMonthIdx]?.Costos || 0;
  const prevMonthRevenue = currentMonthIdx > 0 ? (monthlyData[currentMonthIdx - 1]?.Ingresos || 0) : 0;
  const prevMonthProfit = currentMonthIdx > 0 ? (monthlyData[currentMonthIdx - 1]?.Ganancia || 0) : 0;
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

  // ── Daily stats ──
  const dailyStats = useMemo(() => {
    if (!showDailyView) return null;
    return calculateDailyStats(subscriptions, masterAccounts, pricing, new Date(selectedDate + 'T12:00:00'));
  }, [showDailyView, selectedDate, subscriptions, masterAccounts, pricing]);

  const selectedDateObj = new Date(selectedDate + 'T12:00:00');
  const dayLabel = selectedDateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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

      {/* ── Vista Diaria Desplegable ── */}
      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in-up shadow-sm">
        <button
          onClick={() => setShowDailyView(p => !p)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm sm:text-base">Finanzas por Día</h3>
            <span className="text-xs text-muted-foreground ml-1">— Consulta las métricas de un día específico</span>
          </div>
          <div className="flex items-center gap-2">
            {showDailyView ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {showDailyView && (
          <div className="border-t p-4 space-y-4">
            {/* Date picker */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-muted-foreground">Seleccionar fecha:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button size="sm" variant="outline" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                Hoy
              </Button>
            </div>

            {/* Day label */}
            <p className="text-xs text-muted-foreground capitalize">{dayLabel}</p>

            {dailyStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                  <p className="text-lg font-bold text-primary">{dailyStats.activeSubs}</p>
                  <p className="text-[10px] text-muted-foreground">Suscripciones activas</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{dailyStats.createdSubs}</p>
                  <p className="text-[10px] text-muted-foreground">Nuevas ese día</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                  <p className="text-lg font-bold text-red-500">{dailyStats.expiringSubs}</p>
                  <p className="text-[10px] text-muted-foreground">Vencen ese día</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCOP(dailyStats.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">Ingreso diario prorrat.</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 text-center">
                  <p className="text-lg font-bold text-orange-500">{formatCOP(dailyStats.cost)}</p>
                  <p className="text-[10px] text-muted-foreground">Costo diario prorrat.</p>
                </div>
                <div className={`p-3 rounded-lg text-center border ${dailyStats.profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                  <p className={`text-lg font-bold ${dailyStats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{formatCOP(dailyStats.profit)}</p>
                  <p className="text-[10px] text-muted-foreground">Ganancia diaria prorrat.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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

        {/* ── Resumen Anual Acumulado ── */}
        <div className="p-4 border-b bg-muted/5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            📊 Acumulado del año {selectedYear} <span className="normal-case font-normal">(suma de todos los meses transcurridos)</span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-lg sm:text-xl font-bold text-primary">{formatCOP(annualTotal)}</p>
              <p className="text-[10px] text-muted-foreground">Total facturado</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-lg sm:text-xl font-bold text-red-500">{formatCOP(annualCost)}</p>
              <p className="text-[10px] text-muted-foreground">Total costos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(annualProfit)}</p>
              <p className="text-[10px] text-muted-foreground">Total ganancia neta</p>
            </div>
          </div>
        </div>

        {/* ── Comparativa mes actual vs anterior ── */}
        <div className="p-4 border-b bg-muted/5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            📅 Comparativa mensual
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(currentMonthRevenue)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Ingresos de {FINANCE_MONTH_FULL[currentMonthIdx]}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Solo este mes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(currentMonthProfit)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Ganancia de {FINANCE_MONTH_FULL[currentMonthIdx]}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Solo este mes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30 border">
              <p className="text-lg sm:text-xl font-bold text-muted-foreground">{formatCOP(prevMonthRevenue)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Ingresos de {currentMonthIdx > 0 ? FINANCE_MONTH_FULL[currentMonthIdx - 1] : '—'}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Mes anterior</p>
            </div>
            <div className={`text-center p-3 rounded-lg border ${isGrowing ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
              <p className={`text-lg sm:text-xl font-bold flex items-center justify-center gap-1 ${isGrowing ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {isGrowing ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {prevMonthRevenue > 0 ? `${trendPercent > 0 ? '+' : ''}${trendPercent.toFixed(1)}%` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">Variación</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">{FINANCE_MONTH_FULL[currentMonthIdx]} vs {currentMonthIdx > 0 ? FINANCE_MONTH_FULL[currentMonthIdx - 1] : '—'}</p>
            </div>
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
                labelFormatter={(label) => `${FINANCE_MONTH_FULL[FINANCE_MONTH_NAMES.indexOf(label)]} ${selectedYear}`}
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
              <Button size="sm" onClick={handleSavePricing} disabled={isSaving} className="gap-1.5 shadow-lg shadow-primary/20">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isSaving ? 'Guardando...' : 'Guardar'}
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
