import { useState, useMemo, useRef } from 'react';
import { MasterAccount } from '@/types/masterAccount';
import { Subscription } from '@/types/subscription';
import { Contact } from '@/types/contact';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCOP } from '@/types/platformPricing';
import { Package, Plus, Pencil, Trash2, Eye, EyeOff, Copy, Check, Search, Mail, Lock, Users, DollarSign, CalendarDays, Phone, MessageCircle, RefreshCw, Wrench, User, AlertTriangle, Clock, ChevronDown, ChevronUp, Timer } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  accounts: MasterAccount[];
  subscriptions: Subscription[];
  dynamicPlatforms: string[];
  onAccountsChange: (accounts: MasterAccount[]) => void;
  onCredentialsChanged?: (masterAccountId: string, newEmail: string, newPassword: string, platform: string, emailChanged: boolean, passwordChanged: boolean) => void;
  onProfilesChanged?: (masterAccountId: string, oldProfiles: { name: string; pin: string }[], newProfiles: { name: string; pin: string }[]) => Promise<void>;
  providerContacts?: Contact[];
  onProviderSaved?: (name: string, phone: string | null) => void;
}

export default function AccountsSection({ accounts, subscriptions, dynamicPlatforms, onAccountsChange, onCredentialsChanged, onProfilesChanged, providerContacts = [], onProviderSaved }: Props) {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MasterAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterExpiry, setFilterExpiry] = useState<'all' | 'expiring' | 'expired'>('all');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExpiryPanel, setShowExpiryPanel] = useState(false);
  const [showProviderSuggestions, setShowProviderSuggestions] = useState(false);
  const providerInputRef = useRef<HTMLInputElement>(null);

  // Helper: Sincronizar perfiles
  const syncProfilesConfig = (total: number, currentConfigs: { name: string; pin: string }[] = []) => {
    const newConfigs = [...currentConfigs];
    if (newConfigs.length < total) {
      for (let i = newConfigs.length; i < total; i++) {
        newConfigs.push({
          name: `Perfil ${i + 1}`,
          pin: String(i + 1).padStart(4, '0')
        });
      }
    } else if (newConfigs.length > total) {
      newConfigs.splice(total);
    }
    return newConfigs;
  };

  // Form state
  const emptyForm = { 
    platform: dynamicPlatforms[0] || 'Netflix', 
    account_email: '', 
    account_password: '', 
    total_profiles: 4, 
    purchase_price: 0, 
    notes: '', 
    purchase_date: new Date().toISOString().split('T')[0], 
    supplier_phone: '', 
    supplier_name: '', 
    duration_days: 30,
    profiles_config: [] as { name: string; pin: string }[]
  };
  const [form, setForm] = useState(emptyForm);

  const computeCutDate = (purchaseDate: string, durationDays: number): string => {
    if (!purchaseDate) return new Date().toISOString().split('T')[0];
    const d = new Date(purchaseDate + 'T12:00:00');
    d.setDate(d.getDate() + durationDays);
    return d.toISOString().split('T')[0];
  };

  const cutDate = useMemo(() => {
    const days = Number(form.duration_days) || 30;
    return computeCutDate(form.purchase_date, days);
  }, [form.purchase_date, form.duration_days]);

  const handleCutDateChange = (newCutDate: string) => {
    if (!newCutDate) return;
    const purchase = new Date(form.purchase_date + 'T12:00:00');
    const cut = new Date(newCutDate + 'T12:00:00');
    const diffMs = cut.getTime() - purchase.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      setForm(prev => ({ ...prev, duration_days: diffDays }));
    }
  };

  const handlePurchaseDateChange = (newPurchaseDate: string) => {
    if (!newPurchaseDate) return;
    setForm(prev => ({ ...prev, purchase_date: newPurchaseDate }));
  };

  const getAssignedCount = (accountId: string) => {
    return subscriptions.filter(s => (s as any).master_account_id === accountId)
      .reduce((sum, s) => sum + ((s as any).profiles_sold || 1), 0);
  };

  // Helper: calcular días para vencimiento (purchase_date + duration_days)
  const getDaysToExpiry = (purchaseDate?: string, durationDays: number = 30): number => {
    if (!purchaseDate) return 999;
    const d = new Date(purchaseDate + 'T12:00:00');
    const expiry = new Date(d);
    expiry.setDate(expiry.getDate() + durationDays);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryDate = (purchaseDate?: string, durationDays: number = 30): string => {
    if (!purchaseDate) return 'N/A';
    const d = new Date(purchaseDate + 'T12:00:00');
    d.setDate(d.getDate() + durationDays);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getExpiryStatus = (days: number) => {
    if (days <= 0) return { label: 'Vencida', color: 'text-red-500 bg-red-500/10 border-red-500/30', border: 'border-red-500/50', icon: 'expired' };
    if (days <= 3) return { label: `${days}d`, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', border: 'border-amber-500/40', icon: 'warning' };
    return { label: `${days}d`, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', border: '', icon: 'ok' };
  };

  const enrichedAccounts = accounts.map(a => {
    const daysLeft = getDaysToExpiry(a.purchase_date, a.duration_days || 30);
    return {
      ...a,
      assigned_profiles: getAssignedCount(a.id),
      available_profiles: a.total_profiles - getAssignedCount(a.id),
      daysToExpiry: daysLeft,
      expiryDate: getExpiryDate(a.purchase_date, a.duration_days || 30),
    };
  });

  const filtered = enrichedAccounts.filter(a => {
    if (search && !a.account_email.toLowerCase().includes(search.toLowerCase()) && !a.platform.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlatform !== 'all' && a.platform !== filterPlatform) return false;
    if (filterExpiry === 'expiring' && a.daysToExpiry > 3) return false;
    if (filterExpiry === 'expired' && a.daysToExpiry > 0) return false;
    return true;
  });

  // Expiry stats
  const expiringAccounts = useMemo(() => enrichedAccounts.filter(a => a.daysToExpiry <= 3 && a.daysToExpiry > 0).sort((a, b) => a.daysToExpiry - b.daysToExpiry), [enrichedAccounts]);
  const expiredAccounts = useMemo(() => enrichedAccounts.filter(a => a.daysToExpiry <= 0).sort((a, b) => a.daysToExpiry - b.daysToExpiry), [enrichedAccounts]);
  const totalUrgent = expiringAccounts.length + expiredAccounts.length;

  const handleOpenForm = (account?: MasterAccount) => {
    if (account) {
      setEditing(account);
      const currentConfigs = account.profiles_config || [];
      const total = account.total_profiles;
      const syncedConfigs = syncProfilesConfig(total, currentConfigs);
      setForm({
        platform: account.platform,
        account_email: account.account_email,
        account_password: account.account_password,
        total_profiles: account.total_profiles,
        purchase_price: account.purchase_price,
        notes: account.notes,
        purchase_date: account.purchase_date || new Date().toISOString().split('T')[0],
        supplier_phone: account.supplier_phone || '',
        supplier_name: account.supplier_name || '',
        duration_days: account.duration_days || 30,
        profiles_config: syncedConfigs,
      });
    } else {
      setEditing(null);
      const defaultTotal = emptyForm.total_profiles;
      setForm({
        ...emptyForm,
        profiles_config: syncProfilesConfig(defaultTotal),
      });
    }
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.account_email.trim()) return toast.error('El correo es obligatorio');
    if (form.total_profiles < 1) return toast.error('Debe tener al menos 1 perfil');

    if (editing) {
      // Update
      const { error } = await supabase.from('master_accounts').update({
        platform: form.platform,
        account_email: form.account_email,
        account_password: form.account_password,
        total_profiles: form.total_profiles,
        purchase_price: form.purchase_price,
        purchase_date: form.purchase_date,
        supplier_phone: form.supplier_phone || null,
        supplier_name: form.supplier_name || null,
        duration_days: form.duration_days,
        notes: form.notes,
        profiles_config: form.profiles_config,
      }).eq('id', editing.id);

      if (error) return toast.error('Error al actualizar: ' + error.message);
      onAccountsChange(accounts.map(a => a.id === editing.id ? { ...a, ...form } : a));
      toast.success('Cuenta actualizada');

      // Guardar proveedor en contactos persistentes
      if (form.supplier_name?.trim() && onProviderSaved) {
        onProviderSaved(form.supplier_name, form.supplier_phone || null);
      }

      // Si cambió la configuración de perfiles (PIN o Nombre), propagar a las suscripciones
      const oldConfig = editing.profiles_config || [];
      const newConfig = form.profiles_config || [];
      let profilesChanged = false;
      if (oldConfig.length !== newConfig.length) {
        profilesChanged = true;
      } else {
        for (let i = 0; i < oldConfig.length; i++) {
          if (!newConfig[i]) continue;
          if (String(oldConfig[i].pin) !== String(newConfig[i].pin) || oldConfig[i].name !== newConfig[i].name) {
            profilesChanged = true;
            break;
          }
        }
      }

      if (profilesChanged && onProfilesChanged) {
        await onProfilesChanged(editing.id, oldConfig, newConfig);
      }

      // Si correo o contraseña cambiaron, invocar callback para notificar clientes
      const emailChanged = editing.account_email !== form.account_email;
      const passwordChanged = editing.account_password !== form.account_password;
      
      if ((emailChanged || passwordChanged) && onCredentialsChanged) {
        onCredentialsChanged(editing.id, form.account_email, form.account_password, form.platform, emailChanged, passwordChanged);
      }
    } else {
      // Insert
      const { data, error } = await supabase.from('master_accounts').insert({
        vendor_id: user.id,
        platform: form.platform,
        account_email: form.account_email,
        account_password: form.account_password,
        total_profiles: form.total_profiles,
        purchase_price: form.purchase_price,
        purchase_date: form.purchase_date,
        supplier_phone: form.supplier_phone || null,
        supplier_name: form.supplier_name || null,
        duration_days: form.duration_days,
        notes: form.notes,
        profiles_config: form.profiles_config,
      }).select().single();

      if (error) return toast.error('Error al crear: ' + error.message);
      if (data) onAccountsChange([data, ...accounts]);
      toast.success('Cuenta agregada al inventario');

      // Guardar proveedor en contactos persistentes
      if (form.supplier_name?.trim() && onProviderSaved) {
        onProviderSaved(form.supplier_name, form.supplier_phone || null);
      }
    }
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleRenewAccount = async (account: MasterAccount) => {
    const d = new Date((account.purchase_date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
    d.setDate(d.getDate() + (account.duration_days || 30));
    const newDate = d.toISOString().split('T')[0];

    const { error } = await supabase.from('master_accounts')
      .update({ purchase_date: newDate })
      .eq('id', account.id);

    if (error) {
      toast.error('Error al renovar la cuenta: ' + error.message);
      return;
    }

    onAccountsChange(accounts.map(a => 
      a.id === account.id ? { ...a, purchase_date: newDate } : a
    ));
    toast.success('Cuenta maestra renovada');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const assigned = getAssignedCount(deleteId);
    if (assigned > 0) {
      // Don't delete, just warn - subscriptions will have master_account_id set to null by ON DELETE SET NULL
    }
    const { error } = await supabase.from('master_accounts').delete().eq('id', deleteId);
    if (error) return toast.error('Error al eliminar');
    onAccountsChange(accounts.filter(a => a.id !== deleteId));
    setDeleteId(null);
    toast.success('Cuenta eliminada del inventario');
  };

  const togglePassword = (id: string) => setShowPasswords(p => ({ ...p, [id]: !p[id] }));
  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (available: number, total: number) => {
    if (available <= 0) return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (available === 1) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  };

  // Stats
  const totalAccounts = accounts.length;
  const totalProfiles = enrichedAccounts.reduce((s, a) => s + a.total_profiles, 0);
  const totalAvailable = enrichedAccounts.reduce((s, a) => s + Math.max(0, a.available_profiles!), 0);
  const totalInvested = accounts.reduce((s, a) => s + a.purchase_price, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Cuentas en Stock</p>
          <p className="text-xl sm:text-2xl font-bold">{totalAccounts}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Perfiles Totales</p>
          <p className="text-xl sm:text-2xl font-bold">{totalProfiles}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-emerald-500">Disponibles</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-500">{totalAvailable}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFilterExpiry(f => f === 'expiring' ? 'all' : 'expiring'); setShowExpiryPanel(p => !p); }}>
          <p className="text-[10px] sm:text-xs text-amber-500 flex items-center gap-1"><Timer className="h-3 w-3" /> Por vencer</p>
          <p className={`text-xl sm:text-2xl font-bold ${totalUrgent > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{totalUrgent}</p>
        </div>
        <div className="bg-card border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Inversión Total</p>
          <p className="text-lg sm:text-xl font-bold">{formatCOP(totalInvested)}</p>
        </div>
      </div>

      {/* Expiry Alert Banner */}
      {totalUrgent > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <button
            onClick={() => setShowExpiryPanel(p => !p)}
            className="w-full flex items-center justify-between p-3 hover:bg-amber-500/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-amber-500">
                {expiredAccounts.length > 0 && `${expiredAccounts.length} vencida${expiredAccounts.length > 1 ? 's' : ''}`}
                {expiredAccounts.length > 0 && expiringAccounts.length > 0 && ' · '}
                {expiringAccounts.length > 0 && `${expiringAccounts.length} por vencer`}
              </span>
            </div>
            {showExpiryPanel ? <ChevronUp className="h-4 w-4 text-amber-500" /> : <ChevronDown className="h-4 w-4 text-amber-500" />}
          </button>

          {showExpiryPanel && (
            <div className="px-3 pb-3 space-y-2">
              {expiredAccounts.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 shrink-0">VENCIDA</span>
                    <span className="text-xs font-semibold truncate">{a.platform}</span>
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{a.account_email}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-red-400 mr-1">Venció {getExpiryDate(a.purchase_date)}</span>
                    {a.supplier_phone && (
                      <Button size="sm" variant="outline" className="h-6 text-[9px] text-green-600 border-green-600/30" title="Enviar mensaje al proveedor" onClick={() => {
                        const phone = a.supplier_phone!.replace(/\D/g, '');
                        const provName = a.supplier_name || 'Proveedor';
                        const purchaseD = new Date((a.purchase_date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
                        const cutoff = new Date(purchaseD); cutoff.setDate(cutoff.getDate() + (a.duration_days || 30));
                        const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
                        const msg = `Hola¡ ${provName} le escribo por el siguiente servicio de ${a.platform}\n\n📧 Correo: ${a.account_email}\n🔑 Contraseña: ${a.account_password}\n🗓️ Fecha de inicio: ${fmtDate(purchaseD)}\n☢️ Fecha de fin: ${fmtDate(cutoff)}\n\nSolicito renovacion del servicio.`;
                        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                      }}>
                        <MessageCircle className="h-3 w-3 mr-1" /> Pedir
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-6 text-[9px] text-emerald-600 border-emerald-600/30" onClick={() => handleRenewAccount(a)}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Renovar cuenta
                    </Button>
                  </div>
                </div>
              ))}
              {expiringAccounts.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-amber-500 bg-amber-500/20`}>{a.daysToExpiry}d</span>
                    <span className="text-xs font-semibold truncate">{a.platform}</span>
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{a.account_email}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-amber-400 mr-1">Vence {a.expiryDate}</span>
                    {a.supplier_phone && (
                      <Button size="sm" variant="outline" className="h-6 text-[9px] text-green-600 border-green-600/30" title="Enviar mensaje al proveedor" onClick={() => {
                        const phone = a.supplier_phone!.replace(/\D/g, '');
                        const provName = a.supplier_name || 'Proveedor';
                        const purchaseD = new Date((a.purchase_date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
                        const cutoff = new Date(purchaseD); cutoff.setDate(cutoff.getDate() + (a.duration_days || 30));
                        const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
                        const msg = `Hola¡ ${provName} le escribo por el siguiente servicio de ${a.platform}\n\n📧 Correo: ${a.account_email}\n🔑 Contraseña: ${a.account_password}\n🗓️ Fecha de inicio: ${fmtDate(purchaseD)}\n☢️ Fecha de fin: ${fmtDate(cutoff)}\n\nSolicito renovacion del servicio.`;
                        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                      }}>
                        <MessageCircle className="h-3 w-3 mr-1" /> Pedir
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-6 text-[9px] text-emerald-600 border-emerald-600/30" onClick={() => handleRenewAccount(a)}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Renovar cuenta
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search + Filters + Add Button */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por correo o plataforma..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {dynamicPlatforms.map((p, i) => <SelectItem key={i} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => handleOpenForm()} className="gap-1.5 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Agregar Cuenta</span><span className="sm:hidden">Agregar</span>
        </Button>
      </div>

      {/* Accounts Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay cuentas en el inventario</p>
          <p className="text-xs mt-1">Agrega tu primera cuenta maestra para empezar a controlar el stock</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(account => {
            const available = account.available_profiles!;
            const assigned = account.assigned_profiles!;
            const statusClass = getStatusColor(available, account.total_profiles);
            const costPerProfile = account.total_profiles > 0 ? Math.round(account.purchase_price / account.total_profiles) : 0;

            return (
              <div key={account.id} className={`bg-card border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow ${getExpiryStatus(account.daysToExpiry).border}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{account.platform}</span>
                    {account.daysToExpiry <= 3 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${getExpiryStatus(account.daysToExpiry).color}`}>
                        <Clock className="h-2.5 w-2.5" />
                        {account.daysToExpiry <= 0 ? 'Vencida' : `${account.daysToExpiry}d`}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
                    {available > 0 ? `${available} disponible${available > 1 ? 's' : ''}` : 'Completa'}
                  </span>
                </div>

                {/* Email & Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-mono truncate">{account.account_email}</span>
                    <button onClick={() => copyText(`email-${account.id}`, account.account_email)} className="text-muted-foreground hover:text-foreground shrink-0">
                      {copiedId === `email-${account.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-mono truncate">{showPasswords[account.id] ? account.account_password : '••••••••'}</span>
                    <button onClick={() => togglePassword(account.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                      {showPasswords[account.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button onClick={() => copyText(`pass-${account.id}`, account.account_password)} className="text-muted-foreground hover:text-foreground shrink-0">
                      {copiedId === `pass-${account.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Profile Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span><Users className="h-3 w-3 inline mr-1" />{assigned}/{account.total_profiles} perfiles usados</span>
                    <span>{available} libres</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${available <= 0 ? 'bg-red-500' : available === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${account.total_profiles > 0 ? (assigned / account.total_profiles) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Custom Profiles list */}
                {account.profiles_config && Array.isArray(account.profiles_config) && account.profiles_config.length > 0 && (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Estado de Perfiles:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto pr-0.5">
                      {account.profiles_config.map((prof: any, idx: number) => {
                        const matchingSub = subscriptions.find(s => 
                          (s as any).master_account_id === account.id && 
                          String(s.profilePin) === String(prof.pin)
                        );
                        const isSold = !!matchingSub;
                        return (
                          <div 
                            key={idx} 
                            className={`text-[9px] px-2 py-1 rounded border flex flex-col justify-between ${
                              isSold 
                                ? 'bg-red-500/[0.03] border-red-500/10 text-muted-foreground' 
                                : 'bg-emerald-500/[0.03] border-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-semibold truncate max-w-[70px]" title={prof.name}>
                                {prof.name || `Perfil ${idx + 1}`}
                              </span>
                              <span className="font-mono text-muted-foreground/80 shrink-0">🔑{prof.pin || 'S/N'}</span>
                            </div>
                            <span className="text-[8px] text-muted-foreground/80 mt-0.5 truncate">
                              {isSold ? `👤 ${matchingSub.clientName}` : 'Disponible'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Financial info */}
                <div className="flex justify-between items-center text-[10px] border-t pt-2 pb-1">
                  <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Costo: <span className="text-foreground font-semibold">{formatCOP(account.purchase_price)}</span></span>
                  <span className="text-muted-foreground">P/perfil: <span className="text-foreground font-semibold">{formatCOP(costPerProfile)}</span></span>
                </div>
                <div className="flex justify-between items-center text-[10px] pb-1">
                  <span className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Compra: <span className="text-foreground font-semibold">{account.purchase_date || 'N/A'}</span></span>
                  <span className={`flex items-center gap-1 ${account.daysToExpiry <= 0 ? 'text-red-500' : account.daysToExpiry <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    <Timer className="h-3 w-3" /> Vence: <span className="font-semibold">{account.expiryDate}</span>
                  </span>
                </div>

                {/* Supplier info */}
                {(account.supplier_name || account.supplier_phone) && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                    {account.supplier_name && <><User className="h-3 w-3" /> <span className="text-foreground font-semibold">{account.supplier_name}</span></>}
                    {account.supplier_name && account.supplier_phone && <span className="mx-1">|</span>}
                    {account.supplier_phone && <><Phone className="h-3 w-3" /> <span className="text-foreground font-semibold">{account.supplier_phone}</span></>}
                  </div>
                )}

                {/* Notes */}
                {account.notes && (
                  <p className="text-[10px] text-muted-foreground italic truncate">📝 {account.notes}</p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-1.5 pt-1">
                  {account.supplier_phone && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] text-green-600 hover:bg-green-600/10 border-green-600/30" onClick={() => {
                        const phone = account.supplier_phone!.replace(/\D/g, '');
                        const provName = account.supplier_name || 'Proveedor';
                        const purchaseD = new Date((account.purchase_date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
                        const cutoff = new Date(purchaseD); cutoff.setDate(cutoff.getDate() + (account.duration_days || 30));
                        const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
                        const msg = `Hola¡ ${provName} le escribo por el siguiente servicio de ${account.platform}\n\n📧 Correo: ${account.account_email}\n🔑 Contraseña: ${account.account_password}\n🗓️ Fecha de inicio: ${fmtDate(purchaseD)}\n☢️ Fecha de fin: ${fmtDate(cutoff)}\n\nSolicito renovacion del servicio.`;
                        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                      }}>
                        <MessageCircle className="h-3 w-3 mr-1" /> Pedir Renovar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] text-amber-600 hover:bg-amber-600/10 border-amber-600/30" onClick={() => {
                        const phone = account.supplier_phone!.replace(/\D/g, '');
                        const provName = account.supplier_name || 'Proveedor';
                        const purchaseD = new Date((account.purchase_date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
                        const cutoff = new Date(purchaseD); cutoff.setDate(cutoff.getDate() + (account.duration_days || 30));
                        const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
                        const msg = `Hola¡ ${provName} le escribo por el siguiente servicio de ${account.platform}\n\n📧 Correo: ${account.account_email}\n🔑 Contraseña: ${account.account_password}\n🗓️ Fecha de inicio: ${fmtDate(purchaseD)}\n☢️ Fecha de fin: ${fmtDate(cutoff)}\n\nSolicito soporte ante un inconveniente con el servicio.`;
                        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                      }}>
                        <Wrench className="h-3 w-3 mr-1" /> Soporte
                      </Button>
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full h-7 text-[10px] text-emerald-600 hover:bg-emerald-600/10 border-emerald-600/30 font-medium" onClick={() => handleRenewAccount(account)}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Renovar en Sistema (Añadir {account.duration_days || 30} días)
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={() => handleOpenForm(account)}>
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(account.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={v => !v && setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editing ? 'Editar Cuenta' : 'Nueva Cuenta Maestra'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Plataforma</Label>
                <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicPlatforms.map((p, i) => <SelectItem key={i} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Perfiles totales</Label>
                <Input type="number" min={1} max={10} value={form.total_profiles} onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setForm(p => ({ 
                    ...p, 
                    total_profiles: val,
                    profiles_config: syncProfilesConfig(val, p.profiles_config || [])
                  }));
                }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Correo de la cuenta <span className="text-destructive">*</span></Label>
                <Input value={form.account_email} onChange={e => setForm(p => ({ ...p, account_email: e.target.value }))} placeholder="cuenta@email.com" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contraseña</Label>
                <Input value={form.account_password} onChange={e => setForm(p => ({ ...p, account_password: e.target.value }))} placeholder="Contraseña de la cuenta" />
              </div>
            </div>

            {/* Custom Profiles list */}
            <div className="space-y-3 p-3 bg-muted/40 rounded-xl border border-border">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Users className="h-4 w-4 text-primary" /> Personalización de Perfiles
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Configura el nombre y el PIN de cada perfil. El sistema de la tienda usará estos datos exactos al momento de vender.
              </p>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {form.profiles_config?.map((prof, i) => (
                  <div key={i} className="flex gap-2 items-center bg-card border rounded-lg p-2">
                    <span className="text-[10px] font-bold text-muted-foreground w-16">
                      Perfil {i + 1}
                    </span>
                    <div className="flex-1">
                      <Input
                        className="h-7 text-xs"
                        placeholder="Nombre"
                        value={prof.name}
                        onChange={e => {
                          const val = e.target.value;
                          setForm(p => {
                            const configs = [...(p.profiles_config || [])];
                            configs[i] = { ...configs[i], name: val };
                            return { ...p, profiles_config: configs };
                          });
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        className="h-7 text-xs font-mono"
                        placeholder="PIN"
                        maxLength={6}
                        value={prof.pin}
                        onChange={e => {
                          const val = e.target.value;
                          setForm(p => {
                            const configs = [...(p.profiles_config || [])];
                            configs[i] = { ...configs[i], pin: val };
                            return { ...p, profiles_config: configs };
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <Label className="text-xs font-semibold text-primary flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Datos de facturación
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Fecha de adquisición</Label>
                  <Input type="date" value={form.purchase_date} onChange={e => handlePurchaseDateChange(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
                    <span>Fecha de corte</span>
                    <span className="text-primary opacity-80">({form.duration_days || 30} días)</span>
                  </Label>
                  <Input type="date" value={cutDate} onChange={e => handleCutDateChange(e.target.value)} required />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Costo total de la cuenta</Label>
                  <Input type="number" min={0} value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: parseInt(e.target.value) || 0 }))} placeholder="Ej: 40000" />
                </div>
              </div>
              {form.purchase_price > 0 && form.total_profiles > 0 && (
                <p className="text-[10px] text-muted-foreground border-t border-primary/10 pt-2">
                  Costo distribuido por perfil: <span className="font-bold text-foreground text-xs">{formatCOP(Math.round(form.purchase_price / form.total_profiles))}</span>
                </p>
              )}
            </div>

            <div className="space-y-3 p-3 bg-green-500/5 rounded-xl border border-green-500/20">
              <Label className="text-xs font-semibold text-green-600 flex items-center gap-1">
                <User className="h-4 w-4" /> Datos del proveedor (opcional)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 relative">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Nombre del proveedor</Label>
                  <Input 
                    ref={providerInputRef}
                    value={form.supplier_name} 
                    onChange={e => {
                      setForm(p => ({ ...p, supplier_name: e.target.value }));
                      setShowProviderSuggestions(true);
                    }}
                    onFocus={() => setShowProviderSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProviderSuggestions(false), 200)}
                    placeholder="Ej: Carlos, Tienda X..." 
                    autoComplete="off"
                  />
                  {(() => {
                    if (!showProviderSuggestions || !form.supplier_name || form.supplier_name.trim().length < 2) return null;
                    const q = form.supplier_name.trim().toLowerCase();
                    const suggestions = providerContacts
                      .filter(c => c.name.toLowerCase().includes(q))
                      .sort((a, b) => {
                        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
                        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
                        return aStarts - bStarts || a.name.localeCompare(b.name);
                      })
                      .slice(0, 8);
                    if (suggestions.length === 0) return null;
                    return (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-[200px] overflow-y-auto">
                        {suggestions.map(contact => (
                          <button
                            key={contact.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2 text-sm"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setForm(p => ({
                                ...p,
                                supplier_name: contact.name,
                                ...((!p.supplier_phone && contact.phone) ? { supplier_phone: contact.phone } : {})
                              }));
                              setShowProviderSuggestions(false);
                            }}
                          >
                            <span className="font-medium truncate">{contact.name}</span>
                            {contact.phone && (
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">📱 {contact.phone}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  {providerContacts.length > 0 && !form.supplier_name && (
                    <p className="text-[10px] text-muted-foreground">💡 Escribe para buscar proveedores</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Teléfono / WhatsApp</Label>
                  <Input value={form.supplier_phone} onChange={e => setForm(p => ({ ...p, supplier_phone: e.target.value }))} placeholder="Ej: 573001234567" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Se habilitarán botones de Renovar y Soporte técnico en la tarjeta.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas (opcional)</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ej: Vence el 20 de cada mes, comprada a proveedor X..." rows={2} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="shadow-lg shadow-primary/20">{editing ? 'Guardar Cambios' : 'Agregar al Inventario'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta del inventario?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && getAssignedCount(deleteId) > 0
                ? `Esta cuenta tiene ${getAssignedCount(deleteId)} perfil(es) asignados a clientes. Los clientes conservarán sus datos pero se desvinculará la cuenta del stock.`
                : 'Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
