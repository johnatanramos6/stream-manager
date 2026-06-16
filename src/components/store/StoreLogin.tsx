// ═══════════════════════════════════════════════════════════
// StoreLogin – Formulario de acceso al portal de ventas
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Mail, Lock, Store } from 'lucide-react';
import { toast } from 'sonner';
import type { StoreSettings, Reseller } from '@/types/storefront';
import ThemeToggle from '@/components/ThemeToggle';

interface StoreLoginProps {
  storeSettings: StoreSettings;
  onLogin: (reseller: Reseller) => void;
}

export default function StoreLogin({ storeSettings, onLogin }: StoreLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      // Force loading and playing
      videoRef.current.load();
      videoRef.current.play().catch(err => {
        console.warn("Autoplay blocked or failed, retrying on interaction:", err);
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Ingresa tu email y contraseña');
      return;
    }

    setLoading(true);
    try {
      // Secure login via database function (RPC) to prevent exposing all reseller password hashes via direct SELECT
      const { data, error } = await supabase.rpc('secure_reseller_login', {
        p_manager_id: storeSettings.manager_id,
        p_email: email.trim().toLowerCase(),
        p_password: password
      });

      const loggedUser = data && data[0];

      if (error || !loggedUser) {
        toast.error('Credenciales incorrectas o cuenta inactiva');
        return;
      }

      toast.success(`¡Bienvenido, ${loggedUser.name}!`);
      onLogin(loggedUser as Reseller);
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const primary = storeSettings.primary_color || '#8b5cf6';
  const secondary = storeSettings.secondary_color || '#06b6d4';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background dark:bg-black text-foreground dark:text-white transition-colors duration-300">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          poster="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80"
          className="w-full h-full object-cover scale-[1.01] opacity-30 dark:opacity-100 transition-opacity duration-300"
        >
          <source src={`${import.meta.env.BASE_URL}login-bg-video.mp4`} type="video/mp4" />
        </video>
      </div>

      {/* Floating Movie Particles / Cinematic Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10 dark:opacity-20 transition-opacity duration-300">
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] top-1/4 left-1/4 animate-pulse" style={{ background: primary, animationDuration: '8s' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] bottom-1/4 right-1/4 animate-pulse" style={{ background: secondary, animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md z-10 animate-in fade-in-0 zoom-in-95 duration-700">
        {/* Animated Glow Border */}
        <div
          className="absolute -inset-0.5 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"
          style={{ 
            background: `linear-gradient(135deg, ${primary}, ${secondary}, ${primary})`,
            animationDuration: '4s'
          }}
        />

        <div className="relative backdrop-blur-md bg-card/60 dark:bg-zinc-950/45 border border-border dark:border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/10 dark:shadow-black/90">
          {/* Store branding */}
          <div className="text-center mb-8">
            {storeSettings.logo_url ? (
              <div className="relative inline-block">
                <div className="absolute -inset-1 rounded-xl blur-sm opacity-50 animate-pulse" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
                <img
                  src={storeSettings.logo_url}
                  alt={storeSettings.store_name}
                  className="relative w-16 h-16 mx-auto mb-4 rounded-xl object-cover border border-white/10 shadow-lg"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center shadow-lg relative"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
              >
                <div className="absolute inset-0.5 rounded-[10px] bg-zinc-950 flex items-center justify-center">
                  <Store className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground to-foreground/70 dark:from-white dark:via-white dark:to-white/70 tracking-tight mb-1 uppercase">
              {storeSettings.store_name}
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white/50 font-medium">
              {storeSettings.welcome_message || 'Accede a tu portal de ventas'}
            </p>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border dark:bg-white/10" />
            <span className="text-[10px] text-muted-foreground dark:text-white/40 font-bold uppercase tracking-widest">Iniciar sesión</span>
            <div className="flex-1 h-px bg-border dark:bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground dark:text-white/70 text-xs font-bold uppercase tracking-wider">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 dark:text-white/30" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 dark:bg-black/40 border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground/45 dark:placeholder:text-white/20 focus:border-primary/50 dark:focus:border-white/20 focus:bg-background/80 dark:focus:bg-black/60 transition-all duration-300 rounded-xl h-11"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground dark:text-white/70 text-xs font-bold uppercase tracking-wider">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 dark:text-white/30" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background/50 dark:bg-black/40 border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground/45 dark:placeholder:text-white/20 focus:border-primary/50 dark:focus:border-white/20 focus:bg-background/80 dark:focus:bg-black/60 transition-all duration-300 rounded-xl h-11"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-white font-bold text-sm rounded-xl shadow-lg shadow-black/50 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 uppercase tracking-wider mt-2"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Ingresando…
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Ingresar
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-[10px] text-muted-foreground/55 dark:text-white/30 uppercase tracking-widest font-bold mt-6">
            Contacta a tu administrador si no tienes acceso
          </p>
        </div>
      </div>
    </div>

  );
}
