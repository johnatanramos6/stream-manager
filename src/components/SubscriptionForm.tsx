import { useState, useEffect } from 'react';
import { Subscription, PLATFORMS, Platform, PaymentStatus } from '@/types/subscription';
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
}

export default function SubscriptionForm({ open, onClose, onSave, initial }: Props) {
  const empty: Omit<Subscription, 'id'> = {
    platform: 'Netflix',
    accountEmail: '',
    accountPassword: '',
    clientName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    profilePin: '',
    paymentStatus: 'debe',
    notes: '',
    accountName: '',
  };

  const [form, setForm] = useState<Omit<Subscription, 'id'>>(
    initial ? { ...initial } : empty
  );

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : empty);
    }
  }, [open, initial]);

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
          <DialogTitle>{initial ? 'Editar' : 'Nueva'} Suscripción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={v => set('platform', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={form.clientName} onChange={e => set('clientName', e.target.value)} required placeholder="Nombre del cliente" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Correo de cuenta</Label>
              <Input value={form.accountEmail} onChange={e => set('accountEmail', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <Input value={form.accountPassword} onChange={e => set('accountPassword', e.target.value)} placeholder="Contraseña" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha adquisición</Label>
              <Input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>PIN perfil</Label>
              <Input value={form.profilePin} onChange={e => set('profilePin', e.target.value)} placeholder="1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado de pago</Label>
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
            <Label>Nombre de cuenta (opcional)</Label>
            <Input value={form.accountName || ''} onChange={e => set('accountName', e.target.value)} placeholder="Ej: Cuenta Netflix principal" />
          </div>

          <div className="space-y-1.5">
            <Label>Notas / Anotación</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anotaciones adicionales..." rows={2} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{initial ? 'Guardar' : 'Agregar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
