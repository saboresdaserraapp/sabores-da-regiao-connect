import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderChat } from "@/components/OrderChat";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  MessageSquare,
  AlertOctagon,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateTicket } from "@/hooks/useSupportTickets";
import { toast } from "sonner";
import { OrderChatFloating } from "@/components/OrderChatFloating";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { OrderDetailsHeader } from "@/components/orders/details/OrderDetailsHeader";
import { OrderStatusTracker } from "@/components/orders/details/OrderStatusTracker";
import { OrderSummary } from "@/components/orders/details/OrderSummary";
import { OrderItemsList } from "@/components/orders/details/OrderItemsList";
import { OrderShippingAddress } from "@/components/orders/details/OrderShippingAddress";
import { OrderPaymentMethod } from "@/components/orders/details/OrderPaymentMethod";
import { reorderFromHistory } from "@/lib/reorder";

type OrderItem = {
  product_id?: string;
  product_name_snapshot?: string;
  unit_price_snapshot?: number;
  quantity?: number;
  item_note?: string;
  selected_options_snapshot_json?: unknown;
  [k: string]: unknown;
};

type StatusHistoryEntry = { status: string; at?: string };

type OrderRow = {
  id: string;
  tracking_code: string | null;
  status: string;
  establishment_id: string;
  user_id: string | null;
  created_at: string;
  items: OrderItem[];
  subtotal: number | null;
  delivery_fee: number | null;
  total: number | null;
  final_subtotal: number | null;
  final_delivery_fee: number | null;
  final_discount: number | null;
  final_extra_fee: number | null;
  final_total: number | null;
  payment_method: string | null;
  payment_method_intent: string | null;
  payment_status: string | null;
  notes: string | null;
  address_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status_history: StatusHistoryEntry[] | null;
  confirmation_flow_status: string | null;
  establishment?: {
    id: string;
    name: string | null;
    slug: string | null;
    logo: string | null;
    whatsapp: string | null;
  } | null;
};

