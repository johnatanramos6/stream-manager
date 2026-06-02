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
import { calculateCurrentFinancialStats, calculateMonthlyFinancialSnapshots, FINANCE_MONTH_FULL, FINANCE_MONTH_NAMES } from '@/lib/finance';

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

// ── Helper para obtener logos de Wikimedia/locales ──
export function getPlatformLogoDetails(platform: string): { logoUrl?: string; bgClass?: string; emoji?: string } | null {
  const name = platform.toLowerCase().trim();
  
  if (name.includes('netflix')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Netflix-new-icon.png', bgClass: 'bg-black', emoji: '🎬' };
  }
  if (name.includes('amazon') || name.includes('prime')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/e4/Prime_Video_Logo.svg', bgClass: 'bg-white p-1', emoji: '📦' };
  }
  if (name.includes('claro')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Claro_logo.svg', bgClass: 'bg-white p-1.5', emoji: '🔴' };
  }
  if (name.includes('paramount')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount%2B_logo.svg', bgClass: 'bg-[#0064FF] p-0.5', emoji: '🏔️' };
  }
  if (name.includes('max') || name.includes('hbo')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Max_logo.svg', bgClass: 'bg-[#002BE7] p-1.5', emoji: '🟣' };
  }
  if (name.includes('disney') || name.includes('star')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', bgClass: 'bg-[#0b133a] p-1.5', emoji: '🏰' };
  }
  if (name.includes('crunchyroll') || name.includes('crunchy')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Crunchyroll_logo.svg', bgClass: 'bg-white p-1', emoji: '🦊' };
  }
  if (name.includes('spotify')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', bgClass: 'bg-black p-1', emoji: '🎵' };
  }
  if (name.includes('plex')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Plex_logo_%282022%29.svg', bgClass: 'bg-[#1f2326] p-1', emoji: '🟡' };
  }
  if (name.includes('flujo')) {
    return { logoUrl: './flujo-logo.jpg', bgClass: 'bg-white p-1', emoji: '📺' };
  }
  if (name.includes('vix')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/ViX_logo.svg', bgClass: 'bg-white p-1', emoji: '🧡' };
  }
  if (name.includes('canva')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg', bgClass: 'bg-white p-1', emoji: '🎨' };
  }
  if (name.includes('capcut')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/CapCut_logo.svg', bgClass: 'bg-white p-1.5', emoji: '🎬' };
  }
  if (name.includes('microsoft') || name.includes('office') || name.includes('365') || name.includes('m365')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg', bgClass: 'bg-white p-1', emoji: '💼' };
  }
  if (name.includes('chatgpt') || name.includes('openai') || name.includes('gpt')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', bgClass: 'bg-[#10a37f] p-1.5', emoji: '🤖' };
  }
  if (name.includes('apple')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_logo.svg', bgClass: 'bg-black p-1.5', emoji: '🍎' };
  }
  if (name.includes('youtube')) {
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_play_button_icon_%282013%E2%80%932017%29.svg', bgClass: 'bg-white p-1', emoji: '🔴' };
  }
  return null;
}

// ── Custom Tick para el eje X que dibuja logo y nombre ──
const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const platformName = payload.value;
  const rawName = platformName.replace('…', '');
  const details = getPlatformLogoDetails(rawName);
  const color = getPlatformBrandColor(rawName);
  
  return (
    <g transform={`translate(${x},${y})`}>
      {details?.logoUrl ? (
        <g>
          {/* Círculo fondo blanco/negro según marca */}
          <circle cx={0} cy={14} r={11} fill={details.bgClass?.includes('bg-black') ? '#000000' : '#ffffff'} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          {/* Logo SVG/Imagen */}
          <image
            href={details.logoUrl}
            x={-7.5}
            y={6.5}
            width={15}
            height={15}
          />
        </g>
      ) : (
        <g>
          {/* Fallback de color de marca con el Emoji o inicial */}
          <circle cx={0} cy={14} r={11} fill={color} />
          <text
            x={0}
            y={17.5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={9}
            fontWeight="bold"
          >
            {rawName.includes('IPTV') ? '📺' : rawName.charAt(0).toUpperCase()}
          </text>
        </g>
      )}
      {/* Nombre de la plataforma */}
      <text
        x={0}
        y={38}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
        fontWeight={500}
      >
        {platformName}
      </text>
    </g>
  );
};

// ── Custom Tooltip con contraste 100% perfecto ──
const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isScaled = 'realCosto' in data;
    const realCosto = isScaled ? data.realCosto : data.Costo;
    const realGanancia = isScaled ? data.realGanancia : data.Ganancia;
    const realIngreso = isScaled ? data.realIngreso : (data.Costo + data.Ganancia);
    const platformName = data.name || '';
    
    return (
      <div className="bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl p-3.5 shadow-2xl space-y-2 min-w-[200px] text-xs">
        <p className="font-bold border-b border-zinc-800 pb-1 text-sm flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getPlatformBrandColor(platformName) }} />
          {platformName}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400 flex items-center gap-1">🔴 Costo base:</span>
            <span className="font-semibold text-red-400">{formatCOP(realCosto)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400 flex items-center gap-1">🟢 Ganancia Neta:</span>
            <span className="font-semibold text-emerald-400">{formatCOP(realGanancia)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-800 pt-1 font-bold text-sm">
            <span className="text-zinc-200">⚡ Ingreso Total:</span>
            <span className="text-indigo-400">{formatCOP(realIngreso)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ── Helper: ventas de un día específico (simple, sin prorrateo) ──
interface DailySale {
  clientName: string;
  platform: string;
  profiles: number;
  income: number;
  cost: number;
  profit: number;
}

interface DailyPlatformSummary {
  platform: string;
  count: number;
  profiles: number;
  income: number;
  cost: number;
  profit: number;
}

interface DailyStatsResult {
  sales: DailySale[];
  platformSummary: DailyPlatformSummary[];
  totalIncome: number;
  totalCost: number;
  totalProfit: number;
  totalSales: number;
  totalProfiles: number;
}

function calculateDailyStats(
  subscriptions: Subscription[],
  masterAccounts: MasterAccount[],
  pricing: PlatformPricing[],
  targetDate: Date
): DailyStatsResult {
  const pricingMap = new Map(pricing.map(p => [p.platform, p]));
  const masterAccountsMap = new Map(masterAccounts.map(ma => [ma.id, ma]));
  const dateStr = targetDate.toISOString().split('T')[0];

  // Solo suscripciones vendidas/creadas ese día exacto
  const soldThatDay = subscriptions.filter(sub => sub.purchaseDate === dateStr);

  const sales: DailySale[] = [];
  const platformMap = new Map<string, DailyPlatformSummary>();

  soldThatDay.forEach(sub => {
    const pricingConfig = pricingMap.get(sub.platform);
    const profiles = Math.max(1, sub.profiles_sold || 1);

    // Ingreso real: precio de venta override o (precio venta x perfiles)
    const income = sub.salePriceOverride ?? ((pricingConfig?.salePrice || 0) * profiles);

    // Costo real
    let cost = 0;
    if (sub.master_account_id) {
      const ma = masterAccountsMap.get(sub.master_account_id);
      if (ma && ma.total_profiles > 0) {
        cost = (ma.purchase_price / ma.total_profiles) * profiles;
      }
    } else {
      const costPrice = pricingConfig?.costPrice || 0;
      const costType = pricingConfig?.costType || 'per_screen';
      cost = costType === 'per_account' ? costPrice : costPrice * profiles;
    }

    const profit = income - cost;

    sales.push({ clientName: sub.clientName, platform: sub.platform, profiles, income, cost, profit });

    // Agrupar por plataforma
    const existing = platformMap.get(sub.platform);
    if (existing) {
      existing.count++;
      existing.profiles += profiles;
      existing.income += income;
      existing.cost += cost;
      existing.profit += profit;
    } else {
      platformMap.set(sub.platform, { platform: sub.platform, count: 1, profiles, income, cost, profit });
    }
  });

  const platformSummary = Array.from(platformMap.values()).sort((a, b) => b.income - a.income);

  return {
    sales,
    platformSummary,
    totalIncome: sales.reduce((a, s) => a + s.income, 0),
    totalCost: sales.reduce((a, s) => a + s.cost, 0),
    totalProfit: sales.reduce((a, s) => a + s.profit, 0),
    totalSales: sales.length,
    totalProfiles: sales.reduce((a, s) => a + s.profiles, 0),
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
  const [useOptimizedScale, setUseOptimizedScale] = useState(false);

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

  const chartData = useMemo(() => {
    return stats.platformStats.map(ps => ({
      name: ps.platform.length > 12 ? ps.platform.substring(0, 10) + '…' : ps.platform,
      Ganancia: ps.profit,
      Costo: ps.cost,
      Ingreso: ps.revenue,
    }));
  }, [stats.platformStats]);

  const displayChartData = useMemo(() => {
    if (!useOptimizedScale) {
      return chartData;
    }
    const maxVal = Math.max(...chartData.map(d => d.Ingreso || 1));
    return chartData.map(d => {
      if (d.Ingreso <= 0) {
        return {
          ...d,
          realCosto: d.Costo,
          realGanancia: d.Ganancia,
          realIngreso: d.Ingreso
        };
      }
      const factor = d.Ingreso / maxVal;
      // Compresión no lineal usando exponente 0.45 para acercar visualmente las plataformas chicas a las grandes
      const visualTotal = maxVal * Math.pow(factor, 0.45);
      const costRatio = d.Costo / d.Ingreso;
      const visualCosto = visualTotal * costRatio;
      const visualGanancia = visualTotal - visualCosto;
      return {
        ...d,
        Costo: visualCosto,
        Ganancia: visualGanancia,
        realCosto: d.Costo,
        realGanancia: d.Ganancia,
        realIngreso: d.Ingreso
      };
    });
  }, [chartData, useOptimizedScale]);

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
              <>
                {/* Resumen del día */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-xl font-bold text-primary">{dailyStats.totalSales}</p>
                    <p className="text-[10px] text-muted-foreground">Ventas realizadas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                    <p className="text-xl font-bold text-amber-500">{dailyStats.totalProfiles}</p>
                    <p className="text-[10px] text-muted-foreground">Pantallas vendidas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(dailyStats.totalIncome)}</p>
                    <p className="text-[10px] text-muted-foreground">Ingreso total del día</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                    <p className="text-xl font-bold text-red-500">{formatCOP(dailyStats.totalCost)}</p>
                    <p className="text-[10px] text-muted-foreground">Costo total del día</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center border col-span-2 sm:col-span-1 ${dailyStats.totalProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                    <p className={`text-xl font-bold ${dailyStats.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{formatCOP(dailyStats.totalProfit)}</p>
                    <p className="text-[10px] text-muted-foreground">Ganancia del día</p>
                  </div>
                </div>

                {/* Sin ventas ese día */}
                {dailyStats.totalSales === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No se registraron ventas este día</p>
                  </div>
                )}

                {/* Resumen por plataforma */}
                {dailyStats.platformSummary.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">📱 Plataformas vendidas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dailyStats.platformSummary.map(ps => (
                        <div key={ps.platform} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors">
                          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: getPlatformBrandColor(ps.platform) }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ps.platform}</p>
                            <p className="text-[10px] text-muted-foreground">{ps.count} venta{ps.count > 1 ? 's' : ''} · {ps.profiles} pantalla{ps.profiles > 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(ps.income)}</p>
                            <p className="text-[10px] text-muted-foreground">ingreso</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detalle de cada venta */}
                {dailyStats.sales.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">📋 Detalle de ventas</p>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left p-2.5 font-semibold text-xs">Cliente</th>
                            <th className="text-left p-2.5 font-semibold text-xs">Plataforma</th>
                            <th className="text-right p-2.5 font-semibold text-xs">Pantallas</th>
                            <th className="text-right p-2.5 font-semibold text-xs">Ingreso</th>
                            <th className="text-right p-2.5 font-semibold text-xs">Costo</th>
                            <th className="text-right p-2.5 font-semibold text-xs">Ganancia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyStats.sales.map((sale, idx) => (
                            <tr key={idx} className="border-t hover:bg-muted/20 transition-colors">
                              <td className="p-2.5 font-medium">{sale.clientName}</td>
                              <td className="p-2.5">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPlatformBrandColor(sale.platform) }} />
                                  {sale.platform}
                                </span>
                              </td>
                              <td className="p-2.5 text-right">{sale.profiles}</td>
                              <td className="p-2.5 text-right text-blue-600 dark:text-blue-400">{formatCOP(sale.income)}</td>
                              <td className="p-2.5 text-right text-red-500">{formatCOP(sale.cost)}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(sale.profit)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t bg-muted/30 font-bold">
                            <td className="p-2.5" colSpan={2}>Total</td>
                            <td className="p-2.5 text-right">{dailyStats.totalProfiles}</td>
                            <td className="p-2.5 text-right text-blue-600 dark:text-blue-400">{formatCOP(dailyStats.totalIncome)}</td>
                            <td className="p-2.5 text-right text-red-500">{formatCOP(dailyStats.totalCost)}</td>
                            <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400">{formatCOP(dailyStats.totalProfit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </>
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
          <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/10">
            <div>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-foreground">
                Rentabilidad Mensual por Plataforma
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparativa de costos operativos e ingresos netos mensuales
              </p>
            </div>
            
            {/* Control de escala optimizada premium */}
            <div className="flex items-center gap-2 bg-muted/30 px-2.5 py-1 rounded-lg border text-xs font-medium">
              <span className="text-muted-foreground">Escala optimizada</span>
              <button
                type="button"
                onClick={() => setUseOptimizedScale(p => !p)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  useOptimizedScale ? 'bg-emerald-500' : 'bg-muted'
                }`}
                title="Permite que las plataformas con menores ingresos sean claramente visibles"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    useOptimizedScale ? 'translate-x-4' : 'translate-x-0'
                      }`}
                />
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Gráfico stacked con logos */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between min-h-[300px]">
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart data={displayChartData} barCategoryGap="25%" margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <XAxis dataKey="name" tick={<CustomXAxisTick />} height={55} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} content={<CustomChartTooltip />} />
                    <Bar dataKey="Costo" stackId="a" fill="hsl(var(--destructive)/0.2)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Ganancia" stackId="a" radius={[6, 6, 0, 0]}>
                      {displayChartData.map((entry, i) => (
                        <Cell key={i} fill={getPlatformBrandColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Columna Derecha: Tarjetas detalladas de plataforma tipo Mockup */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {stats.platformStats.map(ps => {
                  const details = getPlatformLogoDetails(ps.platform);
                  const color = getPlatformBrandColor(ps.platform);
                  return (
                    <div key={ps.platform} className="bg-muted/10 dark:bg-zinc-900/30 border rounded-xl p-3.5 space-y-2 transition-all hover:bg-muted/20 dark:hover:bg-zinc-900/60">
                      {/* Logo y Nombre + Costo */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {details?.logoUrl ? (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${details.bgClass || 'bg-white'}`}>
                              <img src={details.logoUrl} alt={ps.platform} className="w-4 h-4 object-contain" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[10px]" style={{ backgroundColor: color }}>
                              {ps.platform.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-xs text-foreground truncate">{ps.platform}</span>
                        </div>
                        <span className="text-red-500 dark:text-red-400 font-semibold text-xs shrink-0">{formatCOP(ps.cost)}</span>
                      </div>
                      
                      {/* Margen y Totales */}
                      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/30 pt-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {ps.marginPercent.toFixed(0)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground font-medium mt-0.5">Margen</div>
                        </div>
                        <div className="text-right space-y-0.5 min-w-0">
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold truncate">{formatCOP(ps.profit)}</div>
                          <div className="text-foreground font-bold text-xs truncate">{formatCOP(ps.revenue)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Leyenda premium e indicador de ganancia mensual al pie */}
          <div className="px-4 py-3 bg-muted/5 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-destructive/20 border border-destructive/30 inline-block" />
                Costo (Inversión)
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Ganancia Neta (Tu beneficio)
              </span>
            </div>
            
            <div className="bg-muted/30 dark:bg-zinc-800/40 px-4 py-1.5 rounded-full border text-xs font-semibold text-foreground flex items-center gap-2">
              <span className="text-muted-foreground">Total Mensual de Ganancia:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCOP(stats.totalProfit)}</span>
            </div>
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
