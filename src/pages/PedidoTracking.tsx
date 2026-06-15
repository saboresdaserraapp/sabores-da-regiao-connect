import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Loader2, Clock } from "lucide-react";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import { OrderStatusStepper } from "@/components/orders/OrderStatusStepper";
import { OrderDetailsPanel } from "@/components/orders/OrderDetailsPanel";
import { CustomerReferencesPanel } from "@/components/orders/CustomerReferencesPanel";
import { brl } from "@/lib/format";

const PedidoTracking = () => {
  const { code } = useParams();
  const { order, loading } = useOrderTracking(code);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-cream">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-cream">
        <div className="container py-20 text-center">
          <h1 className="font-display text-2xl">Pedido não encontrado</h1>
          <p className="mt-2 text-muted-foreground">Confira o código de acompanhamento.</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-primary-foreground">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const waMsg = `Olá! Sobre o pedido ${order.tracking_code}.`;
  const waLink = order.establishment_whatsapp
    ? `https://wa.me/${String(order.establishment_whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(waMsg)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-cream pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="container flex h-14 items-center gap-3">
          <Link to={`/e/${order.establishment_slug}`} replace aria-label="Voltar ao cardápio"
            className="grid size-9 place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">Acompanhamento do pedido</div>
            <div className="truncate font-display text-base font-semibold">{order.establishment_name}</div>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{order.tracking_code}</span>
        </div>
      </header>

      <div className="container space-y-5 py-6">
        <section className="rounded-3xl bg-card p-5 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold">Status do pedido</h2>
          <OrderStatusStepper status={order.status} />
        </section>

        <section className="rounded-3xl bg-card p-5 shadow-card">
          <h3 className="mb-2 font-display text-base font-semibold">Resposta do estabelecimento</h3>
          {order.establishment_reply || order.estimated_minutes || order.final_total ? (
            <div className="space-y-2 text-sm">
              {order.establishment_reply && <p>{order.establishment_reply}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {order.estimated_minutes != null && (
                  <div className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-primary">
                    <Clock className="size-4" />
                    <span className="text-sm font-semibold">Prazo: ~{order.estimated_minutes} min</span>
                  </div>
                )}
                {order.final_total != null && (
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-700">
                    <div className="text-[10px] uppercase tracking-wide">Total confirmado</div>
                    <div className="font-display text-lg font-bold">{brl(Number(order.final_total))}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aguardando confirmação do estabelecimento no WhatsApp…</p>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-warm px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              <MessageCircle className="size-4" /> Abrir conversa no WhatsApp
            </a>
          )}
        </section>

        <section className="rounded-3xl bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-base font-semibold">Detalhes do pedido</h3>
          <OrderDetailsPanel order={order} />
        </section>

        <CustomerReferencesPanel orderId={order.id} />

        <div className="text-center">
          <Link to={`/e/${order.establishment_slug}`} replace
            className="text-sm font-medium text-primary hover:underline">
            ← Voltar ao cardápio de {order.establishment_name}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PedidoTracking;
