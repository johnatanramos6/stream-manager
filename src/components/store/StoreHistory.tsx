import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StoreOrder, WalletTransaction, Reseller } from '@/types/storefront';
import { formatCOP } from '@/types/platformPricing';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getPlatformEmoji } from '@/types/storefront';
import { Calendar, CreditCard, ChevronDown, ChevronUp, Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

function formatDateES(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

interface Props {
  reseller: Reseller;
  managerId: string;
}

export default function StoreHistory({ reseller, managerId }: Props) {
  const resellerId = reseller.id;
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet'>('orders');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const getFormattedMessage = (order: StoreOrder) => {
    const creds = order.credentials || {};
    const purchaseDate = creds.purchase_date || (order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    const duration = creds.duration_days || 30;

    const purchaseD = new Date(purchaseDate + 'T12:00:00');
    const cutoffDate = new Date(purchaseD);
    cutoffDate.setDate(cutoffDate.getDate() + duration);
    const cutoffStr = `${cutoffDate.getDate().toString().padStart(2, '0')}/${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}/${cutoffDate.getFullYear()}`;

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

    const isFullAccount = order.type === 'full_account';
    return isFullAccount 
      ? [
          '🎬 SERVICIO DE STREAMING ACTIVADO ✅',
          'Hola, a continuación encontrarás tus datos de acceso:',
          '',
          `📌 Plataforma: ${order.platform}`,
          `📧 Correo: ${creds.email || 'N/A'}`,
          `🔑 Contraseña: ${creds.password || 'N/A'}`,
          `👤 Perfil: Cuenta Completa`,
          '',
          `📅 Fecha de inicio: ${formatDateES(purchaseDate)}`,
          `⏳ Fecha de corte: ${cutoffStr}`,
          '',
          ...(creds.notes ? [`📝 ${creds.notes}`, ''] : []),
          ...extraInstructions,
          '',
          '✅ Si tienes algún inconveniente, escríbeme para ayudarte.',
          '✅ Gracias por confiar en nuestros servicios.'
        ].join('\n')
      : [
          '🎬 SERVICIO DE STREAMING ACTIVADO ✅',
          'Hola, a continuación encontrarás tus datos de acceso:',
          '',
          `📌 Plataforma: ${order.platform}`,
          `📧 Correo: ${creds.email || 'N/A'}`,
          `🔑 Contraseña: ${creds.password || 'N/A'}`,
          `👤 Perfil: ${creds.profile_name || 'N/A'}`,
          `🔢 PIN: ${creds.pin || 'N/A'}`,
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
  };

  const openWhatsApp = (order: StoreOrder) => {
    const message = getFormattedMessage(order);
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const copyFormattedOrder = async (order: StoreOrder) => {
    const message = getFormattedMessage(order);
    const success = await copyText(message);
    if (success) {
      toast.success('Mensaje formateado copiado al portapapeles');
    } else {
      toast.error('No se pudo copiar');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchTransactions();
  }, [resellerId, managerId]);

  const fetchOrders = async () => {
    const { data } = await supabase.rpc('get_reseller_orders', {
      p_reseller_id: resellerId,
      p_password: reseller.password_hash
    });
    if (data) setOrders(data);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.rpc('get_reseller_transactions', {
      p_reseller_id: resellerId,
      p_password: reseller.password_hash
    });
    if (data) setTransactions(data);
  };

  const copyToClipboard = async (text: string, field: string) => {
    const success = await copyText(text);
    if (success) {
      setCopiedField(field);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex bg-secondary rounded-lg p-1 gap-1 border border-border w-full max-w-sm mx-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Compras
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'wallet'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Billetera
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/45 mb-3" />
              <p className="text-muted-foreground">Aún no has realizado compras</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:bg-card/90">
                <div 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getPlatformEmoji(order.platform)}</div>
                    <div>
                      <p className="font-semibold text-foreground">{order.platform}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • {order.type === 'profile' ? '1 Pantalla' : 'Cuenta Completa'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(order.amount)}</p>
                    <div className="flex items-center gap-1">
                      {order.credentials && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-500 hover:bg-accent rounded-lg transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(order);
                            }}
                            title="Enviar por WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyFormattedOrder(order);
                            }}
                            title="Copiar plantilla de mensaje"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <div className="text-muted-foreground/60 pl-1">
                        {expandedOrder === order.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedOrder === order.id && order.credentials && (
                  <div className="p-4 bg-muted/40 border-t border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Credenciales de Acceso</p>
                      <span className="text-[10px] text-muted-foreground bg-secondary border border-border rounded px-2 py-0.5 font-medium">
                        Pulse el ícono para copiar individualmente
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {order.credentials.email && (
                        <div className="bg-card p-3 rounded-lg border border-border flex justify-between items-center group hover:bg-accent/40 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase">Correo</p>
                            <p className="font-mono text-sm text-foreground truncate pr-2">{order.credentials.email}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all shrink-0" 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(order.credentials.email!, 'email'); }}
                          >
                            {copiedField === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                      
                      {order.credentials.password && (
                        <div className="bg-card p-3 rounded-lg border border-border flex justify-between items-center group hover:bg-accent/40 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase">Contraseña</p>
                            <p className="font-mono text-sm text-foreground truncate pr-2">{order.credentials.password}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all shrink-0" 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(order.credentials.password!, 'password'); }}
                          >
                            {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                      
                      {order.type === 'profile' && (
                        <>
                          <div className="bg-card p-3 rounded-lg border border-border flex justify-between items-center group hover:bg-accent/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-muted-foreground uppercase">Perfil</p>
                              <p className="font-mono text-sm font-bold text-primary truncate pr-2">{order.credentials.profile_name || 'N/A'}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all shrink-0" 
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(order.credentials.profile_name || 'N/A', 'profile'); }}
                            >
                              {copiedField === 'profile' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          
                          <div className="bg-card p-3 rounded-lg border border-border flex justify-between items-center group hover:bg-accent/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-muted-foreground uppercase">PIN</p>
                              <p className="font-mono text-sm font-bold text-primary truncate pr-2">{order.credentials.pin || 'N/A'}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all shrink-0" 
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(order.credentials.pin || 'N/A', 'pin'); }}
                            >
                              {copiedField === 'pin' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </>
                      )}

                      {order.credentials.notes && (
                        <div className="bg-card p-3 rounded-lg border border-border flex justify-between items-start group hover:bg-accent/40 transition-colors col-span-1 sm:col-span-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Notas / Configuración de Perfiles</p>
                            <p className="font-mono text-xs text-foreground/90 whitespace-pre-wrap mt-1 leading-relaxed">{order.credentials.notes}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all shrink-0 ml-2 mt-0.5" 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(order.credentials.notes!, 'notes'); }}
                          >
                            {copiedField === 'notes' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vista Previa del Mensaje para enviar al Cliente</p>
                      <Textarea
                        value={getFormattedMessage(order)}
                        readOnly
                        rows={10}
                        className="w-full text-xs font-mono p-3 rounded-lg bg-card border border-border text-foreground resize-none focus:outline-none focus:ring-0 leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openWhatsApp(order); }}
                        className="flex-1 h-10 rounded-lg font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] border-0 transition-all duration-200"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Enviar por WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); copyFormattedOrder(order); }}
                        className="h-10 rounded-lg text-secondary-foreground hover:bg-secondary/80 border-0"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar plantilla completa
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/45 mb-3" />
              <p className="text-muted-foreground">No hay movimientos en tu billetera</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{tx.description || (tx.type === 'recharge' ? 'Recarga de Saldo' : 'Compra')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatCOP(tx.amount)}
                  </p>
                  {tx.balance_after !== null && (
                    <p className="text-[10px] text-muted-foreground">Saldo: {formatCOP(tx.balance_after)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
