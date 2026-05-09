import { useState } from 'react';
import { MasterAccount } from '@/types/masterAccount';
import { Subscription } from '@/types/subscription';
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
import { Package, Plus, Pencil, Trash2, Eye, EyeOff, Copy, Check, Search, Mail, Lock, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  accounts: MasterAccount[];
  subscriptions: Subscription[];
  dynamicPlatforms: string[];
  onAccountsChange: (accounts: MasterAccount[]) => void;
  onPasswordChanged?: (masterAccountId: string, newPassword: string, platform: string) => void;
}

export default function AccountsSection({ accounts, subscriptions, dynamicPlatforms, onAccountsChange, onPasswordChanged }: Props) {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MasterAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const emptyForm = { platform: dynamicPlatforms[0] || 'Netflix', account_email: '', account_password: '', total_profiles: 4, purchase_price: 0, notes: '', purchase_date: new Date().toISOString().split('T')[0] };
  const [form, setForm] = useState(emptyForm);

  const getAssignedCount = (accountId: string) => {
    return subscriptions.filter(s => (s as any).master_account_id === accountId).length;
  };

  const enrichedAccounts = accounts.map(a => ({
    ...a,
    assigned_profiles: getAssignedCount(a.id),
    available_profiles: a.total_profiles - getAssignedCount(a.id),
  }));

  const filtered = enrichedAccounts.filter(a => {
    if (search && !a.account_email.toLowerCase().includes(search.toLowerCase()) && !a.platform.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlatform !== 'all' && a.platform !== filterPlatform) return false;
    return true;
  });

  const handleOpenForm = (account?: MasterAccount) => {
    if (account) {
      setEditing(account);
      setForm({
        platform: account.platform,
        account_email: account.account_email,
        account_password: account.account_password,
        total_profiles: account.total_profiles,
        purchase_price: account.purchase_price,
        notes: account.notes,
        purchase_date: account.purchase_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
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
        notes: form.notes,
      }).eq('id', editing.id);

      if (error) return toast.error('Error al actualizar: ' + error.message);
      onAccountsChange(accounts.map(a => a.id === editing.id ? { ...a, ...form } : a));
      toast.success('Cuenta actualizada');

      // Si la contraseña cambió, invocar callback para notificar clientes
      if (editing.account_password !== form.account_password && onPasswordChanged) {
        onPasswordChanged(editing.id, form.account_password, form.platform);
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
        notes: form.notes,
      }).select().single();

      if (error) return toast.error('Error al crear: ' + error.message);
      if (data) onAccountsChange([data, ...accounts]);
      toast.success('Cuenta agregada al inventario');
    }
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <div className="bg-card border rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Inversión Total</p>
          <p className="text-lg sm:text-xl font-bold">{formatCOP(totalInvested)}</p>
        </div>
      </div>

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
              <div key={account.id} className="bg-card border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{account.platform}</span>
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

                {/* Financial info */}
                <div className="flex justify-between items-center text-[10px] border-t pt-2 pb-1">
                  <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Costo: <span className="text-foreground font-semibold">{formatCOP(account.purchase_price)}</span></span>
                  <span className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Adquisición: <span className="text-foreground font-semibold">{account.purchase_date || 'N/A'}</span></span>
                </div>
                <div className="text-[10px] text-right text-muted-foreground pb-2">
                  P/perfil: <span className="text-foreground font-semibold">{formatCOP(costPerProfile)}</span>
                </div>

                {/* Notes */}
                {account.notes && (
                  <p className="text-[10px] text-muted-foreground italic truncate">📝 {account.notes}</p>
                )}

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
                <Input type="number" min={1} max={10} value={form.total_profiles} onChange={e => setForm(p => ({ ...p, total_profiles: parseInt(e.target.value) || 1 }))} />
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

            <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <Label className="text-xs font-semibold text-primary flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Datos de facturación
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Fecha de adquisición</Label>
                  <Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
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
