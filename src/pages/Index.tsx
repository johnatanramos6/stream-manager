import { useState, useEffect } from 'react';
import { Subscription, Platform, PaymentStatus, getDaysUntilPayment } from '@/types/subscription';
import { loadPricing } from '@/types/platformPricing';
import SubscriptionForm from '@/components/SubscriptionForm';
import SubscriptionTable from '@/components/SubscriptionTable';
import StatsBar, { QuickFilter } from '@/components/StatsBar';
import FinanceSection from '@/components/FinanceSection';
import ThemeToggle from '@/components/ThemeToggle';
import InstallPWA from '@/components/InstallPWA';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Tv, DollarSign, Download, Upload, Filter, X } from 'lucide-react';
import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/components/Login';
import AdminPanel from '@/components/AdminPanel';

// Deprecated local storage methods removed.
// We keep exportCSV standard since it's pure logic.

function exportCSV(subs: Subscription[]) {
  const headers = ['Cliente', 'Teléfono', 'Plataforma', 'Correo', 'Contraseña', 'PIN', 'Fecha Adquisición', 'Estado', 'Notas', 'Nombre Cuenta', 'Precio Acordado'];
  const rows = subs.map(s => [
    s.clientName, s.clientPhone || '', s.platform, s.accountEmail, s.accountPassword,
    s.profilePin, s.purchaseDate, s.paymentStatus, s.notes, s.accountName || '', s.salePriceOverride ? String(s.salePriceOverride) : ''
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `streammanager_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Archivo CSV descargado');
}

function IndexContent() {
  const { session, user, isAdmin } = useAuth();
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dynamicPlatforms = loadPricing().map(p => p.platform);

  useEffect(() => {
    if (!user) return;
    const fetchDb = async () => {
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
      if (error) toast.error("Error al cargar la base de datos.");
    };
    fetchDb();
  }, [user]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rows: string[][] = [];
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawData.length > 1) {
          rows = rawData.slice(1).map(r => r.map(c => c === null || c === undefined ? '' : String(c)));
        } else {
          rows = [];
        }
      } else {
        const text = await file.text();
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const fields: string[] = [];
          let cur = '', inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') inQuotes = !inQuotes;
            else if (line[j] === ',' && !inQuotes) { fields.push(cur); cur = ''; }
            else cur += line[j];
          }
          fields.push(cur);
          rows.push(fields);
        }
      }

      if (rows.length === 0) return toast.error("El archivo está vacío o no tiene clientes válidos");
      
      const newSubs: Subscription[] = [];
      let skipped = 0;
      
      for (const fields of rows) {
        const clientName = (fields[0] || '').trim();
        const phone = (fields[1] || '').trim();
        const platform = (fields[2] || '').trim() || 'Otro';
        if (!clientName) continue;
        
        const isDuplicate = subs.some(s => s.clientName.toLowerCase() === clientName.toLowerCase() && s.platform === platform);
        if (isDuplicate) { skipped++; continue; }
        
        newSubs.push({
          id: crypto.randomUUID(),
          clientName,
          clientPhone: phone,
          platform,
          accountEmail: (fields[3] || '').trim(),
          accountPassword: (fields[4] || '').trim(),
          profilePin: (fields[5] || '').trim(),
          purchaseDate: (fields[6] || '').trim() || new Date().toISOString().split('T')[0],
          paymentStatus: ((fields[7] || '').trim().toLowerCase() as PaymentStatus) || 'debe',
          notes: (fields[8] || '').trim(),
          accountName: (fields[9] || '').trim(),
          salePriceOverride: fields[10] ? Number(fields[10]) : undefined
        });
      }
      
      if (newSubs.length > 0) {
        setSubs(prev => [...newSubs, ...prev]);
        toast.success(`Se importaron ${newSubs.length} clientes correctamente`);
      } else if (skipped > 0) {
        toast.info(`Se omitieron ${skipped} clientes repetidos.`);
      } else {
        toast.error("No se encontraron datos válidos.");
      }
    } catch (err) {
      toast.error("Error al procesar el archivo. Si es Excel asegúrate que el formato sea básico y sin modificaciones complejas o cambia a CSV.");
    } finally {
      e.target.value = '';
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

            {activeTab === 'clients' && (
              <>
                <input type="file" accept=".csv,.xlsx,.xls" ref={fileInputRef} className="hidden" onChange={handleImportFile} />
                <Button variant="outline" size="sm" className="flex gap-1.5 px-2 sm:px-3 text-xs" onClick={() => fileInputRef.current?.click()} title="Importar Excel/CSV">
                  <Upload className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden lg:inline">Importar</span>
                </Button>
                <Button variant="outline" size="sm" className="flex gap-1.5 px-2 sm:px-3 text-xs" onClick={() => exportCSV(subs)}>
                  <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Excel/CSV</span>
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
          <FinanceSection subscriptions={subs} />
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
  const { session } = useAuth();
  if (!session) return <Login />;
  return <IndexContent />;
}
