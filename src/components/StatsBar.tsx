import { Subscription, getDaysUntilPayment } from '@/types/subscription';
import { Tv, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';

interface Props {
  subscriptions: Subscription[];
}

export default function StatsBar({ subscriptions }: Props) {
  const total = subscriptions.length;
  const paid = subscriptions.filter(s => s.paymentStatus === 'pagado').length;
  const owing = subscriptions.filter(s => s.paymentStatus === 'debe').length;
  const urgent = subscriptions.filter(s => getDaysUntilPayment(s.purchaseDate) <= 2).length;

  const stats = [
    { label: 'Total clientes', value: total, icon: Tv, color: 'text-primary' },
    { label: 'Pagados', value: paid, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Deben', value: owing, icon: DollarSign, color: 'text-amber-500' },
    { label: 'Próx. a vencer', value: urgent, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className={`${s.color} bg-muted rounded-lg p-2`}>
            <s.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
