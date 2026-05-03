import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus, KeyRound, Mail, LogOut, Users, Trash2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Cliente secundario con persistencia apagada para no cerrar la sesión del admin al crear usuarios
const adminUrl = 'https://etapavapidukcrvduixf.supabase.co';
const adminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YXBhdmFwaWR1a2NydmR1aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjUzMzAsImV4cCI6MjA5MjUwMTMzMH0.Hy4MWILJzM3kMi2aZDbVsex1sGbvMQ0PvnM1JrVMTZw';
const authClient = createClient(adminUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });

interface Vendor {
  id: string;
  email: string;
  auth_user_id: string | null;
  active: boolean;
  created_at: string;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { signOut, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar lista de vendedores al abrir el panel
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
    if (data) setVendors(data);
    if (error) console.error('Error fetching vendors:', error);
    setLoading(false);
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("La contraseña provisional debe tener al menos 6 caracteres.");
    
    setCreating(true);
    const { data, error } = await authClient.auth.signUp({ 
      email, 
      password,
      options: {
        data: { must_change_password: true }
      }
    });
    
    if (error) {
      toast.error('Error al crear vendedor: ' + error.message);
    } else {
      // Registrar en la tabla de vendedores
      await supabase.from('vendors').insert({
        email: email.toLowerCase(),
        auth_user_id: data.user?.id || null,
        active: true
      });

      toast.success('¡Vendedor creado con éxito!');
      setEmail('');
      setPassword('');
      fetchVendors();
    }
    setCreating(false);
  };

  const handleToggleActive = async (vendor: Vendor) => {
    const newStatus = !vendor.active;
    const { error } = await supabase.from('vendors').update({ active: newStatus }).eq('id', vendor.id);
    if (error) return toast.error('Error al actualizar estado');
    
    setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, active: newStatus } : v));
    toast.success(newStatus ? `${vendor.email} activado` : `${vendor.email} desactivado — ya no podrá entrar`);
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!confirm(`¿Eliminar permanentemente a ${vendor.email}? Esta acción no se puede deshacer.`)) return;

    // Borrar sus suscripciones si tiene
    if (vendor.auth_user_id) {
      await supabase.from('subscriptions').delete().eq('vendor_id', vendor.auth_user_id);
    }
    
    // Borrar de la tabla vendors
    const { error } = await supabase.from('vendors').delete().eq('id', vendor.id);
    if (error) return toast.error('Error al eliminar');

    setVendors(prev => prev.filter(v => v.id !== vendor.id));
    toast.success(`${vendor.email} eliminado del sistema`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Súper Administración</h2>
              <p className="text-[10px] sm:text-xs font-mono text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <div className="space-y-6">
          {/* Formulario de crear vendedor */}
          <div className="bg-muted/50 rounded-xl p-5 border border-border/50">
            <h3 className="flex items-center gap-2 font-semibold text-sm mb-4">
              <Plus className="h-4 w-4" /> Registrar Nuevo Vendedor
            </h3>
            <form onSubmit={handleCreateSeller} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Correo del vendedor" className="pl-9" required />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={password} onChange={e => setPassword(e.target.value)} type="text" placeholder="Contraseña provisional (mín 6)" className="pl-9" required />
              </div>
              <Button type="submit" disabled={creating} className="w-full h-10 mt-2 bg-amber-600 hover:bg-amber-700 text-white">
                {creating ? "Creando licencia..." : <><Plus className="h-4 w-4 mr-1.5" /> Crear Cuenta de Vendedor</>}
              </Button>
            </form>
          </div>

          {/* Lista de vendedores */}
          <div className="bg-muted/50 rounded-xl p-5 border border-border/50">
            <h3 className="flex items-center gap-2 font-semibold text-sm mb-4">
              <Users className="h-4 w-4" /> Vendedores Registrados ({vendors.length})
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : vendors.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aún no has creado ningún vendedor</p>
            ) : (
              <div className="space-y-2">
                {vendors.map(vendor => (
                  <div key={vendor.id} className={`flex items-center justify-between gap-2 p-3 rounded-lg border transition-all ${vendor.active ? 'bg-card border-border/50' : 'bg-destructive/5 border-destructive/20 opacity-70'}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${vendor.active ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                        {vendor.active ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{vendor.email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(vendor.created_at)} · {vendor.active ? '🟢 Activo' : '🔴 Suspendido'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className={`h-7 w-7 ${vendor.active ? 'text-amber-500 hover:bg-amber-500/10' : 'text-green-600 hover:bg-green-600/10'}`}
                        onClick={() => handleToggleActive(vendor)}
                        title={vendor.active ? 'Suspender vendedor' : 'Reactivar vendedor'}
                      >
                        {vendor.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteVendor(vendor)}
                        title="Eliminar vendedor permanentemente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button variant="destructive" onClick={signOut} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Cerrar Sesión del Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}
