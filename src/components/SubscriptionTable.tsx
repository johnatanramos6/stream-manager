import { Subscription, getPlatformClass, getRowStatus, getDaysUntilPayment, getNextPaymentDate } from '@/types/subscription';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface Props {
  subscriptions: Subscription[];
  onEdit: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  onTogglePayment: (id: string) => void;
}

export default function SubscriptionTable({ subscriptions, onEdit, onDelete, onTogglePayment }: Props) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const statusBadge = (status: string) => {
    if (status === 'pagado') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-paid border">✅ Pagado</span>;
    if (status === 'cobrar') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-danger border">🔴 Cobrar</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium status-pending border">⚠️ Debe</span>;
  };

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No hay suscripciones aún</p>
        <p className="text-sm mt-1">Agrega tu primera suscripción con el botón de arriba</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-3 font-semibold">Plataforma</th>
            <th className="text-left p-3 font-semibold">Cliente</th>
            <th className="text-left p-3 font-semibold">Correo / Contraseña</th>
            <th className="text-left p-3 font-semibold">PIN</th>
            <th className="text-left p-3 font-semibold">Fecha</th>
            <th className="text-left p-3 font-semibold">Próx. corte</th>
            <th className="text-left p-3 font-semibold">Estado</th>
            <th className="text-left p-3 font-semibold">Notas</th>
            <th className="text-right p-3 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map(sub => {
            const rowStatus = getRowStatus(sub.purchaseDate);
            const days = getDaysUntilPayment(sub.purchaseDate);
            const nextDate = getNextPaymentDate(sub.purchaseDate);
            const rowClass = rowStatus === 'danger' ? 'row-danger' : rowStatus === 'warning' ? 'row-warning' : '';

            return (
              <tr key={sub.id} className={`border-t transition-colors hover:bg-muted/30 ${rowClass}`}>
                <td className="p-3">
                  <Badge className={`${getPlatformClass(sub.platform)} border-0 text-xs`}>
                    {sub.platform}
                  </Badge>
                </td>
                <td className="p-3 font-medium">{sub.clientName}</td>
                <td className="p-3">
                  <div className="text-xs text-muted-foreground">{sub.accountEmail}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-mono">
                      {showPasswords[sub.id] ? sub.accountPassword : '••••••'}
                    </span>
                    <button onClick={() => togglePassword(sub.id)} className="text-muted-foreground hover:text-foreground">
                      {showPasswords[sub.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </td>
                <td className="p-3 font-mono text-xs">{sub.profilePin || '—'}</td>
                <td className="p-3 text-xs">{formatDate(sub.purchaseDate)}</td>
                <td className="p-3">
                  <div className="text-xs">{nextDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</div>
                  <div className={`text-[10px] font-medium ${days <= 0 ? 'text-destructive' : days <= 2 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {days <= 0 ? '¡Hoy es corte!' : days === 1 ? 'Mañana' : `${days} días`}
                  </div>
                </td>
                <td className="p-3">
                  <button onClick={() => onTogglePayment(sub.id)}>
                    {statusBadge(sub.paymentStatus)}
                  </button>
                </td>
                <td className="p-3 text-xs text-muted-foreground max-w-[120px] truncate">{sub.notes || '—'}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(sub)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(sub.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
