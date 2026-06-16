// ═══════════════════════════════════════════════════════════
// StoreCatalog – Catálogo de productos de la tienda
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShoppingCart, Monitor, Tv, Sparkles, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCOP } from '@/types/platformPricing';
import { executePurchase } from '@/lib/storefront-engine';
import type { StoreCatalogItem, Reseller, StoreOrder } from '@/types/storefront';
import PlatformLogo from './PlatformLogo';

export function getCardBackgroundImage(platform: string): string | null {
  const name = platform.toLowerCase().trim();
  const base = import.meta.env.BASE_URL || '/';
  const cacheBuster = '?v=1.0.7';
  
  if (name.includes('netflix')) {
    return `${base}netflix-bg.png${cacheBuster}`;
  }
  if (name.includes('disney') || name.includes('star')) {
    return `${base}disney-bg.png${cacheBuster}`;
  }
  if (name.includes('amazon') || name.includes('prime')) {
    return `${base}prime-bg.png${cacheBuster}`;
  }
  if (name.includes('iptv')) {
    return `${base}iptv-bg.jpg${cacheBuster}`;
  }
  if (name.includes('chatgpt') || name.includes('openai') || name.includes('gpt')) {
    return `${base}chatgpt-bg.jpg${cacheBuster}`;
  }
  if (name.includes('capcut')) {
    return `${base}capcut-bg.jpg${cacheBuster}`;
  }
  if (name.includes('youtube')) {
    return `${base}youtube-bg.jpg${cacheBuster}`;
  }
  if (name.includes('crunchyroll') || name.includes('crunchy')) {
    return `${base}crunchyroll-bg.png${cacheBuster}`;
  }
  if (name.includes('plex')) {
    return `${base}plex-bg.png${cacheBuster}`;
  }
  if (name.includes('gemini') || name.includes('google')) {
    return `${base}gemini-bg.jpg${cacheBuster}`;
  }
  if (name.includes('max') || name.includes('hbo')) {
    return `${base}hbomax-bg.png${cacheBuster}`;
  }
  if (name.includes('spotify')) {
    return `${base}spotify-bg.png${cacheBuster}`;
  }
  if (name.includes('paramount')) {
    return `${base}paramount-bg.jpg${cacheBuster}`;
  }
  if (name.includes('flujo')) {
    return `${base}flujo-bg.jpg${cacheBuster}`;
  }
  if (name.includes('claro')) {
    return 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600&auto=format&fit=crop';
  }
  return null;
}

interface StoreCatalogProps {
  catalogItems: StoreCatalogItem[];
  reseller: Reseller;
  managerId: string;
  onPurchaseComplete: (result: {
    order: StoreOrder;
    credentials: { 
      email: string; 
      password: string; 
      pin: string; 
      profile_name: string; 
      notes?: string;
      purchase_date?: string;
      duration_days?: number;
    };
  }) => void;
}

