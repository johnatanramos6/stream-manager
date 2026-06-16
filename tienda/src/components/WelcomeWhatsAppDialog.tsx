import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Subscription } from '@/types/subscription';
import { MessageCircle, Send, Copy, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  subscription: Subscription | null;
}

function formatDateES(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function WelcomeWhatsAppDialog({ open, onClose, subscription }: Props) {
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    if (!subscription) return '';
    
    const purchaseD = new Date(subscription.purchaseDate + 'T12:00:00');
    const cutoffDate = new Date(purchaseD);
    const duration = subscription.duration_days || 30;
    cutoffDate.setDate(cutoffDate.getDate() + duration);
    const cutoffStr = `${cutoffDate.getDate().toString().padStart(2, '0')}/${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDate.getFullYear()}`;

    const isFullAccount = (subscription.profiles_sold || 1) > 1;

    if (isFullAccount) {
      // Plantilla para cuenta completa
      const lines = [
        '*🎬 SERVICIO DE STREAMING ACTIVADO ✅*',
        `Hola, ${subscription.clientName}. A continuaci\u00F3n encontrar\u00E1s tus datos de acceso:`,
        '',
        `*📌 Plataforma:* ${subscription.platform}`,
        `*📧 Correo:* ${subscription.accountEmail}`,
        `*🔐 Contrase\u00F1a:* ${subscription.accountPassword}`,
        `*👤 Perfil:* ${subscription.accountName || 'N/A'}`,
        '',
        `*📅 Fecha de inicio:* ${formatDateES(subscription.purchaseDate)}`,
        `*⏳ Fecha de corte:* ${cutoffStr}`,
        '',
        '\u2705 Si tienes alg\u00FAn inconveniente, escr\u00EDbeme para ayudarte.',
        '\u2705 Gracias por confiar en nuestros servicios.'
      ];
      return lines.join('\n');
    }

    // Plantilla para perfil individual
    const lines = [
      '*🎬 SERVICIO DE STREAMING ACTIVADO ✅*',
      `Hola, ${subscription.clientName} a continuaci\u00F3n encontrar\u00E1s tus datos de acceso:`,
      '',
      `*📌 Plataforma:* ${subscription.platform}`,
      `*📧 Correo:* ${subscription.accountEmail}`,
      `*🔐 Contrase\u00F1a:* ${subscription.accountPassword}`,
      `*👤 Perfil:* ${subscription.accountName || 'N/A'}`,
      `*🔢 PIN:* ${subscription.profilePin || 'N/A'}`,
      '',
      `*📅 Fecha de inicio:* ${formatDateES(subscription.purchaseDate)}`,
      `*⏳ Fecha de corte:* ${cutoffStr}`,
      '',
      '\u26A0\uFE0F Recomendaciones importantes:',
      '* Ingresa \u00FAnicamente al perfil asignado.',
      '* No cambies el correo, contrase\u00F1a, perfil ni PIN.',
      '* No compartas los datos de acceso con terceros.',
      '* Si tienes alg\u00FAn inconveniente, escr\u00EDbeme para ayudarte.',
      '',
      '\u2705 Gracias por confiar en mis servicios.',
      '\uD83C\uDF7F \u00A1Disfruta tu contenido!'
    ];

    return lines.join('\n');
  }, [subscription]);

  const handleSendWhatsApp = () => {
    if (!subscription?.clientPhone) {
      toast.error('Este cliente no tiene n\u00FAmero de tel\u00E9fono registrado.');
      return;
    }
    const phone = subscription.clientPhone.replace(/\D/g, '');
    // Usar api.whatsapp.com para mejor compatibilidad con emojis en PC
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success('WhatsApp abierto');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Mensaje copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!subscription) return null;

  const hasPhone = !!subscription.clientPhone && subscription.clientPhone.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Enviar datos al cliente
          </DialogTitle>
          <DialogDescription>
            Env&iacute;a los datos de acceso de <strong>{subscription.clientName}</strong> por WhatsApp o copia el mensaje.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {/* Preview */}
          <Textarea
            value={message}
            readOnly
            rows={18}
            className="text-xs leading-relaxed bg-muted/50 border-muted resize-none"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSendWhatsApp}
              disabled={!hasPhone}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
            >
              <Send className="h-4 w-4 mr-2" />
              {hasPhone ? 'Enviar por WhatsApp' : 'Sin n\u00FAmero de tel\u00E9fono'}
            </Button>
            <Button variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