export default function PedidoCliente({ orderId: orderIdProp }: { orderId?: string } = {}) {
  const params = useParams<{ orderId: string }>();
  const orderId = orderIdProp ?? params.orderId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const createTicket = useCreateTicket();

  const openFloatingChat = () => {
    setHelpOpen(false);
    setChatOpen(true);
  };

  const openTicket = async () => {
    if (!order) return;
    try {
      const t = await createTicket.mutateAsync({
        subject: `Problema no pedido ${order.tracking_code ?? ""}`.trim(),
        description: "",
        category: "order_issue",
        priority: "normal",
        opened_by_role: "customer",
        establishment_id: order.establishment_id,
        order_id: order.id,
      });
      setHelpOpen(false);
      toast.success("Ticket criado");
      navigate(`/minha-conta/suporte/tickets/${t.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao abrir ticket";
      toast.error(msg);
    }
  };

  useEffect(() => {
    let active = true;
    if (!orderId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    supabase
      .from("orders")
      .select(
        "id,tracking_code,status,establishment_id,user_id,created_at,items,subtotal,delivery_fee,total,final_subtotal,final_delivery_fee,final_discount,final_extra_fee,final_total,payment_method,payment_method_intent,payment_status,notes,address_id,customer_name,customer_phone,status_history,confirmation_flow_status,establishment:establishments(id,name,slug,logo,whatsapp)",
      )
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError(error.message);
        } else if (!data) {
          setNotFound(true);
        } else {
          setOrder(data as unknown as OrderRow);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, retryTick]);

  const handleReorder = async () => {
    if (!order || !order.establishment?.slug) {
      toast.error("Loja indisponível para repetir o pedido.");
      return;
    }
    try {
      setReordering(true);
      const result = await reorderFromHistory({
        id: order.id,
        tracking_code: order.tracking_code,
        establishment_id: order.establishment_id,
        items: order.items ?? [],
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        total: order.total,
        final_total: order.final_total,
        final_delivery_fee: order.final_delivery_fee,
        confirmation_flow_status: order.confirmation_flow_status,
        status: order.status,
        payment_method: order.payment_method,
        notes: order.notes,
        address_id: order.address_id,
        created_at: order.created_at,
        establishment: order.establishment as never,
      } as never);
      toast.success(`${result.added} itens adicionados ao carrinho`);
      navigate(`/loja/${result.slug}/checkout`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Não foi possível repetir o pedido.";
      toast.error(msg);
    } finally {
      setReordering(false);
    }
  };

  if (notFound) {
    return <Navigate to="/minha-conta?tab=pedidos" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        {loading ? (
          <LoadingState variant="page" label="Carregando pedido..." />
        ) : error ? (
          <ErrorState
            title="Não conseguimos carregar este pedido"
            description={error}
            onRetry={() => setRetryTick((t) => t + 1)}
          />
        ) : order ? (
          <div className="space-y-4">
            <OrderDetailsHeader
              trackingCode={order.tracking_code}
              createdAt={order.created_at}
              status={order.status}
              establishmentName={order.establishment?.name}
              establishmentLogo={order.establishment?.logo}
            />

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Acompanhamento</h2>
              <OrderStatusTracker
                status={order.status}
                history={
                  Array.isArray(order.status_history) ? order.status_history : []
                }
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Itens</h2>
              <OrderItemsList items={order.items ?? []} />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Resumo</h2>
              <OrderSummary
                subtotal={order.subtotal}
                finalSubtotal={order.final_subtotal}
                deliveryFee={order.delivery_fee}
                finalDeliveryFee={order.final_delivery_fee}
                discount={order.final_discount}
                extraFee={order.final_extra_fee}
                total={order.total}
                finalTotal={order.final_total}
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Entrega</h2>
              <OrderShippingAddress
                addressId={order.address_id}
                fallbackName={order.customer_name}
                fallbackPhone={order.customer_phone}
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Pagamento</h2>
              <OrderPaymentMethod
                method={order.payment_method}
                intent={order.payment_method_intent}
                status={order.payment_status}
              />
              {order.notes && (
                <div className="rounded-xl border border-border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Observação</div>
                  <div>{order.notes}</div>
                </div>
              )}
            </section>

            <section className="flex flex-wrap gap-2">
              <Button onClick={handleReorder} disabled={reordering || !order.establishment?.slug}>
                <RotateCcw className="mr-1.5 size-4" /> Pedir de novo
              </Button>
              {order.establishment?.whatsapp && (
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/${order.establishment.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-1.5 size-4" /> WhatsApp
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="mr-1.5 size-4" /> Preciso de ajuda
              </Button>
            </section>

            <section
              id="order-chat-section"
              className="rounded-xl border border-border bg-card p-3"
            >
              <h2 className="px-1 pb-2 text-sm font-semibold">Mensagens do pedido</h2>
              {user ? (
                <OrderChat
                  orderId={order.id}
                  senderType="customer"
                  establishmentId={order.establishment_id}
                  title="Conversa com a loja"
                  disabled={[
                    "delivered",
                    "canceled_by_customer",
                    "canceled_by_business",
                    "not_completed",
                    "customer_not_responding",
                  ].includes(order.status)}
                  disabledMessage="Este pedido foi finalizado. Para problemas, abra um ticket de suporte."
                />
              ) : (
                <p className="p-3 text-sm text-muted-foreground">
                  Faça login para conversar com a loja.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como podemos ajudar?</DialogTitle>
            <DialogDescription>
              Escolha falar diretamente com a loja ou abrir um chamado formal para a equipe da plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start h-auto py-3" onClick={openFloatingChat}>
              <MessageSquare className="size-4 mr-3 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Falar com a loja</div>
                <div className="text-xs text-muted-foreground">Conversa rápida com o estabelecimento sobre este pedido.</div>
              </div>
            </Button>
            <Button className="justify-start h-auto py-3" onClick={openTicket} disabled={createTicket.isPending}>
              <AlertOctagon className="size-4 mr-3 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Abrir reclamação ou chamado</div>
                <div className="text-xs opacity-90">Análise formal pela equipe da plataforma, vinculada a este pedido.</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {order && (
        <OrderChatFloating
          orderId={order.id}
          establishmentId={order.establishment_id}
          open={chatOpen}
          onOpenChange={setChatOpen}
          disabled={["delivered","canceled_by_customer","canceled_by_business","not_completed","customer_not_responding"].includes(order.status)}
          disabledMessage="Este pedido foi finalizado. Para problemas, abra um ticket de suporte."
        />
      )}
    </div>
  );
}