import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { OrderStatusStepper } from "@/components/orders/OrderStatusStepper";
import { OrderDetailsPanel } from "@/components/orders/OrderDetailsPanel";
import { OrderChat } from "@/components/OrderChat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Loader2, Store, ShoppingBag, AlertCircle, Clock, MapPin, Receipt, Wallet, User, Phone } from "lucide-react";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useOrderDetails } from "@/hooks/useOrders";

export default function PedidoDetalhesCliente() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { data: order, isLoading, error, refetch } = useOrderDetails(orderId);
  const qc = useQueryClient();

  // Real-time updates + fallback polling
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => {
          refetch();
          qc.invalidateQueries({ queryKey: ["orders-user"] });
          qc.invalidateQueries({ queryKey: ["active-orders"] });
        }
      )
      .subscribe();
    const interval = setInterval(() => refetch(), 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId, refetch, qc]);

  if (!user) return (
    <div className="min-h-screen grid place-items-center bg-gradient-cream">
      <div className="text-center space-y-4 p-8 bg-card rounded-2xl shadow-sm border max-w-sm mx-4">
        <AlertCircle className="size-12 text-primary mx-auto" />
        <h2 className="font-display text-xl font-bold">Entre na sua conta</h2>
        <p className="text-sm text-muted-foreground">Você precisa estar logado para ver os detalhes do seu pedido.</p>
        <Button asChild className="w-full">
          <Link to="/login">Entrar agora</Link>
        </Button>
      </div>
    </div>
  );

  if (isLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  
  if (error || !order) return (
    <div className="min-h-screen grid place-items-center bg-gradient-cream">
      <div className="text-center space-y-4 p-8 bg-card rounded-2xl shadow-sm border max-w-sm mx-4">
        <AlertCircle className="size-12 text-destructive mx-auto" />
        <h2 className="font-display text-xl font-bold">Pedido não encontrado</h2>
        <p className="text-sm text-muted-foreground">Não foi possível carregar as informações deste pedido ou você não tem permissão para vê-lo.</p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => refetch()} variant="default" className="w-full">
            Tentar novamente
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/minha-conta?tab=pedidos">Voltar aos meus pedidos</Link>
          </Button>
        </div>
      </div>
    </div>
  );

  const waMsg = `Olá! Sobre o pedido ${order.tracking_code || order.id.slice(0, 8)}.`;
  const waLink = (order.establishments as any)?.whatsapp
    ? `https://wa.me/${String((order.establishments as any).whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(waMsg)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-cream">
      <Header />
      <main className="container py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/minha-conta">
              <ArrowLeft className="mr-2 size-4" /> Voltar para Minha Conta
            </Link>
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-3xl font-bold">Detalhes do Pedido</h1>
            <Badge variant="outline" className="text-sm font-bold uppercase py-1 px-3">
              #{order.tracking_code || order.id.slice(0, 8)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl bg-card p-6 shadow-sm border">
                <h2 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
                <Store className="size-5 text-primary" /> {(order.establishments as any)?.name}
              </h2>
              <OrderStatusStepper status={order.status} />
              {waLink && (
                <Button asChild className="mt-6 w-full bg-green-600 hover:bg-green-700">
                  <a href={waLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 size-4" /> Falar no WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link to={`/pedido/${order.tracking_code}`}>
                  <ShoppingBag className="mr-2 size-4" /> Acompanhar Entrega
                </Link>
              </Button>
            </section>

            <section className="rounded-2xl bg-card p-6 shadow-sm border">
              <h3 className="mb-4 font-display text-base font-semibold">Itens do Pedido</h3>
              <OrderDetailsPanel order={order} />
            </section>

            <section className="rounded-2xl bg-card p-6 shadow-sm border">
              <h3 className="mb-6 font-display text-base font-semibold flex items-center gap-2">
                <Clock className="size-5 text-primary" /> Histórico e Linha do Tempo
              </h3>
              <OrderTimeline history={order.status_history} currentStatus={order.status} />
            </section>
          </div>

          <div className="space-y-6">
            <OrderChat orderId={order.id} senderType="customer" />
            
            <section className="rounded-2xl bg-card p-6 shadow-sm border">
              <h3 className="mb-3 font-display text-base font-semibold">Resumo de Valores</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{brl(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span>{order.delivery_fee != null && order.delivery_fee > 0 ? brl(Number(order.delivery_fee)) : (order.delivery_fee_estimated != null && order.delivery_fee_estimated > 0 ? `~ ${brl(Number(order.delivery_fee_estimated))}` : "A confirmar")}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                  <span>{order.final_total != null ? "Total" : "Total estimado"}</span>
                  <span className="text-primary">{brl(Number(order.final_total ?? order.total_estimated ?? order.total))}</span>
                </div>
                <div className="mt-4 p-3 bg-muted/30 rounded-lg text-[10px] text-muted-foreground leading-relaxed">
                  * Este é um valor estimado. O estabelecimento confirmará o valor final pelo WhatsApp ou chat.
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-card p-6 shadow-sm border">
              <h3 className="mb-4 font-display text-base font-semibold flex items-center gap-2">
                <Receipt className="size-4 text-primary" /> Dados do Pedido
              </h3>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="size-3" /> Horário
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                      <ShoppingBag className="size-3" /> Tipo
                    </div>
                    <div className="text-sm font-medium capitalize">
                      {(order.checkout_delivery_info?.[0] as any)?.address_snapshot_json?.type === "entrega" ? "Entrega" : (order.checkout_delivery_info?.[0] as any)?.address_snapshot_json?.type === "retirada" ? "Retirada" : (order.checkout_delivery_info?.[0] as any)?.address_snapshot_json?.type === "local" ? "Comer no local" : (order.checkout_delivery_info?.[0] as any)?.address_snapshot_json?.type || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                      <Wallet className="size-3" /> Pagamento
                    </div>
                    <div className="text-sm font-medium capitalize">
                      {order.payment_method || "A combinar"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                      <User className="size-3" /> Cliente
                    </div>
                    <div className="text-sm font-medium">
                      {order.customer_name}
                    </div>
                  </div>
                  {order.customer_phone && (
                    <div className="rounded-xl border border-border p-3 sm:col-span-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                        <Phone className="size-3" /> Telefone do cliente
                      </div>
                      <div className="text-sm font-medium">{order.customer_phone}</div>
                    </div>
                  )}
                </div>

                {(order.checkout_delivery_info?.[0] as any)?.address_snapshot_json?.type === "entrega" && (
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                      <MapPin className="size-3" /> Endereço de Entrega
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{(order.checkout_delivery_info?.[0] as any).address_snapshot_json.street}, {(order.checkout_delivery_info?.[0] as any).address_snapshot_json.number}</p>
                      <p className="text-muted-foreground">{(order.checkout_delivery_info?.[0] as any).address_snapshot_json.neighborhood}{(order.checkout_delivery_info?.[0] as any).address_snapshot_json.city ? `, ${(order.checkout_delivery_info?.[0] as any).address_snapshot_json.city}` : ""}</p>
                      {(order.checkout_delivery_info?.[0] as any).address_snapshot_json.complement && <p className="text-xs mt-1 italic text-muted-foreground">Complemento: {(order.checkout_delivery_info?.[0] as any).address_snapshot_json.complement}</p>}
                      {(order.checkout_delivery_info?.[0] as any).address_snapshot_json.reference && <p className="text-xs mt-1 italic text-muted-foreground">Referência: {(order.checkout_delivery_info?.[0] as any).address_snapshot_json.reference}</p>}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function OrderTimeline({ history, currentStatus }: { history: any, currentStatus: string }) {
  const steps = useMemo(() => {
    const defaultSteps = [
      { key: "waiting_business_confirmation", label: "Aguardando confirmação" },
      { key: "confirmed_by_business", label: "Pedido confirmado" },
      { key: "preparing", label: "Em preparação" },
      { key: "ready_for_pickup", label: "Pronto para retirada" },
      { key: "out_for_delivery", label: "Saiu para entrega" },
      { key: "delivered", label: "Entregue" },
    ];

    const historyArray = Array.isArray(history) ? history : [];
    
    // Map status from history to get exact timestamps
    return defaultSteps.map(step => {
      const historyItem = historyArray.find((h: any) => h.status === step.key);
      const isCompleted = historyArray.some((h: any) => h.status === step.key) || 
                          (currentStatus === step.key) ||
                          (defaultSteps.findIndex(s => s.key === currentStatus) > defaultSteps.findIndex(s => s.key === step.key));
      
      const isCurrent = currentStatus === step.key;

      return {
        ...step,
        at: historyItem?.at,
        isCompleted,
        isCurrent
      };
    });
  }, [history, currentStatus]);

  // Handle cancelled state separately
  if (currentStatus === 'cancelado') {
    const cancelItem = (Array.isArray(history) ? history : []).find((h: any) => h.status === 'cancelado');
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
        <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div>
          <div className="font-bold text-destructive">Pedido Cancelado</div>
          <div className="text-xs text-muted-foreground">
            {cancelItem?.at ? new Date(cancelItem.at).toLocaleString("pt-BR") : "Status atualizado recentemente"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:to-muted-foreground/20">
      {steps.map((step, i) => (
        <div key={i} className="relative flex items-center gap-6 group">
          <div className={cn(
            "size-10 rounded-full border-4 border-card flex items-center justify-center z-10 transition-colors",
            step.isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {step.isCompleted ? (
              <div className="size-2 rounded-full bg-current" />
            ) : (
              <div className="size-2 rounded-full bg-current" />
            )}
          </div>
          <div className="flex-1">
            <div className={cn(
              "text-sm font-bold transition-colors",
              step.isCurrent ? "text-primary" : step.isCompleted ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.label}
              {step.isCurrent && <Badge variant="secondary" className="ml-2 text-[10px] uppercase py-0 px-1.5 h-4">Atual</Badge>}
            </div>
            {step.at && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(step.at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


