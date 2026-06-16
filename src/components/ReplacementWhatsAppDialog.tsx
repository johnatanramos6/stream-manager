import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Subscription } from '@/types/subscription';
import { MessageCircle, Send, Copy, Check, RefreshCw } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { MasterAccount } from '@/types/masterAccount';

interface Props {
  open: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  masterAccounts?: MasterAccount[];
}

function formatDateES(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function ReplacementWhatsAppDialog({ open, onClose, subscription, masterAccounts = [] }: Props) {
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    if (!subscription) return '';
    
    const purchaseD = new Date(subscription.purchaseDate + 'T12:00:00');
    const cutoffDate = new Date(purchaseD);
    cutoffDate.setDate(cutoffDate.getDate() + 30);
    const cutoffStr = `${cutoffDate.getDate().toString().padStart(2, '0')}/${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDate.getFullYear()}`;

    const isFullAccount = (subscription.profiles_sold || 1) > 1;
    const ma = masterAccounts.find(m => m.id === subscription.master_account_id);
    let customProfilesList = '';
    if (ma && ma.profiles_config && Array.isArray(ma.profiles_config)) {
      customProfilesList = ma.profiles_config
        .map((p: any, i: number) => `- Perfil ${i + 1}: ${p.name || ''} (PIN: ${p.pin || 'N/A'})`)
        .join('\n');
    }

    if (isFullAccount) {
      const lines = [
        `\uD83D\uDD04 *CUENTA DE REEMPLAZO DE ${subscription.platform.toUpperCase()}*`,
        '',
        `Hola, ${subscription.clientName} En garantia de su servicio y por dificultades tecnicas, le entregamos nuevos datos de acceso`,
        '',
        `\uD83D\uDCE7 *Correo:* ${subscription.accountEmail}`,
        `\uD83D\uDD11 *Contrase\u00F1a:* ${subscription.accountPassword}`,
        `\uD83D\uDC64 *Perfil:* Cuenta Completa`,
        '',
        `\uD83D\uDCC6 *Fecha de inicio:* ${formatDateES(subscription.purchaseDate)}`,
        `\u23F3 *Fecha de corte:* ${cutoffStr}`,
        '',
        customProfilesList ? `Cuenta completa con ${ma?.total_profiles} perfiles:\n${customProfilesList}` : (subscription.notes ? `\uD83D\uDCDD ${subscription.notes}` : '')
      ];
      return lines.filter(line => line !== null && line !== undefined).join('\n');
    }

    const lines = [
      `\uD83D\uDD04 *CUENTA DE REEMPLAZO DE ${subscription.platform.toUpperCase()}*`,
      '',
      `Hola, ${subscription.clientName} En garantia de su servicio y por dificultades tecnicas, le entregamos nuevos datos de acceso`,
      '',
      `\uD83D\uDCE7 *Correo:* ${subscription.accountEmail}`,
      `\uD83D\uDD11 *Contrase\u00F1a:* ${subscription.accountPassword}`,
      `\uD83D\uDC64 *Perfil:* ${subscription.accountName || 'N/A'}`,
      `\uD83D\uDD22 *Pin:* ${subscription.profilePin || 'N/A'}`,
      '',
      `\uD83D\uDCC6 *Fecha de inicio:* ${formatDateES(subscription.purchaseDate)}`,
      `\u23F3 *Fecha de corte:* ${cutoffStr}`
    ];

    return lines.join('\n');
  }, [subscription, masterAccounts]);

  const handleSendWhatsApp = () => {
    if (!subscription?.clientPhone) {
      toast.error('Este cliente no tiene n\u00FAmero de tel\u00E9fono registrado.');
      return;
    }
    const phone = subscription.clientPhone.replace(/\D/g, '');
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
            <RefreshCw className="h-5 w-5 text-orange-500" />
            Cuenta de reemplazo
          </DialogTitle>
          <DialogDescription>
            Se detectaron cambios en los datos de acceso de <strong>{subscription.clientName}</strong>. Env&iacute;a los nuevos datos por WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {/* Preview */}
          <Textarea
            value={message}
            readOnly
            rows={16}
            className="text-xs leading-relaxed bg-muted/50 border-muted resize-none"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSendWhatsApp}
              disabled={!hasPhone}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20"
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
