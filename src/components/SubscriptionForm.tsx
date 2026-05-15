import { useState, useEffect, useMemo } from 'react';
import { Subscription, Platform, PaymentStatus } from '@/types/subscription';
import { MasterAccount } from '@/types/masterAccount';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Pencil, Users } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (sub: Subscription) => void;
  initial?: Subscription | null;
  dynamicPlatforms?: string[];
  allSubscriptions?: Subscription[];
  masterAccounts?: MasterAccount[];
}

export default function SubscriptionForm({ open, onClose, onSave, initial, dynamicPlatforms = [], allSubscriptions = [], masterAccounts = [] }: Props) {
  const empty: Omit<Subscription, 'id'> = {
    platform: 'Netflix',
    accountEmail: '',
    accountPassword: '',
    clientName: '',
    clientPhone: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    profilePin: '',
    paymentStatus: 'debe',
    notes: '',
    accountName: '',
    duration_days: 30,
  };

  const [form, setForm] = useState<Omit<Subscription, 'id'>>(
    initial ? { ...initial } : empty
  );
  const [accountMode, setAccountMode] = useState<'manual' | 'stock'>('manual');
  const [selectedMasterAccountId, setSelectedMasterAccountId] = useState<string>('');
  const [sellFullAccount, setSellFullAccount] = useState(false);

  const existingAccounts = useMemo(() => {
    const map = new Map<string, { email: string; password: string; accountName: string }>();
    allSubscriptions.forEach(s => {
      if (s.accountEmail) {
        const key = `${s.platform}::${s.accountEmail}`;
        if (!map.has(key)) {
          map.set(key, { email: s.accountEmail, password: s.accountPassword, accountName: s.accountName || '' });
        }
      }
    });
    return map;
  }, [allSubscriptions, open]);

  const emailSuggestions = useMemo(() => {
    const suggestions: { email: string; password: string; accountName: string }[] = [];
    existingAccounts.forEach((v, k) => {
      if (k.startsWith(form.platform + '::')) {
        suggestions.push(v);
      }
    });
    return suggestions;
  }, [form.platform, existingAccounts]);

  // Get available master accounts for the selected platform
  const availableMasterAccounts = useMemo(() => {
    return masterAccounts.filter(ma => {
      if (ma.platform !== form.platform) return false;
      const assignedCount = allSubscriptions.filter(s => (s as any).master_account_id === ma.id)
        .reduce((sum, s) => sum + ((s as any).profiles_sold || 1), 0);
      return assignedCount < ma.total_profiles;
    }).map(ma => {
      const assignedCount = allSubscriptions.filter(s => (s as any).master_account_id === ma.id)
        .reduce((sum, s) => sum + ((s as any).profiles_sold || 1), 0);
      return { ...ma, assigned: assignedCount, available: ma.total_profiles - assignedCount };
    });
  }, [masterAccounts, form.platform, allSubscriptions, open]);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : empty);
      setAccountMode(initial && (initial as any).master_account_id ? 'stock' : 'manual');
      setSelectedMasterAccountId(initial ? (initial as any).master_account_id || '' : '');
      setSellFullAccount(false);
    }
  }, [open, initial]);

  // When platform changes, reset stock selection
  useEffect(() => {
    setSelectedMasterAccountId('');
  }, [form.platform]);

  const handleEmailChange = (email: string) => {
    setForm(prev => {
      const key = `${prev.platform}::${email}`;
      const existing = existingAccounts.get(key);
      if (existing) {
        return { ...prev, accountEmail: email, accountPassword: existing.password, accountName: existing.accountName };
      }
      return { ...prev, accountEmail: email };
    });
  };

  const handleSelectMasterAccount = (accountId: string) => {
    setSelectedMasterAccountId(accountId);
    const ma = masterAccounts.find(m => m.id === accountId);
    if (ma) {
      setForm(prev => ({
        ...prev,
        accountEmail: ma.account_email,
        accountPassword: ma.account_password,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Venta de cuenta completa: UNA sola suscripci\u00f3n que ocupa todos los perfiles
    if (accountMode === 'stock' && sellFullAccount && selectedMasterAccountId) {
      const ma = masterAccounts.find(m => m.id === selectedMasterAccountId);
      if (!ma) return;
      const sub: any = {
        ...form,
        id: crypto.randomUUID(),
        master_account_id: selectedMasterAccountId,
        profiles_sold: ma.total_profiles,
        notes: form.notes || `Cuenta completa (${ma.total_profiles} perfiles)`,
      };
      onSave(sub);
      setForm(empty);
      setAccountMode('manual');
      setSelectedMasterAccountId('');
      setSellFullAccount(false);
      onClose();
      return;
    }

    const sub: any = {
      ...form,
      id: initial?.id || crypto.randomUUID(),
    };
    if (accountMode === 'stock' && selectedMasterAccountId) {
      sub.master_account_id = selectedMasterAccountId;
    } else {
      sub.master_account_id = null;
    }
    onSave(sub);
    setForm(empty);
    setAccountMode('manual');
    setSelectedMasterAccountId('');
    setSellFullAccount(false);
    onClose();
  };

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const hasMasterAccounts = masterAccounts.some(ma => ma.platform === form.platform);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{initial ? 'Editar' : 'Nueva'} Suscripción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Plataforma</Label>
              <Select value={form.platform} onValueChange={v => set('platform', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dynamicPlatforms.map((p, i) => <SelectItem key={i} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente <span className="text-destructive">*</span></Label>
              <Input value={form.clientName} onChange={e => set('clientName', e.target.value)} required placeholder="Nombre del cliente" />
            </div>
          </div>

          {/* Account Mode Toggle - Only show if there are master accounts for this platform */}
          {hasMasterAccounts && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => { setAccountMode('manual'); setSelectedMasterAccountId(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${accountMode === 'manual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Pencil className="h-3 w-3" /> Manual
              </button>
              <button
                type="button"
                onClick={() => setAccountMode('stock')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${accountMode === 'stock' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Package className="h-3 w-3" /> Desde Stock ({availableMasterAccounts.length})
              </button>
            </div>
          )}

          {accountMode === 'stock' ? (
            /* Stock Mode */
            <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <Label className="text-xs font-semibold text-primary">📦 Seleccionar cuenta del inventario</Label>
              {availableMasterAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay cuentas de {form.platform} con perfiles disponibles.</p>
              ) : (
                <Select value={selectedMasterAccountId} onValueChange={handleSelectMasterAccount}>
                  <SelectTrigger><SelectValue placeholder="Elegir cuenta..." /></SelectTrigger>
                  <SelectContent>
                    {availableMasterAccounts.map(ma => (
                      <SelectItem key={ma.id} value={ma.id}>
                        {ma.account_email} ({ma.available} de {ma.total_profiles} libres)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedMasterAccountId && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>📧 {form.accountEmail}</p>
                    <p>🔒 Contraseña asignada automáticamente</p>
                  </div>
                  {/* Toggle cuenta completa */}
                  {!initial && (() => {
                    const ma = masterAccounts.find(m => m.id === selectedMasterAccountId);
                    if (!ma || ma.total_profiles <= 1) return null;
                    const assignedCount = allSubscriptions.filter(s => (s as any).master_account_id === ma.id).length;
                    const allAvailable = assignedCount === 0;
                    if (!allAvailable) return null;
                    return (
                      <div className={`p-2.5 rounded-lg border transition-all cursor-pointer ${sellFullAccount ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/50 border-muted hover:border-primary/30'}`}
                        onClick={() => setSellFullAccount(p => !p)}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${sellFullAccount ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/40'}`}>
                            {sellFullAccount && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <div>
                            <p className="text-xs font-semibold">Vender cuenta completa ({ma.total_profiles} perfiles)</p>
                            <p className="text-[10px] text-muted-foreground">Se crearán {ma.total_profiles} suscripciones para el mismo cliente</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            /* Manual Mode */
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Correo de cuenta</Label>
                <Input
                  value={form.accountEmail}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  list="email-suggestions"
                />
                {emailSuggestions.length > 0 && (
                  <datalist id="email-suggestions">
                    {emailSuggestions.map((s, i) => <option key={i} value={s.email} />)}
                  </datalist>
                )}
                {emailSuggestions.length > 0 && !form.accountEmail && (
                  <p className="text-[10px] text-muted-foreground">💡 Correos existentes disponibles</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contraseña</Label>
                <Input value={form.accountPassword} onChange={e => set('accountPassword', e.target.value)} placeholder="Contraseña" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Teléfono / WhatsApp (opcional)</Label>
            <Input type="tel" value={form.clientPhone || ''} onChange={e => set('clientPhone', e.target.value)} placeholder="+57 300 000 0000" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha adquisición <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duración (días) <span className="text-destructive">*</span></Label>
              <div className="flex gap-1">
                <Input 
                  type="number" 
                  min="1" 
                  value={form.duration_days === undefined ? '' : form.duration_days} 
                  onChange={e => {
                    const val = e.target.value;
                    set('duration_days', val === '' ? ('' as any) : parseInt(val));
                  }} 
                  required 
                  className="w-16 text-center px-1" 
                />
                <Select 
                  value={String(form.duration_days || '')} 
                  onValueChange={v => set('duration_days', parseInt(v))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Personalizado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 días</SelectItem>
                    <SelectItem value="28">28 días</SelectItem>
                    <SelectItem value="30">1 Mes (30d)</SelectItem>
                    <SelectItem value="60">2 Meses (60d)</SelectItem>
                    <SelectItem value="90">3 Meses (90d)</SelectItem>
                    {form.duration_days && ![25, 28, 30, 60, 90].includes(form.duration_days) && (
                      <SelectItem value={String(form.duration_days)}>{form.duration_days} días</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">PIN perfil</Label>
              <Input value={form.profilePin} onChange={e => set('profilePin', e.target.value)} placeholder="1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estado de pago</Label>
              <Select value={form.paymentStatus} onValueChange={v => set('paymentStatus', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagado">✅ Pagado</SelectItem>
                  <SelectItem value="debe">⚠️ Debe</SelectItem>
                  <SelectItem value="cobrar">🔴 Cobrar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nombre de cuenta (opcional)</Label>
            <Input value={form.accountName || ''} onChange={e => set('accountName', e.target.value)} placeholder="Ej: Cuenta Netflix principal" />
          </div>

          <div className="space-y-1.5 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <Label className="text-xs font-semibold text-primary">
              {sellFullAccount ? 'Precio de venta cuenta completa (opcional)' : 'Precio de venta acordado (opcional)'}
            </Label>
            <Input 
              type="number" 
              value={form.salePriceOverride || ''} 
              onChange={e => set('salePriceOverride', e.target.value === '' ? '' : Number(e.target.value) as any)} 
              placeholder={sellFullAccount ? 'Precio total de la cuenta completa' : 'Ej: Precio especial o dejalo en blanco para usar el costo base'} 
            />
            {sellFullAccount ? (
              <p className="text-[10px] text-muted-foreground mt-1">
                {form.salePriceOverride 
                  ? <>Este ser&aacute; el precio total de venta por la cuenta completa con todos los perfiles.</>
                  : <>Si dejas esto en blanco, se usar&aacute; el precio por defecto de la configuraci&oacute;n general.</>
                }
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1">Si dejas esto en blanco, se usar&aacute; el precio por defecto de la configuraci&oacute;n general.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notas / Anotación</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anotaciones adicionales..." rows={2} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="shadow-lg shadow-primary/20">{initial ? 'Guardar cambios' : 'Agregar suscripción'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
