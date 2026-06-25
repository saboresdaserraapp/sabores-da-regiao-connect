import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "../painel/_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Loader2, User, Phone, MapPin, Receipt, Clock, Trash2, Smartphone } from "lucide-react";
import { OrderChat } from "@/components/OrderChat";
import { OrderDetailsPanel } from "@/components/orders/OrderDetailsPanel";
import { OrderReferencesPanel } from "@/components/orders/OrderReferencesPanel";
import { SendProposalDialog } from "@/components/orders/SendProposalDialog";
import { WhatsappHistoryPanel } from "@/components/orders/WhatsappHistoryPanel";
import { StoreConfirmActions } from "@/components/orders/StoreConfirmActions";
import { confirmWithoutChange, fetchActiveProposal, registerWhatsappAcceptance, OrderProposal } from "@/lib/orderProposals";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Send, Smartphone as SmartphoneIcon } from "lucide-react";

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

export default function PedidoDetalhesLoja({
  orderId: orderIdProp,
  establishmentId: establishmentIdProp,
}: { orderId?: string; establishmentId?: string } = {}) {
  const params = useParams();
  const orderId = orderIdProp ?? params.orderId;
  const establishmentId = establishmentIdProp ?? params.establishmentId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["order-detail-loja", establishmentId, orderId],
    enabled: !!orderId,
    queryFn: async () => {
      let orderQuery = supabase
        .from("orders")
        .select("*")
        .eq("id", orderId!)
        .maybeSingle();

      if (establishmentId) {
        orderQuery = supabase
          .from("orders")
          .select("*")
          .eq("id", orderId!)
          .eq("establishment_id", establishmentId)
          .maybeSingle();
      }

      const { data, error } = await orderQuery;
      if (error) throw error;

      if (!data) return null;

      const { data: establishment, error: establishmentError } = await supabase
        .from("establishments")
        .select("id,name,slug,logo,whatsapp")
        .eq("id", data.establishment_id)
        .maybeSingle();

      if (establishmentError) throw establishmentError;

      return { ...data, establishments: establishment };
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

  const [feeInput, setFeeInput] = useState<string>("");
  const [replyInput, setReplyInput] = useState<string>("");
  const [savingFee, setSavingFee] = useState(false);
  const [activeProposal, setActiveProposal] = useState<OrderProposal | null>(null);
  const [waNote, setWaNote] = useState("");
  const [waOpen, setWaOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    if (order) {
      setFeeInput(String(order.delivery_fee ?? order.delivery_fee_estimated ?? 0));
      setReplyInput(order.establishment_reply ?? "");
    }
  }, [order?.id]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    fetchActiveProposal(orderId).then((p) => { if (!cancelled) setActiveProposal(p); }).catch(() => {});
    const ch = supabase
      .channel(`store-proposal-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_confirmation_proposals", filter: `order_id=eq.${orderId}` },
        () => fetchActiveProposal(orderId).then(setActiveProposal).catch(() => {})
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [orderId]);

  const confirmFee = async () => {
    if (!order) return;
    const fee = Number(feeInput);
    if (Number.isNaN(fee) || fee < 0) { toast.error("Informe uma taxa válida"); return; }
    setSavingFee(true);
    const newTotal = Number(order.subtotal || 0) + fee;
    const { error } = await supabase.from("orders").update({
      delivery_fee: fee,
      final_total: newTotal,
      establishment_reply: replyInput || null,
    }).eq("id", order.id);
    setSavingFee(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Total confirmado para o cliente");
    queryClient.invalidateQueries({ queryKey: ["order-detail-loja", orderId] });
  };

  if (isLoading) {
    return (
      <PainelSection title="Carregando pedido...">
        <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
      </PainelSection>
    );
  }
  if (error) {
    return (
      <PainelSection title="Pedido">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <p className="font-semibold text-destructive">Não foi possível carregar este pedido.</p>
          <p className="mt-1 text-muted-foreground">{(error as Error).message}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => refetch()}>Tentar novamente</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
          </div>
        </div>
      </PainelSection>
    );
  }
  if (!order) {
    return (
      <PainelSection title="Pedido não encontrado">
        <div className="rounded-xl border p-6 text-sm">
          <p>Este pedido não existe mais ou não pertence a esta loja.</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 size-4" /> Voltar para pedidos
          </Button>
        </div>
      </PainelSection>
    );
  }

  const isWaiting = order.status === "waiting_business_confirmation";

  const onConfirmNoChange = async () => {
    setBusyAction(true);
    try {
      await confirmWithoutChange(order.id);
      toast.success("Pedido confirmado");
      queryClient.invalidateQueries({ queryKey: ["order-detail-loja", orderId] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erro");
    } finally { setBusyAction(false); }
  };

  const onRegisterWhatsappAccept = async () => {
    if (!activeProposal) return;
    setBusyAction(true);
    try {
      await registerWhatsappAcceptance({
        proposalId: activeProposal.id,
        orderId: order.id,
        establishmentId: order.establishment_id,
        note: waNote || undefined,
      });
      toast.success("Aceite registrado");
      setWaOpen(false);
      setWaNote("");
      queryClient.invalidateQueries({ queryKey: ["order-detail-loja", orderId] });
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Erro");
    } finally { setBusyAction(false); }
  };

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

          <WhatsappHistoryPanel orderId={order.id} />
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

              <StoreConfirmActions
                orderId={order.id}
                estimatedMinutes={order.estimated_minutes ?? null}
                finalTotal={order.final_total != null ? Number(order.final_total) : null}
                availabilityConfirmedAt={(order as { availability_confirmed_at?: string | null }).availability_confirmed_at ?? null}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["order-detail-loja", orderId] })}
              />

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
                {order.final_total != null && (
                  <div className="mt-1 flex justify-between text-xs text-emerald-700">
                    <span>Total confirmado:</span>
                    <span className="font-semibold">{brl(Number(order.final_total))}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t space-y-2">
                <Label className="text-xs font-bold uppercase">Confirmar taxa de entrega</Label>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" min="0" value={feeInput} onChange={(e) => setFeeInput(e.target.value)} placeholder="0,00" />
                  <Button size="sm" variant="outline" onClick={() => setFeeInput(String(order.delivery_fee_estimated ?? 0))}>App</Button>
                </div>
                <Textarea rows={2} placeholder="Mensagem para o cliente (opcional)" value={replyInput} onChange={(e) => setReplyInput(e.target.value)} />
                <Button className="w-full" size="sm" disabled={savingFee} onClick={confirmFee}>
                  {savingFee ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Confirmar total para o cliente
                </Button>
                <p className="text-[10px] text-muted-foreground">O cliente vê o valor atualizado na hora na página do pedido.</p>
              </div>

              <div className="flex flex-col gap-2">
                {isWaiting && (
                  <>
                    <SendProposalDialog
                      orderId={order.id}
                      establishmentId={order.establishment_id}
                      defaultSubtotal={Number(order.subtotal ?? 0)}
                      defaultDeliveryFee={Number(order.delivery_fee_estimated ?? order.delivery_fee ?? 0)}
                      onSent={() => queryClient.invalidateQueries({ queryKey: ["order-detail-loja", orderId] })}
                    />
                    <Button variant="outline" className="w-full" onClick={onConfirmNoChange} disabled={busyAction}>
                      <CheckCircle2 className="mr-2 size-4" /> Confirmar sem alteração
                    </Button>
                    {activeProposal && (
                      <Dialog open={waOpen} onOpenChange={setWaOpen}>
                        <DialogTrigger asChild>
                          <Button variant="secondary" className="w-full">
                            <SmartphoneIcon className="mr-2 size-4" /> Registrar aceite pelo WhatsApp
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar aceite recebido pelo WhatsApp</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-muted-foreground">
                            Use somente se o cliente confirmou a proposta por mensagem fora do app.
                            O pedido será marcado como confirmado e o histórico registrará esta ação manual.
                          </p>
                          <Textarea
                            rows={3}
                            placeholder="Observação (opcional)"
                            value={waNote}
                            onChange={(e) => setWaNote(e.target.value)}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setWaOpen(false)} disabled={busyAction}>Cancelar</Button>
                            <Button onClick={onRegisterWhatsappAccept} disabled={busyAction}>
                              {busyAction ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                              Confirmar aceite
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </>
                )}
                <Button className="w-full" onClick={openWhatsApp}>
                  <MessageCircle className="mr-2 size-4" /> Conversar no WhatsApp
                </Button>
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 size-4" /> Cancelar Pedido
                </Button>
              </div>
            </div>
          </section>

          <OrderChat
            orderId={order.id}
            senderType="business"
            establishmentId={establishmentId}
            title="Conversa com o cliente"
            quickReplies={[
              "Seu pedido está em análise.",
              "Estamos confirmando a taxa de entrega.",
              "Você pode enviar mais uma referência do endereço?",
              "A taxa de entrega final foi enviada para sua confirmação.",
              "Seu pedido foi confirmado e entrará em preparo.",
              "Seu pedido está em preparo.",
              "Seu pedido saiu para entrega.",
              "Tivemos um imprevisto e precisamos falar com você.",
              "Não conseguimos contato. Podemos seguir com o pedido?",
            ]}
          />
        </div>
      </div>
    </PainelSection>
  );
}
