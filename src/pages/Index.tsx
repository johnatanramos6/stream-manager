import { useState, useEffect } from 'react';
import { Subscription, Platform, PaymentStatus, PLATFORMS } from '@/types/subscription';
import SubscriptionForm from '@/components/SubscriptionForm';
import SubscriptionTable from '@/components/SubscriptionTable';
import StatsBar from '@/components/StatsBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Tv } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'streaming-subscriptions';

function loadSubs(): Subscription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSubs(subs: Subscription[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export default function Index() {
  const [subs, setSubs] = useState<Subscription[]>(loadSubs);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { saveSubs(subs); }, [subs]);

  const handleSave = (sub: Subscription) => {
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

  const handleDelete = (id: string) => {
    setSubs(prev => prev.filter(s => s.id !== id));
    toast.success('Suscripción eliminada');
  };

  const handleTogglePayment = (id: string) => {
    setSubs(prev => prev.map(s => {
      if (s.id !== id) return s;
      const cycle: PaymentStatus[] = ['debe', 'cobrar', 'pagado'];
      const next = cycle[(cycle.indexOf(s.paymentStatus) + 1) % cycle.length];
      return { ...s, paymentStatus: next };
    }));
  };

  const filtered = subs.filter(s => {
    if (search && !s.clientName.toLowerCase().includes(search.toLowerCase()) && !s.accountEmail.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlatform !== 'all' && s.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && s.paymentStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-xl p-2">
              <Tv className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">StreamManager</h1>
              <p className="text-xs text-muted-foreground">Control de suscripciones</p>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <StatsBar subscriptions={subs} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente o correo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pagado">✅ Pagado</SelectItem>
              <SelectItem value="debe">⚠️ Debe</SelectItem>
              <SelectItem value="cobrar">🔴 Cobrar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SubscriptionTable
          subscriptions={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTogglePayment={handleTogglePayment}
        />
      </main>

      <SubscriptionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />
    </div>
  );
}
