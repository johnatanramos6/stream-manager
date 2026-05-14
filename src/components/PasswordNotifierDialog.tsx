import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Subscription } from '@/types/subscription';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  clients: Subscription[];
  newPassword: string;
  platform: string;
}

export default function PasswordNotifierDialog({ open, onClose, clients, newPassword, platform }: Props) {
  const [notified, setNotified] = useState<Set<string>>(new Set());

  const handleSendWhatsApp = (client: Subscription) => {
    if (!client.clientPhone) return;
    
    // Limpiar el número de teléfono (quitar espacios, +, etc.)
    const phone = client.clientPhone.replace(/\D/g, '');
    
    // Mensaje predeterminado personalizado
    const purchaseD = new Date(client.purchaseDate + 'T12:00:00');
    const cutoffDate = new Date(purchaseD);
    cutoffDate.setDate(cutoffDate.getDate() + 30);
    const formatES = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    const lines = [
      `Hola, ${client.clientName} tu contraseña de *${platform}* ha sido actualizada por motivos de seguridad o mantenimiento.`,
      '',
      `\uD83D\uDCE7 Correo: ${client.accountEmail}`,
      `\uD83D\uDD10 *Nueva contraseña:*: ${newPassword}`,
      `\uD83D\uDC64 Perfil: ${client.accountName || 'N/A'}`,
      `\uD83D\uDD22 PIN: ${client.profilePin || 'N/A'}`,
      '',
      `\uD83D\uDCC5 Fecha de inicio: ${formatES(purchaseD)}`,
      `\u23F3 Fecha de corte: ${formatES(cutoffDate)}`
    ];

    const message = lines.join('\n');
    
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    setNotified(prev => new Set([...prev, client.id]));
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Notificar cambio de contraseña
          </DialogTitle>
          <DialogDescription>
            La contraseña se ha actualizado para {clients.length} perfil{clients.length > 1 ? 'es' : ''} que comparten esta cuenta. ¿Deseas enviarles la nueva contraseña por WhatsApp?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {clients.map(client => {
            const hasPhone = !!client.clientPhone && client.clientPhone.trim() !== '';
            const isNotified = notified.has(client.id);

            return (
              <div key={client.id} className="flex items-center justify-between p-3 bg-muted rounded-xl border">
                <div>
                  <p className="text-sm font-semibold">{client.clientName}</p>
                  <p className="text-xs text-muted-foreground">{client.clientPhone || 'Sin número registrado'}</p>
                </div>
                <Button 
                  size="sm" 
                  disabled={!hasPhone} 
                  variant={isNotified ? 'outline' : 'default'}
                  className={!isNotified && hasPhone ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                  onClick={() => handleSendWhatsApp(client)}
                >
                  {isNotified ? (
                    <><CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" /> Enviado</>
                  ) : (
                    <><MessageCircle className="h-4 w-4 mr-1.5" /> Enviar</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
