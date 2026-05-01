import { useState, useEffect, useMemo } from 'react';
import { Subscription, Platform, PaymentStatus } from '@/types/subscription';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (sub: Subscription) => void;
  initial?: Subscription | null;
  dynamicPlatforms?: string[];
  allSubscriptions?: Subscription[];
}

export default function SubscriptionForm({ open, onClose, onSave, initial, dynamicPlatforms = [], allSubscriptions = [] }: Props) {
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
  };

  const [form, setForm] = useState<Omit<Subscription, 'id'>>(
    initial ? { ...initial } : empty
  );

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

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : empty);
    }
  }, [open, initial]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      id: initial?.id || crypto.randomUUID(),
    });
    setForm(empty);
    onClose();
  };

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Teléfono / WhatsApp (opcional)</Label>
            <Input type="tel" value={form.clientPhone || ''} onChange={e => set('clientPhone', e.target.value)} placeholder="+57 300 000 0000" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fecha adquisición <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} required />
            </div>
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
            <Label className="text-xs font-semibold text-primary">Precio de venta acordado (opcional)</Label>
            <Input 
              type="number" 
              value={form.salePriceOverride || ''} 
              onChange={e => set('salePriceOverride', e.target.value === '' ? '' : Number(e.target.value) as any)} 
              placeholder="Ej: Precio especial o dejalo en blanco para usar el costo base" 
            />
            <p className="text-[10px] text-muted-foreground mt-1">Si dejas esto en blanco, se usará el precio por defecto de la configuración general.</p>
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
