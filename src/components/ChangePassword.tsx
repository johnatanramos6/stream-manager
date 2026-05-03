import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tv, Lock, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ChangePassword() {
  const { user, clearPasswordFlag } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Las contraseñas no coinciden');
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false }
    });

    if (error) {
      toast.error('Error al cambiar la contraseña: ' + error.message);
    } else {
      toast.success('¡Contraseña actualizada con éxito! Bienvenido a Stream Manager');
      clearPasswordFlag();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0">
        <img 
          src={`${import.meta.env.BASE_URL}login-bg.png`}
          alt="" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-emerald-950/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/50" />
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: `${40 + i * 25}px`,
              height: `${40 + i * 25}px`,
              background: `radial-gradient(circle, ${['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B'][i]} 0%, transparent 70%)`,
              left: `${15 + i * 20}%`,
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${3 + i}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px] px-4">
        {/* Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl shadow-black/40 p-7 sm:p-9 animate-fade-in-up">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl blur-xl opacity-50 scale-125" />
              <div className="relative h-16 w-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <KeyRound className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white via-emerald-200 to-cyan-200 bg-clip-text text-transparent tracking-tight">
              Cambiar Contraseña
            </h1>
            <p className="text-sm text-white/50 font-medium leading-relaxed">
              Es tu primer inicio de sesión.
              <br />
              Por seguridad, crea una contraseña personal.
            </p>
          </div>

          {/* User badge */}
          <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/5 border border-white/10 mx-auto w-fit">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-white/60 font-mono">{user?.email}</span>
          </div>

          {/* Form */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative group">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
              <Input
                type={showNew ? 'text' : 'password'}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                className="pl-10 pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-emerald-400/50 focus:ring-emerald-500/20 focus:bg-white/10 transition-all"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative group">
              <ShieldCheck className="absolute left-3.5 top-3 h-4 w-4 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmar nueva contraseña"
                className="pl-10 pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus:border-emerald-400/50 focus:ring-emerald-500/20 focus:bg-white/10 transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        newPassword.length >= level * 3
                          ? level <= 1 ? 'bg-red-500' : level <= 2 ? 'bg-amber-500' : level <= 3 ? 'bg-emerald-400' : 'bg-emerald-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-white/30">
                  {newPassword.length < 6 ? 'Muy corta' : newPassword.length < 9 ? 'Aceptable' : 'Segura'} · {newPassword.length} caracteres
                </p>
              </div>
            )}

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <p className={`text-xs flex items-center gap-1.5 animate-fade-in ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                {newPassword === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
              </p>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 font-bold text-sm mt-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-400 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-white border-0" 
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full" />
                  Actualizando...
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Guardar Nueva Contraseña
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-white/20 text-[11px]">Stream Manager SaaS · Cambio de contraseña obligatorio</p>
        </div>
      </div>
    </div>
  );
}
