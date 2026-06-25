import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Clock, Search } from "lucide-react";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import { useAuth } from "@/hooks/useAuth";
import { SignupInviteDialog } from "@/components/SignupInviteDialog";
import { trackUiEvent } from "@/lib/uiAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { OrderStatusStepper } from "@/components/orders/OrderStatusStepper";
import { OrderDetailsPanel } from "@/components/orders/OrderDetailsPanel";
import { CustomerReferencesPanel } from "@/components/orders/CustomerReferencesPanel";
import { OrderEventsTimeline } from "@/components/orders/OrderEventsTimeline";
import { TrackingShareActions } from "@/components/orders/TrackingShareActions";
import { brl } from "@/lib/format";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { addRecentOrderCode } from "@/lib/recentOrderCodes";
import { markGuestSeen } from "@/lib/guestSeenMessages";

const PedidoTrackingPublic = () => {
  const { code } = useParams();
  const { order, loading } = useOrderTracking(code);
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Remember tracking codes so the global floating chat can surface
  // messages from the establishment even for guest visitors.
  useEffect(() => {
    if (code) {
      addRecentOrderCode(code);
      // Visitar a página é considerado "leitura" — zera a badge do chat flutuante.
      markGuestSeen(code);
    }
  }, [code]);

  const inviteKey = order ? `sdr_signup_invite_shown:${order.tracking_code}` : null;

  const persistDismiss = async (source: "shown" | "cta" | "dismiss") => {
    if (!inviteKey) return;
    try {
      localStorage.setItem(inviteKey, "1");
    } catch {
      /* noop */
    }
    if (!order?.tracking_code) return;
    try {
      await supabase
        .from("signup_invite_dismissals")
        .insert({
          tracking_code: order.tracking_code,
          source,
          campaign: "post_delivery_invite",
        })
        .select()
        .maybeSingle();
    } catch {
      // unique violation or offline — safe to ignore, decision already recorded locally
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!order || user) return;
    if (order.status !== "delivered") return;
    const key = `sdr_signup_invite_shown:${order.tracking_code}`;
    (async () => {
      try {
        if (localStorage.getItem(key)) return;
      } catch {
        /* noop */
      }
      // Check DB persistence across devices/browsers
      try {
        const { data } = await supabase
          .from("signup_invite_dismissals")
          .select("id")
          .eq("tracking_code", order.tracking_code)
          .maybeSingle();
        if (data?.id) {
          try { localStorage.setItem(key, "1"); } catch { /* noop */ }
          return;
        }
      } catch {
        /* if the DB check fails we still fall back to showing once */
      }
      if (cancelled) return;
      try { localStorage.setItem(key, "1"); } catch { /* noop */ }
      setInviteOpen(true);
      trackUiEvent("signup_invite_shown", {
        tracking_code: order.tracking_code,
        establishment_id: order.establishment_id ?? null,
      });
      // Record "shown" so it never reappears on another device either
      void persistDismiss("shown");
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-cream">
        <LoadingState variant="page" label="Buscando seu pedido..." />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-cream">
        <div className="container py-16">
          <EmptyState
            icon={Search}
            title="Pedido não encontrado"
            description="Confira se o código de acompanhamento está correto."
            action={<Button asChild><Link to="/">Voltar ao início</Link></Button>}
          />
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
          <Link to={`/loja/${order.establishment_slug}`} replace aria-label="Voltar ao cardápio"
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
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Status do pedido</h2>
          <OrderStatusStepper status={order.status} />
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-base font-semibold tracking-tight">Linha do tempo</h3>
          <OrderEventsTimeline trackingCode={order.tracking_code} currentStatus={order.status} />
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-base font-semibold tracking-tight">Compartilhar acompanhamento</h3>
          <TrackingShareActions
            trackingCode={order.tracking_code}
            trackingUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/pedido/${order.tracking_code}`}
            establishmentName={order.establishment_name ?? undefined}
            whatsapp={order.establishment_whatsapp ?? undefined}
            whatsappMessage={order.whatsapp_message ?? undefined}
            showResend={!!order.establishment_whatsapp && !!order.whatsapp_message}
          />
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="mb-2 font-display text-base font-semibold tracking-tight">Resposta do estabelecimento</h3>
          {order.establishment_reply || order.estimated_minutes || order.final_total ? (
            <div className="space-y-2 text-sm">
              {order.establishment_reply && <p>{order.establishment_reply}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {order.estimated_minutes != null && (
                  <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <Clock className="size-4" />
                    <span className="text-sm font-semibold">Prazo: ~{order.estimated_minutes} min</span>
                  </div>
                )}
                {order.final_total != null && (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-success">
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
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-warm px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.98]">
              <MessageCircle className="size-4" /> Abrir conversa no WhatsApp
            </a>
          )}
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-base font-semibold tracking-tight">Detalhes do pedido</h3>
          <OrderDetailsPanel order={order} />
        </section>

        <CustomerReferencesPanel orderId={order.id} />

        <div className="text-center">
          <Link to={`/loja/${order.establishment_slug}`} replace
            className="text-sm font-medium text-primary hover:underline">
            ← Voltar ao cardápio de {order.establishment_name}
          </Link>
        </div>
      </div>

      {!user && (
        <SignupInviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          prefillName={order.customer_name ?? null}
          prefillPhone={order.customer_phone ?? null}
          trackingCode={order.tracking_code}
          onCtaClick={() => {
            void persistDismiss("cta");
            trackUiEvent("signup_invite_cta_click", {
              tracking_code: order.tracking_code,
              establishment_id: order.establishment_id ?? null,
            });
          }}
          onDismiss={() => {
            void persistDismiss("dismiss");
            trackUiEvent("signup_invite_dismissed", {
              tracking_code: order.tracking_code,
            });
          }}
        />
      )}
    </div>
  );
};

export default PedidoTrackingPublic;
