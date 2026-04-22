import { Subscription, getPlatformClass, getRowStatus, getDaysUntilPayment, getNextPaymentDate } from '@/types/subscription';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Eye, EyeOff, Copy, Check, ArrowUpDown, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  subscriptions: Subscription[];
  onEdit: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  onTogglePayment: (id: string) => void;
}

type SortKey = 'clientName' | 'platform' | 'purchaseDate' | 'paymentStatus' | null;
type SortDir = 'asc' | 'desc';

export default function SubscriptionTable({ subscriptions, onEdit, onDelete, onTogglePayment }: Props) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyPassword = async (id: string, password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedId(id);
      toast.success('Contraseña copiada');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const sendWhatsAppReminder = (sub: Subscription) => {
    if (!sub.clientPhone) return toast.error("Este cliente no tiene un teléfono registrado.");
    const phone = sub.clientPhone.replace(/\D/g, '');
    if (!phone) return toast.error("El número de teléfono no es válido.");
    
    const message = `¡Hola ${sub.clientName}! 👋 Te saludamos de Stream Manager.\n\nQueríamos recordarte amablemente que tu suscripción de ${sub.platform} está próxima a vencer (o ya venció). ¡No pierdas el acceso a tus perfiles, escríbenos para renovarla!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...subscriptions].sort((a, b) => {
    if (!sortKey) return 0;
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'clientName') return a.clientName.localeCompare(b.clientName) * dir;
    if (sortKey === 'platform') return a.platform.localeCompare(b.platform) * dir;
    if (sortKey === 'purchaseDate') return a.purchaseDate.localeCompare(b.purchaseDate) * dir;
    if (sortKey === 'paymentStatus') return a.paymentStatus.localeCompare(b.paymentStatus) * dir;
    return 0;
  });

  const statusBadge = (status: string) => {
    if (status === 'pagado') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold status-paid border">✅ Pagado</span>;
    if (status === 'cobrar') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold status-danger border">🔴 Cobrar</span>;
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold status-warning border">⚠️ Debe</span>;
  };

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  const SortHeader = ({ label, sKey, className = '' }: { label: string; sKey: SortKey; className?: string }) => (
    <th className={`p-3 font-semibold ${className}`}>
      <button onClick={() => handleSort(sKey)} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sKey ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </button>
    </th>
  );

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <span className="text-3xl">📺</span>
        </div>
        <p className="text-lg font-medium">No hay suscripciones aún</p>
        <p className="text-sm mt-1">Agrega tu primera suscripción con el botón de arriba</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop Table ── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border bg-card animate-fade-in">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <SortHeader label="Plataforma" sKey="platform" className="text-left" />
              <SortHeader label="Cliente" sKey="clientName" className="text-left" />
              <th className="text-left p-3 font-semibold">Correo / Contraseña</th>
              <th className="text-left p-3 font-semibold">PIN</th>
              <SortHeader label="Fecha" sKey="purchaseDate" className="text-left" />
              <th className="text-left p-3 font-semibold">Próx. corte</th>
              <SortHeader label="Estado" sKey="paymentStatus" className="text-left" />
              <th className="text-left p-3 font-semibold">Notas</th>
              <th className="text-right p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((sub, i) => {
              const rowStatus = getRowStatus(sub.purchaseDate);
              const days = getDaysUntilPayment(sub.purchaseDate);
              const nextDate = getNextPaymentDate(sub.purchaseDate);
              const rowClass = rowStatus === 'danger' ? 'row-danger' : rowStatus === 'warning' ? 'row-warning' : '';

              return (
                <tr
                  key={sub.id}
                  className={`border-t transition-all duration-200 hover:bg-muted/40 ${rowClass}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="p-3">
                    <Badge className={`${getPlatformClass(sub.platform)} border-0 text-xs font-semibold shadow-sm max-w-[120px] truncate block w-fit`}>
                      {sub.platform}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold">{sub.clientName}</td>
                  <td className="p-3">
                    <div className="text-xs text-muted-foreground">{sub.accountEmail || '—'}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-mono">
                        {showPasswords[sub.id] ? sub.accountPassword : sub.accountPassword ? '••••••' : '—'}
                      </span>
                      {sub.accountPassword && (
                        <div className="flex gap-0.5">
                          <button onClick={() => togglePassword(sub.id)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                            {showPasswords[sub.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button onClick={() => copyPassword(sub.id, sub.accountPassword)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                            {copiedId === sub.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">{sub.profilePin || '—'}</td>
                  <td className="p-3 text-xs">{formatDate(sub.purchaseDate)}</td>
                  <td className="p-3">
                    <div className="text-xs">{nextDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</div>
                    <div className={`text-[10px] font-semibold ${days <= 0 ? 'text-destructive animate-pulse-soft' : days <= 2 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      {days <= 0 ? '¡Hoy es corte!' : days === 1 ? 'Mañana' : `${days} días`}
                    </div>
                  </td>
                  <td className="p-3">
                    <button onClick={() => onTogglePayment(sub.id)} className="transition-transform hover:scale-105">
                      {statusBadge(sub.paymentStatus)}
                    </button>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[120px] truncate">{sub.notes || '—'}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className={`h-7 w-7 ${sub.clientPhone ? 'text-green-600 hover:bg-green-600/10 hover:text-green-700' : 'text-muted-foreground/30'}`}
                        onClick={() => sub.clientPhone && sendWhatsAppReminder(sub)}
                        disabled={!sub.clientPhone}
                        title="Enviar recordatorio por WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => onEdit(sub)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-destructive/10 text-destructive" onClick={() => onDelete(sub.id)}>
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

      {/* ── Mobile Card View ── */}
      <div className="md:hidden space-y-3">
        {sorted.map((sub, i) => {
          const days = getDaysUntilPayment(sub.purchaseDate);
          const nextDate = getNextPaymentDate(sub.purchaseDate);
          const rowStatus = getRowStatus(sub.purchaseDate);

          return (
            <div
              key={sub.id}
              className={`mobile-card relative overflow-hidden ${
                rowStatus === 'danger'
                  ? 'border-l-4 border-l-destructive border-destructive/30 bg-destructive/5 shadow-[0_4px_12px_rgba(239,68,68,0.15)]'
                  : rowStatus === 'warning'
                    ? 'border-l-4 border-l-yellow-500 border-yellow-500/30 bg-yellow-500/5 shadow-[0_4px_12px_rgba(234,179,8,0.15)]'
                    : ''
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Top row: platform + status + actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                  <Badge className={`${getPlatformClass(sub.platform)} border-0 text-xs font-semibold shadow-sm max-w-[120px] truncate block`}>
                    {sub.platform}
                  </Badge>
                  <button onClick={() => onTogglePayment(sub.id)} className="transition-transform active:scale-95 shrink-0">
                    {statusBadge(sub.paymentStatus)}
                  </button>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className={`h-8 w-8 ${sub.clientPhone ? 'text-green-600 hover:bg-green-600/10 hover:text-green-700' : 'text-muted-foreground/30'}`} 
                    onClick={() => sub.clientPhone && sendWhatsAppReminder(sub)}
                    disabled={!sub.clientPhone}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => onEdit(sub)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 text-destructive" onClick={() => onDelete(sub.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Client name */}
              <div className="font-semibold text-base">{sub.clientName}</div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Correo:</span>
                  <div className="font-medium truncate">{sub.accountEmail || '—'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">PIN:</span>
                  <div className="font-mono font-medium">{sub.profilePin || '—'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Contraseña:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium">
                      {showPasswords[sub.id] ? sub.accountPassword : sub.accountPassword ? '••••••' : '—'}
                    </span>
                    {sub.accountPassword && (
                      <div className="flex gap-1">
                        <button onClick={() => togglePassword(sub.id)} className="text-muted-foreground">
                          {showPasswords[sub.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button onClick={() => copyPassword(sub.id, sub.accountPassword)} className="text-muted-foreground">
                          {copiedId === sub.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Próx. corte:</span>
                  <div className="font-medium">
                    {nextDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    <span className={`ml-1 text-[10px] font-semibold ${days <= 0 ? 'text-destructive' : days <= 2 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      ({days <= 0 ? '¡Hoy!' : days === 1 ? 'Mañana' : `${days}d`})
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {sub.notes && (
                <div className="text-xs text-muted-foreground border-t pt-2 mt-1">
                  📝 {sub.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
