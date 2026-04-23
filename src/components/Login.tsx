import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tv, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Correo o contraseña incorrectos');
    } else {
      // Verificar si es admin (admin no necesita estar en vendors)
      const isAdmin = data.user?.email?.toLowerCase() === 'johnatanramos6@gmail.com';
      if (!isAdmin) {
        // Verificar si el vendedor existe y está activo
        const { data: vendorData, error: vendorError } = await supabase.from('vendors').select('active').eq('email', data.user?.email?.toLowerCase()).single();
        
        if (!vendorData || vendorError || !vendorData.active) {
          await supabase.auth.signOut();
          toast.error(!vendorData || vendorError ? 'Tu cuenta ha sido eliminada. Contacta al administrador.' : 'Tu cuenta ha sido suspendida. Contacta al administrador.');
          setLoading(false);
          return;
        }
      }
      toast.success('¡Bienvenido a Stream Manager!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Tv className="h-8 w-8" />
          </div>
        </div>
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Stream Manager
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Panel de control seguro</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Correo electrónico"
                className="pl-9 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Contraseña"
                className="pl-9 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full h-11 font-semibold text-md mt-4" disabled={loading}>
            {loading ? <div className="h-5 w-5 animate-spin border-2 border-white/20 border-t-white rounded-full" /> : 'Entrar al Sistema'}
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-muted-foreground border-t pt-6">
          <p>Potenciado por Cloud Auth</p>
          <p className="mt-1">Stream Manager SaaS v2.0</p>
        </div>
      </div>
    </div>
  );
}
