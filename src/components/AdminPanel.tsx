import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus, KeyRound, Mail, LogOut, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Cliente secundario con persistencia apagada para no cerrar la sesión del admin al crear usuarios
const adminUrl = 'https://etapavapidukcrvduixf.supabase.co';
const adminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YXBhdmFwaWR1a2NydmR1aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjUzMzAsImV4cCI6MjA5MjUwMTMzMH0.Hy4MWILJzM3kMi2aZDbVsex1sGbvMQ0PvnM1JrVMTZw';
const authClient = createClient(adminUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { signOut, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("La contraseña provisional debe tener al menos 6 caracteres.");
    
    setCreating(true);
    const { data, error } = await authClient.auth.signUp({ email, password });
    
    if (error) {
      toast.error('Error al crear vendedor: ' + error.message);
    } else {
      toast.success('¡Vendedor creado con éxito!');
      setEmail('');
      setPassword('');
      // NOTA: Para eliminar usuarios oficialmente en Supabase desde React se requiere una API Key de servidor.
      // Por ahora, le sugerimos al admin inhabilitar a alguien simplemente cambiándole la contraseña desde el panel web de Supabase.
    }
    setCreating(false);
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
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar Panel</Button>
        </div>

        <div className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-5 border border-border/50">
            <h3 className="flex items-center gap-2 font-semibold text-sm mb-4">
              <Users className="h-4 w-4" /> Registrar Nuevo Vendedor
            </h3>
            <form onSubmit={handleCreateSeller} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Correo del vendedor" className="pl-9" required />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={password} onChange={e => setPassword(e.target.value)} type="text" placeholder="Contraseña provisional (mín 6 req)" className="pl-9" required />
              </div>
              <Button type="submit" disabled={creating} className="w-full h-10 mt-2 bg-amber-600 hover:bg-amber-700 text-white">
                {creating ? "Creando licencia..." : <><Plus className="h-4 w-4 mr-1.5" /> Crear Cuenta de Vendedor</>}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              El vendedor podrá iniciar sesión con esta contraseña provisional y cambiarla. Para deshabilitar a un usuario por impago de alquiler, hágalo desde el dashboard oficial de Supabase.com
            </p>
          </div>
          
          <Button variant="destructive" onClick={signOut} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Cerrar Sesión del Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}
