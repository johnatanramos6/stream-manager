import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { StoreSettings, Reseller, StoreCatalogItem } from '@/types/storefront';
import { formatCOP } from '@/types/platformPricing';
import StoreLogin from '@/components/store/StoreLogin';
import StoreCatalog from '@/components/store/StoreCatalog';
import StoreHistory from '@/components/store/StoreHistory';
import StoreOrderResult from '@/components/store/StoreOrderResult';
import StoreCarousel from '@/components/store/StoreCarousel';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { LogOut, User, Wallet, Store as StoreIcon, Loader2, MessageCircle, RefreshCw, Key, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Store() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [catalogItems, setCatalogItems] = useState<StoreCatalogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const [purchaseResult, setPurchaseResult] = useState<{
    order: any;
    credentials: { email?: string; password?: string; pin?: string; profile_name?: string; notes?: string };
  } | null>(null);

  useEffect(() => {
    if (storeSlug) {
      fetchStoreData();
    }
  }, [storeSlug]);

  const fetchStoreData = async () => {
    setLoading(true);
    
    // 1. Fetch store settings (including banners, fully optimized)
    const { data: settings, error: settingsError } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_slug', storeSlug)
      .single();

    if (settingsError || !settings) {
      toast.error('Tienda no encontrada');
      setLoading(false);
      return;
    }

    if (!settings.is_active) {
      toast.error('Esta tienda está temporalmente inactiva');
      setLoading(false);
      return;
    }

    setStoreSettings(settings);

    // 2. Fetch catalog items
    const { data: catalog } = await supabase
      .from('store_catalog')
      .select('*')
      .eq('manager_id', settings.manager_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (catalog) setCatalogItems(catalog);

    // 3. Check for existing session
    const sessionStr = localStorage.getItem(`store_session_${storeSlug}`);
    if (sessionStr) {
      try {
        const sessionReseller = JSON.parse(sessionStr);
        // Verify reseller is still active and update balance
        const { data: currentReseller } = await supabase
          .from('resellers')
          .select('*')
          .eq('id', sessionReseller.id)
          .single();
          
        if (currentReseller && currentReseller.status === 'active') {
          setReseller(currentReseller);
        } else {
          localStorage.removeItem(`store_session_${storeSlug}`);
        }
      } catch (e) {
        localStorage.removeItem(`store_session_${storeSlug}`);
      }
    }

    setLoading(false);
  };

  const handleLogin = (loggedReseller: Reseller) => {
    setReseller(loggedReseller);
    localStorage.setItem(`store_session_${storeSlug}`, JSON.stringify(loggedReseller));
  };

  const handleLogout = () => {
    setReseller(null);
    localStorage.removeItem(`store_session_${storeSlug}`);
  };

  const refreshBalance = async () => {
    if (!reseller) return;
    const { data } = await supabase
      .from('resellers')
      .select('balance')
      .eq('id', reseller.id)
      .single();
      
    if (data) {
      setReseller(prev => prev ? { ...prev, balance: data.balance } : null);
    }
  };

  // Change Password state & handlers
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!reseller || !storeSlug) return;
    
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    
    if (currentPassword !== reseller.password_hash) {
      toast.error('La contraseña actual es incorrecta');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('La nueva contraseña y su confirmación no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setUpdatingPassword(true);
    
    const { error } = await supabase
      .from('resellers')
      .update({ password_hash: newPassword })
      .eq('id', reseller.id);
      
    if (error) {
      toast.error('Error al actualizar la contraseña');
      console.error(error);
    } else {
      toast.success('¡Contraseña actualizada exitosamente!');
      
      // Update local state
      const updatedReseller = { ...reseller, password_hash: newPassword };
      setReseller(updatedReseller);
      
      // Update localStorage session
      localStorage.setItem(`store_session_${storeSlug}`, JSON.stringify(updatedReseller));
      
      // Reset form and close
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangePasswordOpen(false);
    }
    setUpdatingPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!storeSettings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
        <StoreIcon className="h-16 w-16 mb-4 opacity-50" />
        <h1 className="text-2xl font-bold mb-2">Tienda no encontrada</h1>
        <p className="text-gray-400 mb-6 text-center">La tienda que buscas no existe o fue eliminada.</p>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    );
  }

  if (!reseller) {
    return <StoreLogin storeSettings={storeSettings} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300" style={{ 
      backgroundImage: `radial-gradient(circle at top right, ${storeSettings.primary_color}08, transparent 40%), radial-gradient(circle at bottom left, ${storeSettings.secondary_color}08, transparent 40%)`
    }}>
      {/* Announcement Banner */}
      {storeSettings.announcement_text && (
        <div className="w-full bg-zinc-950 text-white py-2.5 px-4 relative overflow-hidden border-b border-primary/20 z-[60] shadow-sm">
          <style>{`
            @keyframes sweep {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(100%); }
              100% { transform: translateX(100%); }
            }
            .sweep-bg {
              animation: sweep 8s infinite ease-in-out;
            }
          `}</style>
          {/* Animated light sweep */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.03)_40%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.03)_60%,rgba(255,255,255,0))] -translate-x-full sweep-bg pointer-events-none" />
          
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-xs md:text-sm">
            <span 
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase select-none shadow-sm text-white border border-white/10 shrink-0"
              style={{
                background: `linear-gradient(135deg, ${storeSettings.primary_color}, ${storeSettings.secondary_color})`
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Aviso
            </span>
            <span className="text-zinc-300 font-semibold tracking-wide drop-shadow-xs text-center">
              {storeSettings.announcement_text}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pt-8 sm:pt-10 flex flex-col">
        {/* Reseller Dashboard Card */}
        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-6 mb-8 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg group">
          {/* Subtle background glow */}
          <div 
            className="absolute -right-20 -top-20 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500 group-hover:scale-110"
            style={{ backgroundColor: storeSettings.primary_color }}
          />
          <div 
            className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-500 group-hover:scale-110"
            style={{ backgroundColor: storeSettings.secondary_color }}
          />
          
          <div className="relative z-10 flex flex-col gap-6">
            {/* Top Row: Store Branding & User Info / Utility Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                {storeSettings.logo_url ? (
                  <img src={storeSettings.logo_url} alt="Logo" className="h-10 md:h-12 w-auto object-contain max-h-[48px] max-w-[200px]" />
                ) : (
                  <div 
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${storeSettings.primary_color}, ${storeSettings.secondary_color})` }}
                  >
                    <StoreIcon className="h-5 w-5 text-white" />
                  </div>
                )}
                <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {storeSettings.store_name}
                </h1>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Distribuidor Autorizado</p>
                  <p className="text-sm font-extrabold text-foreground">Hola, {reseller.name}</p>
                </div>
                <div className="flex items-center gap-1 bg-secondary/60 dark:bg-zinc-800/80 rounded-full p-1 border border-border/30 shadow-xs shrink-0">
                  <ThemeToggle />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleLogout} 
                    className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8 hover:bg-background/80"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Profile details, Balance, and Support Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Col 1: Profile & Credentials */}
              <div className="flex items-center gap-4">
                <div 
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md text-xl font-bold uppercase select-none shrink-0"
                  style={{ background: `linear-gradient(135deg, ${storeSettings.primary_color}, ${storeSettings.secondary_color})` }}
                >
                  {reseller.name.substring(0, 2)}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Usuario</p>
                  <h2 className="text-lg font-extrabold text-foreground truncate max-w-[160px]" title={reseller.name}>
                    {reseller.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Activo</span>
                    </div>
                    <button 
                      onClick={() => {
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setChangePasswordOpen(true);
                      }}
                      className="text-[10px] text-primary hover:text-primary/80 font-bold flex items-center gap-1 hover:underline transition-all"
                    >
                      <Key className="h-3 w-3" />
                      Contraseña
                    </button>
                  </div>
                </div>
              </div>

              {/* Col 2: Balance Info */}
              <div className="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Saldo Disponible</p>
                    <p className="text-xl font-black text-foreground tracking-wide">{formatCOP(Number(reseller.balance))}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={refreshBalance} 
                    className="h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
                    title="Actualizar saldo"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {storeSettings.whatsapp_number && (
                  <a 
                    href={`https://wa.me/${storeSettings.whatsapp_number.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(storeSettings.store_name)},%20solicito%20una%20recarga%20de%20saldo%20para%20el%20distribuidor%20${encodeURIComponent(reseller.name)}.`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Solicitar Recarga
                  </a>
                )}
              </div>

              {/* Col 3: Support Call-to-Action */}
              <div className="flex justify-center md:justify-end">
                {storeSettings.whatsapp_number && (
                  <a 
                    href={`https://wa.me/${storeSettings.whatsapp_number.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(storeSettings.store_name)},%20soy%20el%20distribuidor%20${encodeURIComponent(reseller.name)}%20y%20necesito%20soporte.`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-md shadow-[#25D366]/20 hover:shadow-lg hover:shadow-[#25D366]/30 active:scale-95"
                  >
                    <MessageCircle className="h-5 w-5 fill-current" />
                    Soporte WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Banners Carousel */}
        {storeSettings.banners && storeSettings.banners.length > 0 && (
          <StoreCarousel
            banners={storeSettings.banners}
            primaryColor={storeSettings.primary_color}
            secondaryColor={storeSettings.secondary_color}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'catalog' 
                ? 'border-primary text-foreground font-semibold' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Catálogo de Productos
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'history' 
                ? 'border-primary text-foreground font-semibold' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mis Compras
          </button>
        </div>

        <div className="flex-1">
          {activeTab === 'catalog' ? (
            <StoreCatalog 
              catalogItems={catalogItems} 
              reseller={reseller} 
              managerId={storeSettings.manager_id}
              onPurchaseComplete={(result) => {
                refreshBalance();
                setPurchaseResult(result);
              }}
            />
          ) : (
            <StoreHistory 
              reseller={reseller} 
              managerId={storeSettings.manager_id} 
            />
          )}
        </div>
      </main>

      {purchaseResult && (
        <StoreOrderResult
          order={purchaseResult.order}
          credentials={purchaseResult.credentials}
          onClose={() => setPurchaseResult(null)}
        />
      )}

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={(open) => !open && !updatingPassword && setChangePasswordOpen(false)}>
        <DialogContent className="max-w-sm backdrop-blur-xl bg-background/95 dark:bg-zinc-900/95 border-border dark:border-white/10 text-foreground dark:text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground dark:text-white">
              <Lock className="h-5 w-5 text-primary" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Actualiza tu contraseña de acceso para mayor seguridad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Contraseña Actual</Label>
              <div className="relative mt-1">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Introduce tu contraseña actual"
                  className="pr-10"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground" 
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Nueva Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Confirmar Nueva Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Repite la nueva contraseña"
                  className="pr-10"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="ghost"
              onClick={() => setChangePasswordOpen(false)}
              disabled={updatingPassword}
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={updatingPassword}
              className="rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-all duration-200"
            >
              {updatingPassword ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
