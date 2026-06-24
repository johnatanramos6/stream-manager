// ═══════════════════════════════════════════════════════════
// StoreOrderResult – Modal de resultado post-compra
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Copy,
  Check,
  MessageCircle,
  Mail,
  Lock,
  KeyRound,
  User,
  FileText,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCOP } from '@/types/platformPricing';
import type { StoreOrder } from '@/types/storefront';

interface StoreOrderResultProps {
  order: StoreOrder;
  credentials: {
    email?: string;
    password?: string;
    pin?: string;
    profile_name?: string;
    notes?: string;
    purchase_date?: string;
    duration_days?: number;
  };
  onClose: () => void;
}

function formatDateES(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function CopyField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 dark:bg-white/5 border border-border dark:border-white/10 group hover:bg-secondary/80 dark:hover:bg-white/[0.08] transition-colors duration-200">
      <div className="w-8 h-8 rounded-lg bg-background dark:bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground dark:text-white/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 dark:text-white/30 mb-0.5">{label}</p>
        <p className="text-sm font-mono text-foreground dark:text-white truncate">{value}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCopy}
        className="flex-shrink-0 w-8 h-8 text-muted-foreground dark:text-white/30 hover:text-foreground dark:hover:text-white hover:bg-secondary dark:hover:bg-white/10 transition-all duration-200"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

export default function StoreOrderResult({
  order,
  credentials,
  onClose,
}: StoreOrderResultProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const purchaseDate = credentials.purchase_date || (order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
  const duration = credentials.duration_days || 30;

  const purchaseD = new Date(purchaseDate + 'T12:00:00');
  const cutoffDate = new Date(purchaseD);
  cutoffDate.setDate(cutoffDate.getDate() + duration);
  const cutoffStr = `${cutoffDate.getDate().toString().padStart(2, '0')}/${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDate.getFullYear()}`;

  const isFullAccount = order.type === 'full_account';

  const isM365Personal = 
    (order.platform.toLowerCase().includes('microsoft 365') || 
     order.platform.toLowerCase().includes('office 365') || 
     order.platform.toLowerCase().includes('m365')) && 
    order.platform.toLowerCase().includes('personal');

  const extraInstructions = isM365Personal ? [
    '',
    '*ℹ️ Información Adicional:*',
    'Ingresa a www.office.com e inicia sesión con el correo y la clave que te entregamos. Al ingresar, el sistema puede solicitar cambiar la clave; si decides hacerlo, no la pierdas, ya que en caso de olvido se pierde la garantía del servicio. Luego, dentro de la página selecciona Instalar aplicaciones y después Microsoft 365. Abre el archivo descargado e instala Office en tu computador. Finalmente, al abrir Word, Excel o PowerPoint, inicia sesión con la misma cuenta para que el producto quede correctamente activado. ℹ️'
  ] : [];

  const whatsappMessage = isFullAccount 
    ? [
        '🎬 SERVICIO DE STREAMING ACTIVADO ✅',
        'Hola, a continuación encontrarás tus datos de acceso:',
        '',
        `📌 Plataforma: ${order.platform}`,
        `📧 Correo: ${credentials.email || 'N/A'}`,
        `🔑 Contraseña: ${credentials.password || 'N/A'}`,
        `👤 Perfil: Cuenta Completa`,
        '',
        `📅 Fecha de inicio: ${formatDateES(purchaseDate)}`,
        `⏳ Fecha de corte: ${cutoffStr}`,
        '',
        credentials.notes ? `📝 ${credentials.notes}` : '',
        ...extraInstructions,
        '',
        '✅ Si tienes algún inconveniente, escríbeme para ayudarte.',
        '✅ Gracias por confiar en nuestros servicios.'
      ].filter(line => line !== null && line !== undefined).join('\n')
    : [
        '🎬 SERVICIO DE STREAMING ACTIVADO ✅',
        'Hola, a continuación encontrarás tus datos de acceso:',
        '',
        `📌 Plataforma: ${order.platform}`,
        `📧 Correo: ${credentials.email || 'N/A'}`,
        `🔑 Contraseña: ${credentials.password || 'N/A'}`,
        `👤 Perfil: ${credentials.profile_name || 'N/A'}`,
        `🔢 PIN: ${credentials.pin || 'N/A'}`,
        '',
        `📅 Fecha de inicio: ${formatDateES(purchaseDate)}`,
        `⏳ Fecha de corte: ${cutoffStr}`,
        '',
        '⚠️ Recomendaciones importantes:',
        '* Ingresa únicamente al perfil asignado.',
        '* No cambies el correo, contraseña, perfil ni PIN.',
        '* No compartas los datos de acceso con terceros.',
        '* Si tienes algún inconveniente, escríbeme para ayudarte.',
        ...extraInstructions,
        '',
        '✅ Gracias por confiar en mis servicios.',
        '🍿 ¡Disfruta tu contenido!'
      ].join('\n');

  const openWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      toast.success('Todas las credenciales copiadas en formato plantilla');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="backdrop-blur-xl bg-background/95 dark:bg-zinc-900/95 border-border dark:border-white/10 text-foreground dark:text-white max-w-md overflow-hidden animate-in fade-in-0 duration-300">
        {/* Confetti-like celebration effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  background: ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'][
                    i % 6
                  ],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.6 + Math.random() * 0.8}s`,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        )}

        <DialogHeader className="text-center relative">
          {/* Success check */}
          <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in-50 duration-500">
            <PartyPopper className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground dark:text-white">
            ¡Compra Exitosa!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-white/50">
            Aquí están las credenciales del servicio
          </DialogDescription>
        </DialogHeader>

        {/* Order summary pill */}
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="px-3 py-1 rounded-full bg-secondary/60 dark:bg-white/5 border border-border dark:border-white/10 text-xs text-muted-foreground dark:text-white/60">
            {order.platform} · {order.type === 'profile' ? 'Pantalla' : 'Cuenta'} · {formatCOP(order.amount)}
          </span>
        </div>

        {/* Credentials */}
        <div className="space-y-2 mt-2">
          {credentials.email && (
            <CopyField label="Email" value={credentials.email} icon={Mail} />
          )}
          {credentials.password && (
            <CopyField label="Contraseña" value={credentials.password} icon={Lock} />
          )}
          {credentials.pin && (
            <CopyField label="PIN" value={credentials.pin} icon={KeyRound} />
          )}
          {credentials.profile_name && (
            <CopyField label="Perfil" value={credentials.profile_name} icon={User} />
          )}
          {credentials.notes && (
            <CopyField label="Notas" value={credentials.notes} icon={FileText} />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={openWhatsApp}
            className="w-full h-11 rounded-xl font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Enviar por WhatsApp
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={copyAll}
              className="flex-1 h-10 rounded-xl text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white hover:bg-secondary dark:hover:bg-white/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar todo
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white hover:bg-secondary dark:hover:bg-white/10"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
