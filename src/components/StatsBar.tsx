import { Subscription, getDaysUntilPayment } from '@/types/subscription';
import { Tv, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  subscriptions: Subscription[];
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display}</span>;
}

export default function StatsBar({ subscriptions }: Props) {
  const total = subscriptions.length;
  const paid = subscriptions.filter(s => s.paymentStatus === 'pagado').length;
  const owing = subscriptions.filter(s => s.paymentStatus === 'debe').length;
  const urgent = subscriptions.filter(s => getDaysUntilPayment(s.purchaseDate) <= 2).length;

  const stats = [
    { label: 'Total clientes', value: total, icon: Tv, color: 'text-primary', bg: 'stat-gradient-primary', iconBg: 'bg-primary/10' },
    { label: 'Pagados', value: paid, icon: CheckCircle, color: 'text-emerald-500', bg: 'stat-gradient-success', iconBg: 'bg-emerald-500/10' },
    { label: 'Deben', value: owing, icon: DollarSign, color: 'text-amber-500', bg: 'stat-gradient-warning', iconBg: 'bg-amber-500/10' },
    { label: 'Próx. a vencer', value: urgent, icon: AlertTriangle, color: 'text-destructive', bg: 'stat-gradient-danger', iconBg: 'bg-destructive/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`${s.bg} rounded-xl border p-4 flex items-center gap-3 card-hover animate-fade-in-up delay-${i + 1}`}
        >
          <div className={`${s.iconBg} ${s.color} rounded-xl p-2.5`}>
            <s.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold animate-count-up">
              <AnimatedNumber value={s.value} />
            </p>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
