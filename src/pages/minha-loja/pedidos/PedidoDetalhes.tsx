import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "../painel/_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Loader2, User, Phone, MapPin, Receipt, Clock, Trash2, Smartphone } from "lucide-react";
import { OrderChat } from "@/components/OrderChat";
import { OrderDetailsPanel } from "@/components/orders/OrderDetailsPanel";
import { OrderReferencesPanel } from "@/components/orders/OrderReferencesPanel";
import { toast } from "sonner";
import { brl } from "@/lib/format";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "waiting_business_confirmation", label: "Aguardando confirmação" },
  { value: "confirmed_by_business",         label: "Confirmado pela loja" },
  { value: "preparing",                     label: "Em preparo" },
  { value: "ready_for_pickup",              label: "Pronto para retirada" },
  { value: "out_for_delivery",              label: "Saiu para entrega" },
  { value: "delivered",                     label: "Entregue" },
  { value: "canceled_by_business",          label: "Cancelado pela loja" },
  { value: "customer_not_responding",       label: "Cliente não respondeu" },
  { value: "difficult_address",             label: "Endereço difícil" },
  { value: "needs_more_reference",          label: "Precisa de referência" },
];

export default function PedidoDetalhesLoja() {
  const { orderId, establishmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail-loja", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, establishments(*)")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const oldStatus = order?.status;
      const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId!);
      if (error) throw error;

      // Save history
      await supabase.from("order_status_history").insert({
        order_id: orderId!,
        from_status: oldStatus,
        to_status: newStatus,
        note: "Alterado pelo painel da loja",
      } as any);

      // Notification for customer
      if (order?.user_id) {
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          type: "order_status_update",
          title: "Atualização no seu pedido",
          message: `Seu pedido na ${(order.establishments as any)?.name || "loja"} agora está: ${STATUS_OPTIONS.find(opt => opt.value === newStatus)?.label || newStatus}.`,
          data: { order_id: orderId, new_status: newStatus } as any,
        });
      }
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["order-detail-loja", orderId] });
    },
  });

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div className="p-20 text-center">Pedido não encontrado.</div>;

  const openWhatsApp = () => {
    if (!order.customer_phone) return;
    const num = order.customer_phone.replace(/\D/g, "");
    const msg = `Olá, ${order.customer_name}! Aqui é da ${(order.establishments as any)?.name}. Recebemos seu pedido #${order.tracking_code || order.id.slice(0, 8)}.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <PainelSection title={`Pedido #${order.tracking_code || order.id.slice(0, 8)}`}>
      <div className="mb-6 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 size-4" /> Voltar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border p-5 bg-card">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold flex items-center gap-2"><User className="size-4" /> Dados do Cliente</h3>
              <Badge variant="outline">{order.status}</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Nome</div>
                <div className="font-medium">{order.customer_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">WhatsApp</div>
                <div className="font-medium flex items-center gap-2">
                  {order.customer_phone}
                  <Button variant="ghost" size="icon" className="size-6 text-green-600" onClick={openWhatsApp}>
                    <MessageCircle className="size-4" />
                  </Button>
                </div>
              </div>
              {order.address_id && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Local de Entrega</div>
                  <div className="font-medium flex items-start gap-2 mt-1">
                    <MapPin className="size-4 mt-1 text-muted-foreground" />
                    <div className="text-sm">
                      {order.notes ? <span className="block italic text-xs mb-1">"{order.notes}"</span> : null}
                      Endereço vinculado ao pedido.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border p-5 bg-card">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Receipt className="size-4" /> Itens do Pedido</h3>
            <OrderDetailsPanel order={order} />
          </section>

          {order.address_id && (
            <section className="rounded-xl border p-5 bg-card">
              <h3 className="font-bold flex items-center gap-2 mb-4"><MapPin className="size-4" /> Referências Visuais</h3>
              <OrderReferencesPanel orderId={order.id} />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border p-5 bg-card">
            <h3 className="font-bold mb-4">Ações do Pedido</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase mb-1 block">Alterar Status</label>
                <Select value={order.status} onValueChange={(v) => updateStatus.mutate(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal:</span>
                  <span>{brl(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Entrega:</span>
                  <span>{brl(Number(order.delivery_fee_estimated || order.delivery_fee || 0))}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 text-primary">
                  <span>Total:</span>
                  <span>{brl(Number(order.total_estimated || order.total))}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={openWhatsApp}>
                  <MessageCircle className="mr-2 size-4" /> Conversar no WhatsApp
                </Button>
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 size-4" /> Cancelar Pedido
                </Button>
              </div>
            </div>
          </section>

          <OrderChat orderId={order.id} senderType="business" establishmentId={establishmentId} />
        </div>
      </div>
    </PainelSection>
  );
}