export default function StoreCatalog({
  catalogItems,
  reseller,
  managerId,
  onPurchaseComplete,
}: StoreCatalogProps) {
  const [confirmItem, setConfirmItem] = useState<StoreCatalogItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'todo' | 'streaming' | 'tv' | 'creative' | 'full' | 'profile'>('todo');

  const handlePurchase = async () => {
    if (!confirmItem) return;

    setPurchasing(true);
    try {
      const result = await executePurchase(
        reseller.id,
        managerId,
        confirmItem,
        reseller.name
      );

      if (!result.success) {
        toast.error(result.error || 'Error en la compra');
        return;
      }

      if (result.order && result.credentials) {
        toast.success('¡Compra exitosa!');
        onPurchaseComplete({
          order: result.order,
          credentials: {
            email: result.credentials.email,
            password: result.credentials.password,
            pin: result.credentials.pin,
            profile_name: result.credentials.profile_name,
            notes: result.credentials.notes,
            purchase_date: (result.credentials as any).purchase_date,
            duration_days: (result.credentials as any).duration_days,
          },
        });
      }
    } catch {
      toast.error('Error inesperado al procesar la compra');
    } finally {
      setPurchasing(false);
      setConfirmItem(null);
    }
  };

  const filteredItems = catalogItems.filter(item => {
    // 1. Filtrar por categoría
    const platformLower = item.platform.toLowerCase();
    const type = item.type;
    
    if (activeCategory === 'streaming') {
      const streamingPlatforms = ['netflix', 'amazon', 'prime', 'disney', 'star', 'hbo', 'max', 'paramount', 'crunchyroll', 'spotify', 'apple', 'vix'];
      if (!streamingPlatforms.some(p => platformLower.includes(p))) return false;
    } else if (activeCategory === 'tv') {
      const tvPlatforms = ['iptv', 'smarters', 'mega'];
      if (!tvPlatforms.some(p => platformLower.includes(p))) return false;
    } else if (activeCategory === 'creative') {
      const creativePlatforms = ['chatgpt', 'openai', 'gpt', 'canva', 'capcut', 'microsoft', 'office', '365', 'gemini', 'google'];
      if (!creativePlatforms.some(p => platformLower.includes(p))) return false;
    } else if (activeCategory === 'full') {
      if (type !== 'full_account') return false;
    } else if (activeCategory === 'profile') {
      if (type !== 'profile') return false;
    }

    // 2. Filtrar por texto de búsqueda
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const displayNameLower = item.display_name.toLowerCase();
      const platformNameLower = item.platform.toLowerCase();
      return displayNameLower.includes(query) || platformNameLower.includes(query);
    }

    return true;
  });

  if (catalogItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 shadow-inner">
          <Tv className="w-10 h-10 text-muted-foreground/35" />
        </div>
        <h3 className="text-lg font-semibold text-foreground/80 mb-1">
          Sin productos disponibles
        </h3>
        <p className="text-sm text-muted-foreground">
          No hay productos en el catálogo por el momento
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search and Category Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-stretch md:items-center justify-between">
        {/* Categories (horizontal scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
          {[
            { id: 'todo', label: 'Todo' },
            { id: 'streaming', label: '🎬 Streaming' },
            { id: 'tv', label: '📺 IPTV / TV' },
            { id: 'creative', label: '⚙️ Utilidades' },
            { id: 'full', label: '🔑 Cuentas' },
            { id: 'profile', label: '👤 Perfiles' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-full border shrink-0 transition-all duration-200 select-none ${
                activeCategory === cat.id
                  ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                  : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/35 hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-full md:max-w-xs shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Buscar plataforma o cuenta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/45 transition-all duration-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-bold text-foreground">Catálogo</h2>
        <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-0 font-medium">
          {filteredItems.length} de {catalogItems.length} productos
        </Badge>
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in bg-card/40 border border-dashed border-border rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3 shadow-inner">
            <Search className="w-6 h-6 text-muted-foreground/45" />
          </div>
          <h3 className="text-base font-semibold text-foreground/80 mb-1">
            No se encontraron resultados
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Prueba ajustando los filtros de categoría o usando otros términos de búsqueda.
          </p>
          {(searchQuery || activeCategory !== 'todo') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('todo');
              }}
              className="mt-4 text-xs rounded-xl"
            >
              Restablecer filtros
            </Button>
          )}
        </div>
      ) : (
        /* Product grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="group relative animate-in fade-in-0 slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
            >
              {/* Card glow on hover */}
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500 blur-sm" />

              <div className="relative backdrop-blur-xl bg-card border border-border rounded-2xl p-5 hover:bg-card/90 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 overflow-hidden">
                {/* Card Background Image with Gradient Overlay */}
                {getCardBackgroundImage(item.platform) && (
                  <>
                    <img 
                      src={getCardBackgroundImage(item.platform)!} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover opacity-75 dark:opacity-50 group-hover:opacity-85 dark:group-hover:opacity-65 transition-opacity duration-500 pointer-events-none z-0" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/45 to-transparent dark:from-zinc-950/90 dark:via-zinc-950/45 dark:to-transparent pointer-events-none z-0" />
                  </>
                )}

                <div className="relative z-10 flex flex-col justify-between h-full">
                  {/* Platform icon + badge */}
                  <div className="flex items-start justify-between mb-4">
                    <PlatformLogo platform={item.platform} emojiFallback={item.icon_emoji} size="md" />
                    <Badge
                      className={`text-[10px] uppercase tracking-wider border-0 font-semibold ${
                        item.type === 'full_account'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-300'
                      }`}
                    >
                      {item.type === 'full_account' ? (
                        <><Tv className="w-3 h-3 mr-1" /> Cuenta</>
                      ) : (
                        <><Monitor className="w-3 h-3 mr-1" /> Perfil</>
                      )}
                    </Badge>
                  </div>

                  {/* Name & platform */}
                  <h3 className="text-foreground font-bold text-base mb-0.5 line-clamp-1">
                    {item.display_name}
                  </h3>
                  <p className="text-zinc-950 dark:text-zinc-200 text-xs mb-1 font-extrabold tracking-wide uppercase opacity-90">
                    {item.platform}
                  </p>

                  {/* Duration */}
                  <p className="text-zinc-900 dark:text-zinc-100 text-xs mb-4 font-bold">
                    ⏱ {item.duration_label}
                  </p>

                  {/* Price + Buy */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-zinc-950/75 dark:text-zinc-300/80 font-extrabold uppercase tracking-wider mb-0.5">
                        Precio
                      </p>
                      <p className="text-xl font-extrabold text-foreground tracking-tight">
                        {formatCOP(item.selling_price)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setConfirmItem(item)}
                      className="rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 border-0"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Comprar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Confirmation Dialog */}
      <Dialog open={!!confirmItem} onOpenChange={(open) => !open && !purchasing && setConfirmItem(null)}>
        <DialogContent className="backdrop-blur-xl bg-background/95 dark:bg-zinc-900/95 border-border dark:border-white/10 text-foreground dark:text-white max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl animate-in fade-in-0 duration-300 scrollbar-thin">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-foreground dark:text-white text-xl font-black flex items-center gap-2">
              <span>🛒</span> Confirmar Pedido
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-white/50 text-xs">
              Por favor revisa la información de la cuenta y los términos de uso antes de comprar.
            </DialogDescription>
          </DialogHeader>

          {confirmItem && (
            <div className="space-y-5 py-2">
              {/* Product Header Card */}
              <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 p-4 bg-secondary/30 dark:bg-white/5 flex items-center gap-4">
                {getCardBackgroundImage(confirmItem.platform) && (
                  <>
                    <img 
                      src={getCardBackgroundImage(confirmItem.platform)!} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/40 to-transparent pointer-events-none" />
                  </>
                )}
                <div className="relative z-10">
                  <PlatformLogo platform={confirmItem.platform} emojiFallback={confirmItem.icon_emoji} size="md" />
                </div>
                <div className="flex-1 min-w-0 relative z-10 space-y-0.5">
                  <p className="font-extrabold text-foreground dark:text-white text-base truncate">{confirmItem.display_name}</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {confirmItem.type === 'profile' ? '👤 1 Pantalla / Perfil' : '🔑 Cuenta Completa'}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      ⏱ {confirmItem.duration_label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rules and Usage Guidelines (Trust builder) */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-muted-foreground dark:text-white/60 uppercase tracking-wider">
                  ⚠️ Reglas de Uso Obligatorias
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                    <span className="text-sm shrink-0">🚫</span>
                    <div>
                      <p className="font-bold">No modificar credenciales</p>
                      <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">Está estrictamente prohibido cambiar la contraseña o correos de la cuenta. Hacerlo invalida la garantía.</p>
                    </div>
                  </div>
                  
                  {confirmItem.type === 'profile' ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs">
                      <span className="text-sm shrink-0">📱</span>
                      <div>
                        <p className="font-bold">Uso en dispositivo único</p>
                        <p className="text-[10px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">Este perfil solo se permite en 1 dispositivo a la vez. No compartir el PIN ni crear perfiles adicionales.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs">
                      <span className="text-sm shrink-0">🔒</span>
                      <div>
                        <p className="font-bold">Cuenta Privada Completa</p>
                        <p className="text-[10px] text-purple-800/80 dark:text-purple-300/80 mt-0.5">Tienes el control total de los perfiles. No debes revender más perfiles de los soportados por la plataforma.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Indicators / Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-secondary/35 dark:bg-white/5 border border-border/50 dark:border-white/5">
                  <span className="text-lg mb-1">🛡️</span>
                  <p className="text-[10px] font-bold text-foreground dark:text-white">Garantía Activa</p>
                  <p className="text-[9px] text-muted-foreground dark:text-white/45">Soporte 100%</p>
                </div>
                <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-secondary/35 dark:bg-white/5 border border-border/50 dark:border-white/5">
                  <span className="text-lg mb-1">⚡</span>
                  <p className="text-[10px] font-bold text-foreground dark:text-white">Entrega Auto</p>
                  <p className="text-[9px] text-muted-foreground dark:text-white/45">Instantánea</p>
                </div>
                <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-secondary/35 dark:bg-white/5 border border-border/50 dark:border-white/5">
                  <span className="text-lg mb-1">⭐</span>
                  <p className="text-[10px] font-bold text-foreground dark:text-white">Calidad Premium</p>
                  <p className="text-[9px] text-muted-foreground dark:text-white/45">Servicio VIP</p>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground dark:text-white/60 uppercase tracking-wider">
                  Detalles Financieros
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col justify-between p-3 rounded-xl bg-secondary/40 dark:bg-white/5 border border-border/40">
                    <span className="text-muted-foreground dark:text-white/50 text-[10px] uppercase font-bold tracking-wider mb-0.5 font-semibold">Tu Saldo</span>
                    <span className={`text-base font-extrabold ${
                      reseller.balance >= confirmItem.selling_price ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {formatCOP(reseller.balance)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-between p-3 rounded-xl bg-secondary/40 dark:bg-white/5 border border-border/40">
                    <span className="text-muted-foreground dark:text-white/50 text-[10px] uppercase font-bold tracking-wider mb-0.5 font-semibold">Precio Venta</span>
                    <span className="text-base font-extrabold text-foreground dark:text-white">
                      {formatCOP(confirmItem.selling_price)}
                    </span>
                  </div>
                </div>
              </div>

              {reseller.balance < confirmItem.selling_price && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                  <span>❌</span>
                  <span>Saldo insuficiente. Te faltan {formatCOP(confirmItem.selling_price - reseller.balance)} para completar esta compra.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border dark:border-white/10 mt-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmItem(null)}
              disabled={purchasing}
              className="text-muted-foreground dark:text-white/60 hover:text-foreground hover:bg-secondary dark:hover:text-white dark:hover:bg-white/10 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={purchasing || (!!confirmItem && reseller.balance < confirmItem.selling_price)}
              className="rounded-xl font-extrabold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Procesando compra…
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Confirmar y Comprar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
