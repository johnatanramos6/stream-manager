import { useState, useEffect } from 'react';
import { Subscription, Platform, PaymentStatus, getDaysUntilPayment } from '@/types/subscription';
import { DEFAULT_PRICING, PlatformPricing } from '@/types/platformPricing';
import SubscriptionForm from '@/components/SubscriptionForm';
import SubscriptionTable from '@/components/SubscriptionTable';
import StatsBar, { QuickFilter } from '@/components/StatsBar';
import FinanceSection from '@/components/FinanceSection';
import ThemeToggle from '@/components/ThemeToggle';
import InstallPWA from '@/components/InstallPWA';
import ChangePassword from '@/components/ChangePassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Tv, DollarSign, Download, Upload, Filter, X, LogOut } from 'lucide-react';
import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/components/Login';
import AdminPanel from '@/components/AdminPanel';

// Deprecated local storage methods removed.
// We keep exportCSV standard since it's pure logic.

function exportExcel(subs: Subscription[], pricing: PlatformPricing[]) {
  const wb = XLSX.utils.book_new();

  // ═══════════════════════════════════════════
  // HOJA 1: Clientes
  // ═══════════════════════════════════════════
  const clientHeaders = ['Cliente', 'Teléfono', 'Plataforma', 'Correo', 'Contraseña', 'PIN', 'Fecha Adquisición', 'Estado', 'Notas', 'Nombre Cuenta', 'Precio Acordado'];
  const clientRows = subs.map(s => [
    s.clientName, s.clientPhone || '', s.platform, s.accountEmail, s.accountPassword,
    s.profilePin, s.purchaseDate, s.paymentStatus === 'pagado' ? '✅ Pagado' : s.paymentStatus === 'debe' ? '⚠️ Debe' : '🔴 Cobrar',
    s.notes, s.accountName || '', s.salePriceOverride || ''
  ]);
  const wsClients = XLSX.utils.aoa_to_sheet([clientHeaders, ...clientRows]);
  // Ajustar anchos de columna
  wsClients['!cols'] = clientHeaders.map((h, i) => ({ wch: Math.max(h.length, ...(clientRows.map(r => String(r[i] || '').length)), 12) }));
  XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes');

  // ═══════════════════════════════════════════
  // HOJA 2: Plataformas y Precios
  // ═══════════════════════════════════════════
  const pricingHeaders = ['Plataforma', 'Tipo Costo', 'Precio Compra ($)', 'Precio Venta ($)', 'Ganancia por unidad ($)'];
  const pricingRows = pricing.map(p => [
    p.platform,
    p.costType === 'per_account' ? 'Por Cuenta' : 'Por Pantalla',
    p.costPrice,
    p.salePrice,
    p.salePrice - p.costPrice
  ]);
  const wsPricing = XLSX.utils.aoa_to_sheet([pricingHeaders, ...pricingRows]);
  wsPricing['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsPricing, 'Plataformas y Precios');

  // ═══════════════════════════════════════════
  // HOJA 3: Resumen Financiero Mensual
  // ═══════════════════════════════════════════
  const pricingMap = new Map(pricing.map(p => [p.platform, p]));
  const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const financeHeaders = ['Mes', 'Clientes Activos', 'Ingresos ($)', 'Costos ($)', 'Ganancia Neta ($)', 'Margen (%)'];
  const financeRows: (string | number)[][] = [];
  let totalIngresos = 0, totalCostos = 0, totalGanancia = 0;

  for (let m = 0; m <= currentMonth; m++) {
    const subsInMonth = subs.filter(sub => {
      const d = new Date(sub.purchaseDate + 'T12:00:00');
      const subStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const targetMonth = new Date(currentYear, m, 1);
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

    const profit = revenue - cost;
    const margin = revenue > 0 ? ((profit / revenue) * 100) : 0;
    totalIngresos += revenue;
    totalCostos += cost;
    totalGanancia += profit;

    financeRows.push([
      MONTH_NAMES_FULL[m],
      subsInMonth.length,
      revenue,
      cost,
      profit,
      Math.round(margin * 10) / 10
    ]);
  }

  // Fila de totales
  financeRows.push([]);
  financeRows.push([
    'TOTAL ANUAL',
    '',
    totalIngresos,
    totalCostos,
    totalGanancia,
    totalIngresos > 0 ? Math.round(((totalGanancia / totalIngresos) * 100) * 10) / 10 : 0
  ]);

  // Hoja 3b: Detalle por plataforma
  financeRows.push([]);
  financeRows.push(['--- DETALLE POR PLATAFORMA ---', '', '', '', '', '']);
  financeRows.push(['Plataforma', 'Cuentas', 'Pantallas', 'Costo Total ($)', 'Ingreso Total ($)', 'Ganancia Neta ($)']);

  const platformStatsMap = new Map<string, { accounts: number; clients: number; revenue: number; cost: number }>();
  const uniqueGlobalAccounts = new Set<string>();

  subs.forEach(sub => {
    const p = pricingMap.get(sub.platform);
    const salePrice = p ? p.salePrice : 0;
    const actualRevenue = sub.salePriceOverride ?? salePrice;
    const ps = platformStatsMap.get(sub.platform) || { accounts: 0, clients: 0, revenue: 0, cost: 0 };
    ps.clients++;
    ps.revenue += actualRevenue;

    const key = sub.accountEmail
      ? `${sub.platform}::${sub.accountEmail.trim().toLowerCase()}`
      : `ungrouped::${sub.id}`;
    if (!uniqueGlobalAccounts.has(key)) {
      uniqueGlobalAccounts.add(key);
      ps.accounts++;
    }
    platformStatsMap.set(sub.platform, ps);
  });

  platformStatsMap.forEach((ps, platform) => {
    const p = pricingMap.get(platform) || { costPrice: 0, costType: 'per_screen' };
    const cType = (p as any).costType || 'per_screen';
    const totalCostPlat = cType === 'per_account' ? (ps.accounts * p.costPrice) : (ps.clients * p.costPrice);
    const profit = ps.revenue - totalCostPlat;
    financeRows.push([platform, ps.accounts, ps.clients, totalCostPlat, ps.revenue, profit]);
  });

  const wsFinance = XLSX.utils.aoa_to_sheet([financeHeaders, ...financeRows]);
  wsFinance['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsFinance, 'Resumen Financiero');

  // Descargar
  XLSX.writeFile(wb, `StreamManager_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast.success('Reporte Excel descargado con éxito');
}

function IndexContent() {
  const { session, user, isAdmin, signOut } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'clients' | 'finance'>('clients');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [showAdmin, setShowAdmin] = useState(false);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dynamicPlatforms = Array.isArray(pricingConfig) 
    ? pricingConfig.map(p => p?.platform || '').filter(p => p.trim() !== '')
    : DEFAULT_PRICING.map(p => p.platform);

  useEffect(() => {
    if (!user) return;
    const fetchDb = async () => {
      // Cargar suscripciones
      const { data, error } = await supabase.from('subscriptions').select().eq('vendor_id', user.id);
      if (data) {
        setSubs(data.map(d => ({
          id: d.id,
          clientName: d.client_name,
          clientPhone: d.client_phone,
          platform: d.platform,
          accountEmail: d.account_email,
          accountPassword: d.account_password,
          profilePin: d.profile_pin,
          purchaseDate: d.purchase_date,
          paymentStatus: d.payment_status,
          notes: d.notes,
          accountName: d.account_name,
          salePriceOverride: d.sale_price_override
        })));
      }
      if (error) toast.error("Error al cargar las suscripciones.");

      // Cargar configuración de precios desde Supabase Auth Metadata (Sin necesidad de SQL)
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.user_metadata?.pricing_config) {
        setPricingConfig(authData.user.user_metadata.pricing_config);
      }
    };
    fetchDb();
  }, [user]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rows: string[][] = [];
      let headers: string[] = [];
      let sheetPlatform = ''; // Plataforma derivada del nombre de la hoja
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Leer TODAS las hojas del archivo Excel y escanear encabezados reales
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (!rawData || rawData.length < 2) continue;

          // Encontrar la fila de encabezados reales (escaneando hasta la fila 30)
          let headerRowIndex = -1;
          let localHeaders: string[] = [];

          for (let i = 0; i < Math.min(rawData.length, 30); i++) {
            const row = rawData[i];
            if (!row) continue;
            
            const stringRow = row.map(c => c === null || c === undefined ? '' : String(c).trim());
            const hasKeyHeader = stringRow.some(c => {
              const lower = c.toLowerCase();
              return lower === 'nombre' || lower === 'cliente' || lower === 'correo' || lower === 'celular' || lower === 'perfil';
            });

            if (hasKeyHeader) {
              headerRowIndex = i;
              localHeaders = stringRow;
              break;
            }
          }

          if (headerRowIndex === -1) {
            console.warn(`Hoja "${sheetName}" saltada: no se encontraron encabezados reales.`);
            continue;
          }

          // Ya tenemos los encabezados de esta hoja
          const platformName = sheetName.trim();
          
          const localGetIdx = (words: string[]) => localHeaders.findIndex(h => words.some(w => h.toLowerCase().includes(w)));
          const idxClientLocal = localGetIdx(['cliente', 'nombre']);
          const idxPhoneLocal = localGetIdx(['teléfono', 'telefono', 'celular']);
          const idxPlatformLocal = localGetIdx(['plataforma', 'servicio']);
          const idxEmailLocal = localGetIdx(['correo', 'email']);
          const idxPassLocal = localGetIdx(['contraseña', 'password', 'clave']);
          const idxPinLocal = localGetIdx(['pin']); // Evitar que 'perfil' caiga aquí si hay 'pin'
          const idxAccountNameLocal = localGetIdx(['perfil', 'cuenta', 'pantalla']);
          
          const idxDateLocal = localGetIdx(['fecha', 'adquisición', 'adquisicion']);
          const idxExpLocal = localGetIdx(['expiración', 'expiracion']);
          const idxStatusLocal = localGetIdx(['estado', 'pago']);
          const idxNotesLocal = localGetIdx(['nota', 'observaci', 'alerta']);
          const idxPriceLocal = localGetIdx(['precio', 'acordado']);

          for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const rawRow = rawData[i];
            if (!rawRow || !rawRow.some(c => c !== null && c !== undefined && String(c).trim() !== '')) continue;
            
            const stringRow = rawRow.map(c => c === null || c === undefined ? '' : String(c).trim());
            const clientName = idxClientLocal !== -1 ? stringRow[idxClientLocal] : '';
            
            // Ignorar basura, repetición de encabezados o filas vacías
            if (!clientName || clientName.toLowerCase() === 'nombre') continue;

            // Determinar la plataforma: priorizar la columna Plataforma, luego el nombre de la hoja
            let resolvedPlatform = platformName;
            if (idxPlatformLocal !== -1 && stringRow[idxPlatformLocal]) {
              resolvedPlatform = stringRow[idxPlatformLocal];
            }

            // Normalizar estado de pago (convertir emojis/texto legible a valores internos)
            let rawStatus = idxStatusLocal !== -1 ? stringRow[idxStatusLocal] : '';
            let normalizedStatus = rawStatus;
            const statusLower = rawStatus.toLowerCase();
            if (statusLower.includes('pagado') || statusLower.includes('✅')) {
              normalizedStatus = 'pagado';
            } else if (statusLower.includes('cobrar') || statusLower.includes('🔴')) {
              normalizedStatus = 'cobrar';
            } else if (statusLower.includes('debe') || statusLower.includes('⚠')) {
              normalizedStatus = 'debe';
            }

            let finalDate = '';
            if (idxExpLocal !== -1 && stringRow[idxExpLocal]) {
              // Convertir Expiración a Fecha Adquisición (-30 días)
              let expDateRaw = stringRow[idxExpLocal];
              let parsedExpDate: Date | null = null;
              
              if (!isNaN(Number(expDateRaw))) {
                 // Formato serial de Excel
                 parsedExpDate = new Date(Math.round((Number(expDateRaw) - 25569) * 86400 * 1000));
              } else {
                 // Formato string (ej. 20/08/24)
                 const parts = expDateRaw.split(/[\/\-]/);
                 if (parts.length === 3) {
                    let y = parseInt(parts[2]);
                    if (y < 100) y += 2000;
                    parsedExpDate = new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0]));
                 }
              }
              
              if (parsedExpDate && !isNaN(parsedExpDate.getTime())) {
                parsedExpDate.setDate(parsedExpDate.getDate() - 30);
                finalDate = parsedExpDate.toISOString().split('T')[0];
              } else {
                finalDate = expDateRaw; // Fallback
              }
            } else if (idxDateLocal !== -1 && stringRow[idxDateLocal]) {
              finalDate = stringRow[idxDateLocal];
            }

            // Normalizar la fila a un formato estándar
            const normalizedRow = [
              clientName,
              idxPhoneLocal !== -1 ? stringRow[idxPhoneLocal] : '',
              resolvedPlatform,
              idxEmailLocal !== -1 ? stringRow[idxEmailLocal] : '',
              idxPassLocal !== -1 ? stringRow[idxPassLocal] : '',
              idxPinLocal !== -1 ? stringRow[idxPinLocal] : (idxAccountNameLocal !== -1 ? stringRow[idxAccountNameLocal] : ''),
              finalDate,
              normalizedStatus,
              idxNotesLocal !== -1 ? stringRow[idxNotesLocal] : '',
              idxAccountNameLocal !== -1 ? stringRow[idxAccountNameLocal] : '',
              idxPriceLocal !== -1 ? stringRow[idxPriceLocal] : '',
            ];
            rows.push(normalizedRow);
          }
          
          if (headers.length === 0) {
            // Establecer encabezados estándar para que coincidan con los índices posteriores
            headers = ['Cliente', 'Teléfono', 'Plataforma', 'Correo', 'Contraseña', 'PIN', 'Fecha Adquisición', 'Estado', 'Notas', 'Nombre Cuenta', 'Precio Acordado'];
          }
        }
      } else {
        const text = await file.text();
        const lines = text.split(/\r\n|\n|\r/);
        if (lines.length > 0) {
          const hLine = lines[0].trim();
          let cur = '', inQuotes = false;
          for (let j = 0; j < hLine.length; j++) {
            if (hLine[j] === '"') inQuotes = !inQuotes;
            else if (hLine[j] === ',' && !inQuotes) { headers.push(cur.replace(/"/g, '').trim()); cur = ''; }
            else cur += hLine[j];
          }
          headers.push(cur.replace(/"/g, '').trim());

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const fields: string[] = [];
            cur = ''; inQuotes = false;
            for (let j = 0; j < line.length; j++) {
              if (line[j] === '"') inQuotes = !inQuotes;
              else if (line[j] === ',' && !inQuotes) { fields.push(cur); cur = ''; }
              else cur += line[j];
            }
            fields.push(cur);
            rows.push(fields);
          }
        }
      }

      if (rows.length === 0) return toast.error("El archivo está vacío o no tiene clientes válidos");
      
      const getIdx = (words: string[]) => headers.findIndex(h => words.some(w => h.toLowerCase().includes(w)));
      const idxClient = getIdx(['cliente', 'nombre']);
      const idxPhone = getIdx(['teléfono', 'telefono', 'celular']);
      const idxPlatform = getIdx(['plataforma', 'servicio']);
      const idxEmail = getIdx(['correo', 'email']);
      const idxPass = getIdx(['contraseña', 'password', 'clave']);
      const idxPin = getIdx(['pin', 'perfil']);
      const idxDate = getIdx(['fecha', 'adquisición', 'adquisicion']);
      const idxStatus = getIdx(['estado', 'pago']);
      const idxNotes = getIdx(['nota', 'observaci']);
      const idxAccName = getIdx(['cuenta', 'pantalla']);
      const idxPrice = getIdx(['precio', 'acordado']);

      const hasHeaders = idxClient !== -1 || idxPlatform !== -1 || idxEmail !== -1;

      const safeGet = (fields: string[], idx: number, fallback: number) => {
        if (hasHeaders) return idx !== -1 ? (fields[idx] || '').trim() : '';
        return (fields[fallback] || '').trim();
      };

      const newSubs: Subscription[] = [];
      let skipped = 0;
      
      for (const fields of rows) {
        const clientName = safeGet(fields, idxClient, 0);
        const phone = safeGet(fields, idxPhone, 1);
        const platform = safeGet(fields, idxPlatform, 2) || 'Otro';
        if (!clientName) continue;

        // Filtro inteligente: descartar filas que NO son clientes reales
        const nameLower = clientName.toLowerCase();
        const isLabel = /^\*.*\*:?$/.test(clientName.trim()) || nameLower.endsWith(':');
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientName.trim());
        const isDescription = clientName.length > 40 && clientName === clientName.toUpperCase();
        const isPassword = !clientName.includes(' ') && /[#@$%&!]/.test(clientName) && clientName.length < 20;
        const isSentence = clientName.split(/\s+/).length > 5;
        const isGarbage = isLabel || isEmail || isDescription || isPassword || isSentence;

        // Si todas las demás columnas están vacías, probablemente no es un cliente real
        const otherCols = [safeGet(fields, idxPlatform, 2), safeGet(fields, idxEmail, 3), safeGet(fields, idxDate, 6)];
        const allOtherEmpty = otherCols.every(c => !c);
        
        if (isGarbage || (platform === 'Otro' && allOtherEmpty)) continue;
        
        const isDuplicate = subs.some(s => s.clientName.toLowerCase() === clientName.toLowerCase() && s.platform === platform);
        if (isDuplicate) { skipped++; continue; }
        
        const rawDate = safeGet(fields, idxDate, 6);
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const finalDate = dateRegex.test(rawDate) ? rawDate : new Date().toISOString().split('T')[0];

        const rawPrice = safeGet(fields, idxPrice, 10);

        newSubs.push({
          id: crypto.randomUUID(),
          clientName,
          clientPhone: phone,
          platform,
          accountEmail: safeGet(fields, idxEmail, 3),
          accountPassword: safeGet(fields, idxPass, 4),
          profilePin: safeGet(fields, idxPin, 5),
          purchaseDate: finalDate,
          paymentStatus: (safeGet(fields, idxStatus, 7).toLowerCase() as PaymentStatus) || 'debe',
          notes: safeGet(fields, idxNotes, 8),
          accountName: safeGet(fields, idxAccName, 9),
          salePriceOverride: rawPrice && !isNaN(Number(rawPrice)) ? Number(rawPrice) : undefined
        });
      }
      
      if (newSubs.length > 0) {
        const dbPayload = newSubs.map(s => ({
          id: s.id,
          vendor_id: user!.id,
          client_name: s.clientName,
          client_phone: s.clientPhone,
          platform: s.platform,
          account_email: s.accountEmail,
          account_password: s.accountPassword,
          profile_pin: s.profilePin,
          purchase_date: s.purchaseDate,
          payment_status: s.paymentStatus,
          notes: s.notes,
          account_name: s.accountName,
          sale_price_override: s.salePriceOverride
        }));

        const { error } = await supabase.from('subscriptions').insert(dbPayload);
        if (error) {
          console.error(error);
          return toast.error("Error al guardar en la nube. Verifica tu conexión.");
        }

        setSubs(prev => [...newSubs, ...prev]);
        toast.success(`Se importaron ${newSubs.length} clientes a la nube`);
      } else if (skipped > 0) {
        toast.info(`Se omitieron ${skipped} clientes repetidos.`);
      } else {
        toast.error("No se encontraron datos válidos nuevos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar el archivo. Si es Excel asegúrate que el formato sea básico.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (sub: Subscription) => {
    const payload = {
      id: sub.id,
      vendor_id: user!.id,
      client_name: sub.clientName,
      client_phone: sub.clientPhone,
      platform: sub.platform,
      account_email: sub.accountEmail,
      account_password: sub.accountPassword,
      profile_pin: sub.profilePin,
      purchase_date: sub.purchaseDate,
      payment_status: sub.paymentStatus,
      notes: sub.notes,
      account_name: sub.accountName,
      sale_price_override: sub.salePriceOverride
    };

    const { error } = await supabase.from('subscriptions').upsert(payload);
    if (error) return toast.error("Error al guardar en la nube");

    setSubs(prev => {
      const exists = prev.find(s => s.id === sub.id);
      if (exists) return prev.map(s => s.id === sub.id ? sub : s);
      return [...prev, sub];
    });
    toast.success(editing ? 'Suscripción actualizada' : 'Suscripción agregada');
    setEditing(null);
  };

  const handleEdit = (sub: Subscription) => {
    setEditing(sub);
    setFormOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await supabase.from('subscriptions').delete().eq('id', deleteId);
      setSubs(prev => prev.filter(s => s.id !== deleteId));
      toast.success('Suscripción eliminada de la nube');
      setDeleteId(null);
    }
  };

  const handleTogglePayment = async (id: string) => {
    const sub = subs.find(s => s.id === id);
    if (!sub) return;
    const cycle: PaymentStatus[] = ['debe', 'cobrar', 'pagado'];
    const next = cycle[(cycle.indexOf(sub.paymentStatus) + 1) % cycle.length];
    
    await supabase.from('subscriptions').update({ payment_status: next }).eq('id', id);
    setSubs(prev => prev.map(s => s.id === id ? { ...s, paymentStatus: next } : s));
  };

  const filtered = subs.filter(s => {
    // Top bar filters
    if (search && !s.clientName.toLowerCase().includes(search.toLowerCase()) && !s.accountEmail.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlatform !== 'all' && s.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && s.paymentStatus !== filterStatus) return false;
    
    // Quick filters from Stats
    if (quickFilter === 'pagado' && s.paymentStatus !== 'pagado') return false;
    if (quickFilter === 'debt' && s.paymentStatus !== 'debe' && s.paymentStatus !== 'cobrar') return false;
    if (quickFilter === 'urgent' && getDaysUntilPayment(s.purchaseDate) > 2) return false;

    return true;
  });

  const hasActiveFilters = filterPlatform !== 'all' || filterStatus !== 'all' || search.length > 0 || quickFilter !== 'all';

  const handleStatClick = (filter: QuickFilter) => {
    setQuickFilter(filter);
    setFilterStatus('all'); // Clear dropdown filter so it doesn't conflict
    setActiveTab('clients'); // Make sure we're viewing the list
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {/* ── Header ── */}
      <header className="border-b glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-primary/70 rounded-xl p-2 shadow-lg shadow-primary/20">
              <Tv className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight">StreamManager</h1>
              <p className="text-[11px] text-muted-foreground">Control de suscripciones</p>
            </div>
            <h1 className="sm:hidden text-lg font-bold tracking-tight">SM</h1>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && <Button variant="ghost" size="sm" onClick={() => setShowAdmin(true)} className="flex text-amber-500 font-bold px-2 sm:px-3">Súper Admin</Button>}
            {/* Tab buttons */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${activeTab === 'clients' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Tv className="h-3.5 w-3.5 inline mr-1" />
                <span className="hidden sm:inline">Clientes</span>
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${activeTab === 'finance' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <DollarSign className="h-3.5 w-3.5 inline mr-1" />
                <span className="hidden sm:inline">Finanzas</span>
              </button>
            </div>

            <ThemeToggle />

            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>

            {activeTab === 'clients' && (
              <>
                <input type="file" accept=".csv,.xlsx,.xls" ref={fileInputRef} className="hidden" onChange={handleImportFile} />
                <Button variant="outline" size="sm" className="flex gap-1.5 px-2 sm:px-3 text-xs" onClick={() => fileInputRef.current?.click()} title="Importar Excel/CSV">
                  <Upload className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden lg:inline">Importar</span>
                </Button>
                <Button variant="outline" size="sm" className="flex gap-1.5 px-2 sm:px-3 text-xs" onClick={() => exportExcel(subs, pricingConfig)}>
                  <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Descargar Excel</span>
                </Button>
                <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5 text-xs hidden sm:flex shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-5 pb-24 sm:pb-6">
        {activeTab === 'clients' ? (
          <>
            <StatsBar subscriptions={subs} onStatClick={handleStatClick} />

            {/* ── Filters: Desktop ── */}
            <div className="hidden sm:flex flex-row gap-3 animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente o correo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {dynamicPlatforms.map((p, i) => <SelectItem key={i} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setQuickFilter('all'); }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pagado">✅ Pagado</SelectItem>
                  <SelectItem value="debe">⚠️ Debe</SelectItem>
                  <SelectItem value="cobrar">🔴 Cobrar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Filters: Mobile ── */}
            <div className="sm:hidden space-y-2 animate-fade-in">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <Button
                  variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setShowFilters(v => !v)}
                >
                  {hasActiveFilters ? <span className="text-xs font-bold">!</span> : <Filter className="h-4 w-4" />}
                </Button>
              </div>

              {showFilters && (
                <div className="flex gap-2 animate-fade-in-up">
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="flex-1 h-9 text-xs"><SelectValue placeholder="Plataforma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {dynamicPlatforms.map((p, i) => <SelectItem key={i} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setQuickFilter('all'); }}>
                    <SelectTrigger className="flex-1 h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pagado">✅ Pagado</SelectItem>
                      <SelectItem value="debe">⚠️ Debe</SelectItem>
                      <SelectItem value="cobrar">🔴 Cobrar</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setFilterPlatform('all'); setFilterStatus('all'); setSearch(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <SubscriptionTable
              subscriptions={filtered}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onTogglePayment={handleTogglePayment}
            />
          </>
        ) : (
          <FinanceSection 
            subscriptions={subs} 
            onPricingSaved={async () => {
              const { data: authData } = await supabase.auth.getUser();
              if (authData.user?.user_metadata?.pricing_config) {
                setPricingConfig(authData.user.user_metadata.pricing_config);
              }
            }} 
          />
        )}
      </main>

      {/* ── FAB Mobile ── */}
      {activeTab === 'clients' && (
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="sm:hidden fixed bottom-6 right-6 z-20 bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-2xl shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <SubscriptionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        dynamicPlatforms={dynamicPlatforms}
        allSubscriptions={subs}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta suscripción del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InstallPWA />
    </div>
  );
}

export default function Index() {
  const { session, mustChangePassword } = useAuth();
  if (!session) return <Login />;
  if (mustChangePassword) return <ChangePassword />;
  return <IndexContent />;
}
