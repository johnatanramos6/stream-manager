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
    cutoffDate.setDate(cutoffDate.getDate() + 30);
    const cutoffStr = `${cutoffDate.getDate().toString().padStart(2, '0')}/${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDate.getFullYear()}`;

    return `🎬 SERVICIO DE STREAMING ACTIVADO ✅

Hola, ${subscription.clientName} gracias por tu compra. A continuación encontrarás tus datos de acceso:

📌 Plataforma: ${subscription.platform}

📧 Correo: ${subscription.accountEmail}
🔐 Contraseña: ${subscription.accountPassword}

👤 Perfil asignado: ${subscription.accountName || 'N/A'}
🔢 PIN del perfil: ${subscription.profilePin || 'N/A'}

📅 Fecha de inicio: ${formatDateES(subscription.purchaseDate)}
⏳ Fecha de corte: ${cutoffStr}

⚠️ Recomendaciones importantes:

• Ingresa únicamente al perfil asignado.

• No cambies el correo, contraseña, perfil ni PIN.

• No compartas los datos de acceso con terceros.

• Si tienes algún inconveniente, escríbenos para ayudarte.

✅ Gracias por confiar en nosotros.
🍿 ¡Disfruta tu contenido!`;
  }, [subscription]);

  const handleSendWhatsApp = () => {
    if (!subscription?.clientPhone) {
      toast.error('Este cliente no tiene número de teléfono registrado.');
      return;
    }
    const phone = subscription.clientPhone.replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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
            Envía los datos de acceso de <strong>{subscription.clientName}</strong> por WhatsApp o copia el mensaje.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {/* Preview */}
          <Textarea
            value={message}
            readOnly
            rows={16}
            className="text-xs leading-relaxed bg-muted/50 border-muted resize-none font-mono"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSendWhatsApp}
              disabled={!hasPhone}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
            >
              <Send className="h-4 w-4 mr-2" />
              {hasPhone ? 'Enviar por WhatsApp' : 'Sin número de teléfono'}
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
