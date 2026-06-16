import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StoreSettings, StoreCatalogItem, Reseller, generateStoreSlug, getPlatformEmoji, StoreBanner } from '@/types/storefront';
import { formatCOP, PlatformPricing } from '@/types/platformPricing';
import { rechargeBalance } from '@/lib/storefront-engine';
import PlatformLogo from './store/PlatformLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Store, Settings, ShoppingBag, Users, Plus, Pencil, Trash2, Save,
  Copy, Check, ExternalLink, Palette, DollarSign, Eye, EyeOff,
  UserPlus, Wallet, Ban, CheckCircle, Link, RefreshCw, Package,
  MessageCircle
} from 'lucide-react';

interface Props {
  dynamicPlatforms: string[];
  pricingConfig: PlatformPricing[];
}

type AdminTab = 'settings' | 'catalog' | 'resellers';

export default function StorefrontAdmin({ dynamicPlatforms, pricingConfig }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('settings');
  
  // Store Settings
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<{
    store_name: string;
    store_slug: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    welcome_message: string;
    is_active: boolean;
    whatsapp_number: string;
    announcement_text: string;
    banners: StoreBanner[];
  }>({
    store_name: 'Mi Tienda',
    store_slug: 'mi-tienda',
    logo_url: '',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    welcome_message: '¡Bienvenido a nuestra tienda de streaming!',
    is_active: true,
    whatsapp_number: '',
    announcement_text: '',
    banners: [],
  });
  const [slugCopied, setSlugCopied] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // States for new banner form
  const [newBanner, setNewBanner] = useState<{
    type: 'image' | 'video';
    fileBase64: string;
    url: string;
    title: string;
    description: string;
    link: string;
  }>({
    type: 'image',
    fileBase64: '',
    url: '',
    title: '',
    description: '',
    link: '',
  });
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Elige uno menor a 10MB.');
      return;
    }

    setUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (newBanner.type === 'image') {
        // Compress image banner to keep payload light
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1200; // max width for storefront banners

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75); // compress to 75% quality JPEG
            setNewBanner(prev => ({ ...prev, fileBase64: compressedBase64, url: '' }));
            toast.success('¡Imagen de banner cargada y optimizada!');
          } else {
            setNewBanner(prev => ({ ...prev, fileBase64: event.target?.result as string, url: '' }));
            toast.success('¡Archivo cargado exitosamente!');
          }
          setUploadingBanner(false);
        };
        img.onerror = () => {
          toast.error('Error al procesar la imagen.');
          setUploadingBanner(false);
        };
        img.src = event.target?.result as string;
      } else {
        // Video banner, save as-is
        setNewBanner(prev => ({ ...prev, fileBase64: event.target?.result as string, url: '' }));
        toast.success('¡Video de banner cargado exitosamente!');
        setUploadingBanner(false);
      }
    };
    reader.onerror = () => {
      toast.error('Error al leer el archivo.');
      setUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddBanner = () => {
    const bannerUrl = newBanner.fileBase64 || newBanner.url;
    if (!bannerUrl.trim()) {
      toast.error('Debes subir un archivo o ingresar una URL');
      return;
    }

    const banner: StoreBanner = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      type: newBanner.type,
      url: bannerUrl,
      title: newBanner.title.trim() || undefined,
      description: newBanner.description.trim() || undefined,
      link: newBanner.link.trim() || undefined,
      sort_order: settingsForm.banners.length,
    };

    setSettingsForm(prev => ({
      ...prev,
      banners: [...(prev.banners || []), banner],
    }));

    // Reset banner form
    setNewBanner({
      type: 'image',
      fileBase64: '',
      url: '',
      title: '',
      description: '',
      link: '',
    });
    
    // Reset file input element
    const fileInput = document.getElementById('banner-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    toast.success('Banner agregado al carrusel (recuerda guardar los cambios de la tienda)');
  };

  const handleRemoveBanner = (id: string) => {
    setSettingsForm(prev => ({
      ...prev,
      banners: (prev.banners || []).filter(b => b.id !== id).map((b, idx) => ({ ...b, sort_order: idx })),
    }));
    toast.info('Banner removido (recuerda guardar los cambios de la tienda)');
  };

  // Catalog
  const [catalogItems, setCatalogItems] = useState<StoreCatalogItem[]>([]);
  const [catalogFormOpen, setCatalogFormOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<StoreCatalogItem | null>(null);
  const [deleteCatalogId, setDeleteCatalogId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState({
    platform: dynamicPlatforms[0] || 'Netflix',
    display_name: '',
    type: 'profile' as 'profile' | 'full_account',
    selling_price: 0,
    duration_label: '1 Mes',
    icon_emoji: '📺',
    is_active: true,
    sort_order: 0,
  });

  // Resellers
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [resellerFormOpen, setResellerFormOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [deleteResellerId, setDeleteResellerId] = useState<string | null>(null);
  const [resellerForm, setResellerForm] = useState({ name: '', email: '', password: '', whatsapp_number: '' });
  const [rechargeOpen, setRechargeOpen] = useState<Reseller | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeDesc, setRechargeDesc] = useState('Recarga manual');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // ─── Fetch data ───
  useEffect(() => {
    if (!user) return;
    fetchStoreSettings();
    fetchCatalog();
    fetchResellers();
  }, [user]);

  const fetchStoreSettings = async () => {
    const { data } = await supabase
      .from('store_settings')
      .select('*')
      .eq('manager_id', user!.id)
      .single();
    if (data) {
      setStoreSettings(data);
      setSettingsForm({
        store_name: data.store_name,
        store_slug: data.store_slug,
        logo_url: data.logo_url || '',
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        welcome_message: data.welcome_message,
        is_active: data.is_active,
        whatsapp_number: data.whatsapp_number || '',
        announcement_text: data.announcement_text || '',
        banners: data.banners || [],
      });
    }
  };

  const fetchCatalog = async () => {
    const { data } = await supabase
      .from('store_catalog')
      .select('*')
      .eq('manager_id', user!.id)
      .order('sort_order', { ascending: true });
    if (data) setCatalogItems(data);
  };

  const fetchResellers = async () => {
    const { data } = await supabase
      .from('resellers')
      .select('*')
      .eq('manager_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setResellers(data);
  };

  // ─── Store Settings handlers ───
  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);

    const payload = {
      manager_id: user.id,
      store_name: settingsForm.store_name,
      store_slug: settingsForm.store_slug,
      logo_url: settingsForm.logo_url || null,
      primary_color: settingsForm.primary_color,
      secondary_color: settingsForm.secondary_color,
      welcome_message: settingsForm.welcome_message,
      is_active: settingsForm.is_active,
      whatsapp_number: settingsForm.whatsapp_number || null,
      announcement_text: settingsForm.announcement_text || null,
      banners: settingsForm.banners || [],
      updated_at: new Date().toISOString(),
    };

    if (storeSettings) {
      const { error } = await supabase
        .from('store_settings')
        .update(payload)
        .eq('id', storeSettings.id);
      if (error) {
        toast.error('Error al actualizar la tienda');
        console.error(error);
      } else {
        toast.success('¡Tienda actualizada!');
        fetchStoreSettings();
      }
    } else {
      const { error } = await supabase
        .from('store_settings')
        .insert(payload);
      if (error) {
        if (error.code === '23505') {
          toast.error('Ese slug ya está en uso. Elige otro nombre.');
        } else {
          toast.error('Error al crear la tienda');
          console.error(error);
        }
      } else {
        toast.success('¡Tienda creada exitosamente!');
        fetchStoreSettings();
      }
    }
    setSavingSettings(false);
  };

  const copyStoreLink = () => {
    const link = `${window.location.origin}${import.meta.env.BASE_URL}store/${settingsForm.store_slug}`;
    navigator.clipboard.writeText(link);
    setSlugCopied(true);
    toast.success('Link copiado al portapapeles');
    setTimeout(() => setSlugCopied(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande. Elige una menor a 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 400; // max 400px wide/high for logo

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setSettingsForm(prev => ({ ...prev, logo_url: compressedBase64 }));
          toast.success('¡Logo cargado exitosamente!');
        } else {
          setSettingsForm(prev => ({ ...prev, logo_url: event.target?.result as string }));
          toast.success('¡Logo cargado!');
        }
      };
      img.onerror = () => {
        toast.error('Error al procesar la imagen.');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      toast.error('Error al leer el archivo.');
    };
    reader.readAsDataURL(file);
  };

  // ─── Catalog handlers ───
  const handleSaveCatalogItem = async () => {
    if (!user) return;
    if (!catalogForm.display_name.trim()) {
      toast.error('El nombre del producto es requerido');
      return;
    }
    if (catalogForm.selling_price <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }

    const payload = {
      manager_id: user.id,
      platform: catalogForm.platform,
      display_name: catalogForm.display_name,
      type: catalogForm.type,
      selling_price: catalogForm.selling_price,
      duration_label: catalogForm.duration_label,
      icon_emoji: catalogForm.icon_emoji || getPlatformEmoji(catalogForm.platform),
      is_active: catalogForm.is_active,
      sort_order: catalogForm.sort_order,
    };

    if (editingCatalog) {
      const { error } = await supabase
        .from('store_catalog')
        .update(payload)
        .eq('id', editingCatalog.id);
      if (error) toast.error('Error al actualizar producto');
      else toast.success('Producto actualizado');
    } else {
      const { error } = await supabase
        .from('store_catalog')
        .insert(payload);
      if (error) toast.error('Error al crear producto');
      else toast.success('¡Producto agregado al catálogo!');
    }

    setCatalogFormOpen(false);
    setEditingCatalog(null);
    setCatalogForm({
      platform: dynamicPlatforms[0] || 'Netflix',
      display_name: '',
      type: 'profile',
      selling_price: 0,
      duration_label: '1 Mes',
      icon_emoji: '📺',
      is_active: true,
      sort_order: 0,
    });
    fetchCatalog();
  };

  const handleEditCatalog = (item: StoreCatalogItem) => {
    setEditingCatalog(item);
    setCatalogForm({
      platform: item.platform,
      display_name: item.display_name,
      type: item.type,
      selling_price: item.selling_price,
      duration_label: item.duration_label,
      icon_emoji: item.icon_emoji,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setCatalogFormOpen(true);
  };

  const handleDeleteCatalog = async () => {
    if (!deleteCatalogId) return;
    await supabase.from('store_catalog').delete().eq('id', deleteCatalogId);
    toast.success('Producto eliminado');
    setDeleteCatalogId(null);
    fetchCatalog();
  };

  const [syncingFinance, setSyncingFinance] = useState(false);

  const handleSyncFromFinance = async () => {
    if (!user || !pricingConfig || pricingConfig.length === 0) {
      toast.error('No hay configuración de precios en Finanzas para importar');
      return;
    }

    setSyncingFinance(true);
    try {
      let createdCount = 0;
      let updatedCount = 0;

      for (const p of pricingConfig) {
        if (p.platform === 'Otro') continue; // omitir plataforma 'Otro'

        // Buscar si ya existe en el catálogo actual
        const existing = catalogItems.find(item => item.platform.toLowerCase() === p.platform.toLowerCase());

        if (existing) {
          // Si existe, y el precio es diferente, actualizarlo
          if (existing.selling_price !== p.salePrice) {
            const { error } = await supabase
              .from('store_catalog')
              .update({ selling_price: p.salePrice })
              .eq('id', existing.id);
            if (!error) updatedCount++;
          }
        } else {
          // Si no existe, crear un nuevo item de catálogo
          const type = p.costType === 'per_account' ? 'full_account' : 'profile';
          const { error } = await supabase
            .from('store_catalog')
            .insert({
              manager_id: user.id,
              platform: p.platform,
              display_name: `${p.platform} - ${type === 'full_account' ? 'Cuenta Completa' : '1 Pantalla'}`,
              type: type,
              selling_price: p.salePrice,
              duration_label: '1 Mes',
              icon_emoji: getPlatformEmoji(p.platform),
              is_active: true,
              sort_order: catalogItems.length + createdCount,
            });
          if (!error) createdCount++;
        }
      }

      if (createdCount > 0 || updatedCount > 0) {
        toast.success(`Sincronización completa: ${createdCount} productos agregados, ${updatedCount} precios actualizados.`);
        fetchCatalog();
      } else {
        toast.info('El catálogo ya está completamente sincronizado con los precios de Finanzas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Ocurrió un error al sincronizar con Finanzas');
    } finally {
      setSyncingFinance(false);
    }
  };

  // ─── Reseller handlers ───
  const handleSaveReseller = async () => {
    if (!user) return;
    if (!resellerForm.name.trim() || !resellerForm.email.trim()) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    if (editingReseller) {
      const updatePayload: any = {
        name: resellerForm.name,
        email: resellerForm.email,
        whatsapp_number: resellerForm.whatsapp_number || null,
      };
      if (resellerForm.password.trim()) {
        updatePayload.password_hash = resellerForm.password;
      }
      const { error } = await supabase
        .from('resellers')
        .update(updatePayload)
        .eq('id', editingReseller.id);
      if (error) toast.error('Error al actualizar revendedor');
      else toast.success('Revendedor actualizado');
    } else {
      if (!resellerForm.password.trim()) {
        toast.error('La contraseña es requerida para nuevos revendedores');
        return;
      }
      const { error } = await supabase
        .from('resellers')
        .insert({
          manager_id: user.id,
          name: resellerForm.name,
          email: resellerForm.email,
          password_hash: resellerForm.password,
          whatsapp_number: resellerForm.whatsapp_number || null,
          balance: 0,
          status: 'active',
        });
      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe un revendedor con ese email');
        } else {
          toast.error('Error al crear revendedor');
        }
      } else {
        toast.success('¡Revendedor creado exitosamente!');
      }
    }

    setResellerFormOpen(false);
    setEditingReseller(null);
    setResellerForm({ name: '', email: '', password: '', whatsapp_number: '' });
    fetchResellers();
  };

  const handleEditReseller = (r: Reseller) => {
    setEditingReseller(r);
    setResellerForm({ name: r.name, email: r.email, password: '', whatsapp_number: r.whatsapp_number || '' });
    setResellerFormOpen(true);
  };

  const handleToggleResellerStatus = async (r: Reseller) => {
    const newStatus = r.status === 'active' ? 'blocked' : 'active';
    await supabase.from('resellers').update({ status: newStatus }).eq('id', r.id);
    toast.success(`Revendedor ${newStatus === 'active' ? 'activado' : 'bloqueado'}`);
    fetchResellers();
  };

  const handleDeleteReseller = async () => {
    if (!deleteResellerId) return;
    await supabase.from('resellers').delete().eq('id', deleteResellerId);
    toast.success('Revendedor eliminado');
    setDeleteResellerId(null);
    fetchResellers();
  };

  const handleRecharge = async () => {
    if (!rechargeOpen || !user) return;
    const amount = Number(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    const result = await rechargeBalance(rechargeOpen.id, user.id, amount, rechargeDesc || 'Recarga manual');
    if (result.success) {
      toast.success(`¡Recarga exitosa! Nuevo saldo: ${formatCOP(result.newBalance || 0)}`);
      setRechargeOpen(null);
      setRechargeAmount('');
      setRechargeDesc('Recarga manual');
      fetchResellers();
    } else {
      toast.error(result.error || 'Error al recargar');
    }
  };

  const storeUrl = `${window.location.origin}${import.meta.env.BASE_URL}store/${settingsForm.store_slug}`;

  const tabs: { key: AdminTab; icon: any; label: string }[] = [
    { key: 'settings', icon: Settings, label: 'Configuración' },
    { key: 'catalog', icon: ShoppingBag, label: 'Catálogo' },
    { key: 'resellers', icon: Users, label: 'Revendedores' },
  ];

  return (
    <div className="space-y-6">
      {/* Header con pestañas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2 shadow-lg">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">🏪 Mi Tienda</h2>
            <p className="text-xs text-muted-foreground">Portal de ventas para revendedores</p>
          </div>
        </div>

        {storeSettings && (
          <Button variant="outline" size="sm" onClick={copyStoreLink} className="gap-1.5">
            {slugCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{slugCopied ? 'Copiado' : 'Copiar link'}</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-lg p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ SETTINGS TAB ═══ */}
      {activeTab === 'settings' && (
        <div className="space-y-4 bg-card rounded-xl p-4 border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Nombre de la Tienda</Label>
              <Input
                value={settingsForm.store_name}
                onChange={e => {
                  const name = e.target.value;
                  setSettingsForm(prev => ({
                    ...prev,
                    store_name: name,
                    store_slug: generateStoreSlug(name),
                  }));
                }}
                placeholder="Ej: Mi Tienda Streaming"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Slug (URL)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={settingsForm.store_slug}
                  onChange={e => setSettingsForm(prev => ({ ...prev, store_slug: e.target.value }))}
                  placeholder="mi-tienda"
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={copyStoreLink} title="Copiar link">
                  {slugCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                {storeUrl}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Mensaje de Bienvenida</Label>
            <Input
              value={settingsForm.welcome_message}
              onChange={e => setSettingsForm(prev => ({ ...prev, welcome_message: e.target.value }))}
              placeholder="¡Bienvenido!"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Número de WhatsApp de Soporte</Label>
              <Input
                value={settingsForm.whatsapp_number}
                onChange={e => setSettingsForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                placeholder="Ej: 573001234567 (con código de país)"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Texto de Anuncio / Aviso</Label>
              <Input
                value={settingsForm.announcement_text}
                onChange={e => setSettingsForm(prev => ({ ...prev, announcement_text: e.target.value }))}
                placeholder="Ej: ¡Nuevo método de pago disponible!..."
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Logo de la Tienda</Label>
            <div className="mt-1 flex items-center gap-4">
              <div className="relative group">
                <div 
                  className="w-16 h-16 rounded-xl border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden shadow-inner"
                >
                  {settingsForm.logo_url ? (
                    <img 
                      src={settingsForm.logo_url} 
                      alt="Logo Tienda" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Store className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                {settingsForm.logo_url && (
                  <button
                    type="button"
                    onClick={() => setSettingsForm(prev => ({ ...prev, logo_url: '' }))}
                    className="absolute -top-1.5 -right-1.5 bg-destructive hover:bg-destructive/90 text-white rounded-full p-0.5 shadow-md transition-all hover:scale-110 flex items-center justify-center w-5 h-5"
                    title="Eliminar logo"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    id="logo-upload"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="gap-1.5 text-xs h-9 bg-card shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Subir Imagen
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Sube el archivo de tu logo (PNG, JPG, WEBP o SVG). La imagen se comprimirá automáticamente para cargar al instante.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Palette className="h-3 w-3" /> Color Principal
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={settingsForm.primary_color}
                  onChange={e => setSettingsForm(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <Input
                  value={settingsForm.primary_color}
                  onChange={e => setSettingsForm(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Palette className="h-3 w-3" /> Color Secundario
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={settingsForm.secondary_color}
                  onChange={e => setSettingsForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <Input
                  value={settingsForm.secondary_color}
                  onChange={e => setSettingsForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Carrusel de Banners */}
          <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                🖼️ Carrusel de Avisos y Promociones
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                Configura imágenes o videos deslizables para la parte superior de tu tienda. Los distribuidores los verán al ingresar.
              </p>
            </div>

            {/* List of current banners */}
            {settingsForm.banners && settingsForm.banners.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {settingsForm.banners.map((b, idx) => (
                  <div key={b.id} className="relative rounded-lg border bg-card overflow-hidden group shadow-sm flex flex-col justify-between h-32">
                    {b.type === 'image' ? (
                      <img src={b.url} alt="" className="w-full h-full object-cover opacity-60 pointer-events-none absolute inset-0 z-0" />
                    ) : (
                      <video src={b.url} className="w-full h-full object-cover opacity-60 pointer-events-none absolute inset-0 z-0" muted loop />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-0" />
                    
                    {/* Badge for Type */}
                    <span className="absolute top-2 left-2 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/10 select-none">
                      {b.type === 'image' ? '🖼️ Imagen' : '📹 Video'}
                    </span>
                    
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveBanner(b.id)}
                      className="absolute top-2 right-2 z-10 bg-destructive/90 hover:bg-destructive text-white rounded-full p-1 shadow-md transition-all hover:scale-105"
                      title="Eliminar banner"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => setEditingBannerId(b.id)}
                      className="absolute top-2 right-8 z-10 bg-primary/90 hover:bg-primary text-white rounded-full p-1 shadow-md transition-all hover:scale-105"
                      title="Editar banner"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>

                    <div className="relative z-10 p-3 mt-auto text-white">
                      <p className="font-extrabold text-xs truncate drop-shadow-sm">{b.title || `Banner #${idx + 1}`}</p>
                      {b.description && <p className="text-[9px] opacity-80 truncate leading-normal mt-0.5">{b.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed rounded-lg bg-card/40">
                <span className="text-xl">📭</span>
                <p className="text-xs text-muted-foreground mt-1">No hay banners configurados en el carrusel</p>
              </div>
            )}

            {/* Form to add a new banner */}
            <div className="border border-border/60 rounded-lg p-3.5 bg-card/60 space-y-3">
              <h4 className="text-xs font-bold text-foreground">Agregar Nuevo Banner</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Tipo de Contenido</Label>
                  <Select
                    value={newBanner.type}
                    onValueChange={v => setNewBanner(prev => ({ ...prev, type: v as 'image' | 'video', fileBase64: '', url: '' }))}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">🖼️ Imagen</SelectItem>
                      <SelectItem value="video">📹 Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Subir Archivo (Recomendado)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="file"
                      id="banner-file-upload"
                      accept={newBanner.type === 'image' ? "image/*" : "video/mp4, video/webm"}
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('banner-file-upload')?.click()}
                      className="w-full text-xs h-8 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {newBanner.fileBase64 ? 'Cambiar archivo' : 'Seleccionar archivo'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Paste URL option (as fallback) */}
              <div>
                <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 my-1.5">
                  <span className="w-8 h-[1px] bg-border" /> o ingresar una URL externa <span className="w-8 h-[1px] bg-border" />
                </span>
                <Label className="text-[11px]">URL del Recurso</Label>
                <Input
                  value={newBanner.url}
                  disabled={!!newBanner.fileBase64}
                  onChange={e => setNewBanner(prev => ({ ...prev, url: e.target.value }))}
                  placeholder={newBanner.type === 'image' ? "https://ejemplo.com/banner.jpg" : "https://ejemplo.com/video.mp4"}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px]">Título (Opcional)</Label>
                  <Input
                    value={newBanner.title}
                    onChange={e => setNewBanner(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Promo Netflix"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Descripción (Opcional)</Label>
                  <Input
                    value={newBanner.description}
                    onChange={e => setNewBanner(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ej: ¡Consíguela ahora!"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Enlace de Redirección (Opcional)</Label>
                  <Input
                    value={newBanner.link}
                    onChange={e => setNewBanner(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="Ej: /store/mi-tienda"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={handleAddBanner}
                  disabled={uploadingBanner || (!newBanner.fileBase64 && !newBanner.url)}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar al Carrusel
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl p-5 text-white flex flex-col items-center justify-center space-y-2 relative overflow-hidden shadow-md"
            style={{
              background: `linear-gradient(135deg, ${settingsForm.primary_color}, ${settingsForm.secondary_color})`,
            }}
          >
            {settingsForm.logo_url ? (
              <img
                src={settingsForm.logo_url}
                alt="Logo Preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-white/40 shadow-inner"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <p className="text-lg font-bold drop-shadow-sm">{settingsForm.store_name || 'Tu Tienda'}</p>
            <p className="text-sm opacity-90 drop-shadow-xs">{settingsForm.welcome_message}</p>
          </div>

          {/* Banner Edit Dialog */}
          <Dialog open={!!editingBannerId} onOpenChange={(open) => !open && setEditingBannerId(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Banner</DialogTitle>
              </DialogHeader>
              {editingBannerId && settingsForm.banners?.find(b => b.id === editingBannerId) && (
                <div className="space-y-4">
                  {(() => {
                    const b = settingsForm.banners.find(b => b.id === editingBannerId)!;
                    return (
                      <>
                        <div>
                          <Label className="text-xs">Título (Opcional)</Label>
                          <Input
                            value={b.title || ''}
                            onChange={e => setSettingsForm(prev => ({
                              ...prev,
                              banners: (prev.banners || []).map(banner => banner.id === editingBannerId ? { ...banner, title: e.target.value } : banner)
                            }))}
                            placeholder="Ej: Promo Netflix"
                            className="mt-1"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">Borra este campo si quieres quitar el título.</p>
                        </div>
                        <div>
                          <Label className="text-xs">Descripción (Opcional)</Label>
                          <Input
                            value={b.description || ''}
                            onChange={e => setSettingsForm(prev => ({
                              ...prev,
                              banners: (prev.banners || []).map(banner => banner.id === editingBannerId ? { ...banner, description: e.target.value } : banner)
                            }))}
                            placeholder="Ej: ¡Consíguela ahora!"
                            className="mt-1"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">Borra este campo si quieres quitar la descripción.</p>
                        </div>
                        <div>
                          <Label className="text-xs">Enlace de Redirección (Opcional)</Label>
                          <Input
                            value={b.link || ''}
                            onChange={e => setSettingsForm(prev => ({
                              ...prev,
                              banners: (prev.banners || []).map(banner => banner.id === editingBannerId ? { ...banner, link: e.target.value } : banner)
                            }))}
                            placeholder="Ej: /store/mi-tienda"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            // Trim empty strings to undefined to clean up the JSON
                            setSettingsForm(prev => ({
                              ...prev,
                              banners: (prev.banners || []).map(banner => banner.id === editingBannerId ? { 
                                ...banner, 
                                title: banner.title?.trim() || undefined,
                                description: banner.description?.trim() || undefined,
                                link: banner.link?.trim() || undefined
                              } : banner)
                            }));
                            setEditingBannerId(null);
                            toast.success('Cambios aplicados. Recuerda darle a "Actualizar Tienda" para guardar.');
                          }}
                          className="w-full gap-1.5"
                        >
                          <Save className="h-4 w-4" />
                          Listo
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settingsForm.is_active}
                onChange={e => setSettingsForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              Tienda activa
            </label>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="gap-1.5">
              {savingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {storeSettings ? 'Actualizar Tienda' : 'Crear Tienda'}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ CATALOG TAB ═══ */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {catalogItems.length} producto{catalogItems.length !== 1 ? 's' : ''} en el catálogo
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromFinance}
                disabled={syncingFinance}
                className="gap-1.5 border-dashed border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                {syncingFinance ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />}
                Sincronizar Finanzas
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCatalog(null);
                  setCatalogForm({
                    platform: dynamicPlatforms[0] || 'Netflix',
                    display_name: '',
                    type: 'profile',
                    selling_price: 0,
                    duration_label: '1 Mes',
                    icon_emoji: '📺',
                    is_active: true,
                    sort_order: catalogItems.length,
                  });
                  setCatalogFormOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Agregar Producto
              </Button>
            </div>
          </div>

          {catalogItems.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No hay productos en el catálogo</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Agrega tu primer producto para que los revendedores puedan comprar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalogItems.map(item => (
                <div
                  key={item.id}
                  className={`bg-card rounded-xl border p-4 transition-all hover:shadow-md ${!item.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformLogo platform={item.platform} emojiFallback={item.icon_emoji} size="sm" />
                      <div>
                        <p className="font-semibold text-sm">{item.display_name}</p>
                        <p className="text-xs text-muted-foreground">{item.platform}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCatalog(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCatalogId(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-primary">{formatCOP(item.selling_price)}</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {item.duration_label}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      item.type === 'profile'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {item.type === 'profile' ? '1 Pantalla' : 'Cuenta Completa'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Catalog Form Dialog */}
          <Dialog open={catalogFormOpen} onOpenChange={setCatalogFormOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCatalog ? 'Editar Producto' : 'Agregar Producto al Catálogo'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Plataforma</Label>
                  <Select
                    value={catalogForm.platform}
                    onValueChange={v => {
                      setCatalogForm(prev => ({
                        ...prev,
                        platform: v,
                        display_name: prev.display_name || `${v} - 1 Pantalla`,
                        icon_emoji: getPlatformEmoji(v),
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dynamicPlatforms.map(p => (
                        <SelectItem key={p} value={p}>{getPlatformEmoji(p)} {p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Nombre para mostrar</Label>
                  <Input
                    value={catalogForm.display_name}
                    onChange={e => setCatalogForm(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Ej: Netflix - 1 Pantalla"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={catalogForm.type}
                      onValueChange={v => setCatalogForm(prev => ({ ...prev, type: v as any }))}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="profile">1 Pantalla</SelectItem>
                        <SelectItem value="full_account">Cuenta Completa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Precio de Venta (COP)</Label>
                    <Input
                      type="number"
                      value={catalogForm.selling_price || ''}
                      onChange={e => setCatalogForm(prev => ({ ...prev, selling_price: Number(e.target.value) }))}
                      placeholder="16000"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Duración</Label>
                    <Select
                      value={catalogForm.duration_label}
                      onValueChange={v => setCatalogForm(prev => ({ ...prev, duration_label: v }))}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 Mes">1 Mes</SelectItem>
                        <SelectItem value="2 Meses">2 Meses</SelectItem>
                        <SelectItem value="3 Meses">3 Meses</SelectItem>
                        <SelectItem value="6 Meses">6 Meses</SelectItem>
                        <SelectItem value="1 Año">1 Año</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Emoji / Ícono</Label>
                    <Input
                      value={catalogForm.icon_emoji}
                      onChange={e => setCatalogForm(prev => ({ ...prev, icon_emoji: e.target.value }))}
                      className="mt-1 text-center text-xl"
                      maxLength={4}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={catalogForm.is_active}
                    onChange={e => setCatalogForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  Producto activo (visible en la tienda)
                </label>
                <Button onClick={handleSaveCatalogItem} className="w-full gap-1.5">
                  <Save className="h-4 w-4" />
                  {editingCatalog ? 'Actualizar' : 'Agregar al Catálogo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Catalog Confirm */}
          <AlertDialog open={!!deleteCatalogId} onOpenChange={() => setDeleteCatalogId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                <AlertDialogDescription>Este producto será eliminado del catálogo.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCatalog} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* ═══ RESELLERS TAB ═══ */}
      {activeTab === 'resellers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {resellers.length} revendedor{resellers.length !== 1 ? 'es' : ''}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingReseller(null);
                setResellerForm({ name: '', email: '', password: '', whatsapp_number: '' });
                setResellerFormOpen(true);
              }}
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" /> Agregar Revendedor
            </Button>
          </div>

          {resellers.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No hay revendedores</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Crea revendedores para que accedan a tu tienda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resellers.map(r => (
                <div key={r.id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${r.status === 'active' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gray-500'}`}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm flex items-center gap-1.5">
                          {r.name}
                          {r.status === 'blocked' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">Bloqueado</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{r.email}</span>
                          {r.whatsapp_number && (
                            <>
                              <span className="text-muted-foreground/35">·</span>
                              <a 
                                href={`https://wa.me/${r.whatsapp_number.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-emerald-500 hover:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                              >
                                <MessageCircle className="h-3 w-3 fill-current" />
                                {r.whatsapp_number}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <p className="text-xs text-muted-foreground">Saldo</p>
                        <p className={`font-bold text-sm ${Number(r.balance) > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {formatCOP(Number(r.balance))}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setRechargeOpen(r); setRechargeAmount(''); }} className="gap-1" title="Recargar saldo">
                        <Wallet className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Recargar</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditReseller(r)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleResellerStatus(r)}
                        title={r.status === 'active' ? 'Bloquear' : 'Activar'}
                      >
                        {r.status === 'active' ? <Ban className="h-3.5 w-3.5 text-orange-500" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteResellerId(r.id)} title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Password row */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Contraseña:</span>
                    <code className="bg-muted px-2 py-0.5 rounded font-mono text-[11px]">
                      {showPasswords[r.id] ? r.password_hash : '••••••••'}
                    </code>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowPasswords(prev => ({ ...prev, [r.id]: !prev[r.id] }))}>
                      {showPasswords[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reseller Form Dialog */}
          <Dialog open={resellerFormOpen} onOpenChange={setResellerFormOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{editingReseller ? 'Editar Revendedor' : 'Nuevo Revendedor'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={resellerForm.name}
                    onChange={e => setResellerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Juan Pérez"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={resellerForm.email}
                    onChange={e => setResellerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="juan@ejemplo.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Número de WhatsApp</Label>
                  <Input
                    value={resellerForm.whatsapp_number}
                    onChange={e => setResellerForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    placeholder="Ej: 573001234567"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Contraseña {editingReseller && <span className="text-muted-foreground">(dejar vacío para no cambiar)</span>}
                  </Label>
                  <Input
                    type="text"
                    value={resellerForm.password}
                    onChange={e => setResellerForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingReseller ? '••••••••' : 'Contraseña segura'}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleSaveReseller} className="w-full gap-1.5">
                  <Save className="h-4 w-4" />
                  {editingReseller ? 'Actualizar' : 'Crear Revendedor'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Recharge Dialog */}
          <Dialog open={!!rechargeOpen} onOpenChange={() => setRechargeOpen(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                  Recargar Saldo
                </DialogTitle>
              </DialogHeader>
              {rechargeOpen && (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">{rechargeOpen.name}</p>
                    <p className="text-xs text-muted-foreground">Saldo actual: <span className="font-bold text-emerald-500">{formatCOP(Number(rechargeOpen.balance))}</span></p>
                  </div>
                  <div>
                    <Label className="text-xs">Monto a recargar (COP)</Label>
                    <Input
                      type="number"
                      value={rechargeAmount}
                      onChange={e => setRechargeAmount(e.target.value)}
                      placeholder="50000"
                      className="mt-1 text-lg font-bold"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Descripción (opcional)</Label>
                    <Input
                      value={rechargeDesc}
                      onChange={e => setRechargeDesc(e.target.value)}
                      placeholder="Recarga manual"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleRecharge} className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <DollarSign className="h-4 w-4" />
                    Recargar {rechargeAmount ? formatCOP(Number(rechargeAmount)) : ''}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Reseller Confirm */}
          <AlertDialog open={!!deleteResellerId} onOpenChange={() => setDeleteResellerId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar revendedor?</AlertDialogTitle>
                <AlertDialogDescription>Se eliminarán también sus órdenes y transacciones.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteReseller} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
