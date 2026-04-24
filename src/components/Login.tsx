import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tv, Lock, Mail, Play, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS = [
  { name: 'Netflix', color: '#E50914' },
  { name: 'Disney+', color: '#1A73E8' },
  { name: 'HBO Max', color: '#991EEB' },
  { name: 'Prime', color: '#00A8E1' },
  { name: 'Star+', color: '#F97316' },
  { name: 'Paramount+', color: '#0064FF' },
  { name: 'Crunchyroll', color: '#F47521' },
  { name: 'Apple TV', color: '#A3AAAE' },
];

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={`${import.meta.env.BASE_URL}login-bg.png`}
          alt="" 
          className="w-full h-full object-cover"
        />
        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-purple-950/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/50" />
      </div>

      {/* Animated floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: `${30 + i * 20}px`,
              height: `${30 + i * 20}px`,
              background: `radial-gradient(circle, ${['#E50914', '#1A73E8', '#991EEB', '#F97316', '#10b981', '#0064FF'][i]} 0%, transparent 70%)`,
              left: `${10 + i * 15}%`,
              top: `${15 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px] px-4">
        {/* Platform ticker */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {PLATFORMS.map((p, i) => (
            <span 
              key={p.name}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm animate-fade-in-up"
              style={{ 
                color: p.color, 
                borderColor: `${p.color}40`, 
                backgroundColor: `${p.color}15`,
                animationDelay: `${i * 0.08}s`
              }}
            >
              {p.name}
            </span>
          ))}
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl shadow-black/40 p-7 sm:p-9 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl blur-xl opacity-50 scale-125" />
              <div className="relative h-16 w-16 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Tv className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="text-center space-y-1.5 mb-7">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent tracking-tight">
              Stream Manager
            </h1>
            <p className="text-sm text-white/50 font-medium">Gestión profesional de suscripciones streaming</p>
          </div>

          {/* Features mini-row */}
          <div className="flex justify-center gap-4 mb-7">
            {[
              { icon: Zap, label: 'Rápido', color: '#F59E0B' },
              { icon: Shield, label: 'Seguro', color: '#10B981' },
              { icon: Play, label: 'Multi-plataforma', color: '#8B5CF6' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 text-white/40 text-[10px]">
                <f.icon className="h-3 w-3" style={{ color: f.color }} />
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-white/30 group-focus-within:text-purple-400 transition-colors" />
              <Input
                type="email"
                placeholder="Correo electrónico"
                className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-purple-400/50 focus:ring-purple-500/20 focus:bg-white/10 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-white/30 group-focus-within:text-purple-400 transition-colors" />
              <Input
                type="password"
                placeholder="Contraseña"
                className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-purple-400/50 focus:ring-purple-500/20 focus:bg-white/10 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full h-12 font-bold text-sm mt-2 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-white border-0" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full" />
                  Verificando...
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="h-4 w-4 fill-current" />
                  Entrar al Sistema
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <p className="text-white/20 text-[11px]">Potenciado por Cloud Auth · Stream Manager SaaS v3.0</p>
        </div>
      </div>
    </div>
  );
}
