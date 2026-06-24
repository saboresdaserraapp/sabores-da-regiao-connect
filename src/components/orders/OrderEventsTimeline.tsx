import { useEffect, useState } from "react";
import { Clock, MessageCircle, Check, ChefHat, Package, Bike, PartyPopper, XCircle, Info, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel } from "@/lib/orderStatusLabels";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_GUIDANCE: Record<string, string> = {
  waiting_business_confirmation:
    "Aguarde o estabelecimento confirmar disponibilidade, prazo e valor final.",
  confirmed_by_business: "Pedido confirmado pela loja. Em breve começa o preparo.",
  preparing: "O estabelecimento está preparando seu pedido.",
  ready_for_pickup: "Seu pedido está pronto para retirada.",
  out_for_delivery: "Seu pedido saiu para entrega.",
  delivered: "Pedido entregue. Bom apetite!",
  canceled_by_business: "O estabelecimento cancelou o pedido. Entre em contato pelo WhatsApp.",
  canceled_by_customer: "Pedido cancelado por você.",
  customer_not_responding: "A loja aguardou retorno e o pedido ficou parado.",
  difficult_address: "O estabelecimento sinalizou dificuldade no endereço.",
  needs_more_reference: "A loja pediu mais detalhes ou referências para o endereço.",
  not_completed: "Pedido não concluído.",
};

function iconFor(status: string) {
  if (status.startsWith("canceled") || status === "not_completed") return XCircle;
  switch (status) {
    case "waiting_business_confirmation": return Clock;
    case "confirmed_by_business": return Check;
    case "preparing": return ChefHat;
    case "ready_for_pickup": return Package;
    case "out_for_delivery": return Bike;
    case "delivered": return PartyPopper;
    default: return Info;
  }
}

type TimelineEvent = {
  kind: "status" | "message";
  at: string;
  status?: string;
  message?: string;
};

function fmtTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function OrderEventsTimeline({
  trackingCode,
  currentStatus,
}: {
  trackingCode: string;
  currentStatus: string;
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<number | null>(null);
  const [finalTotal, setFinalTotal] = useState<number | null>(null);
  const [availabilityAt, setAvailabilityAt] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingCode) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc(
          "get_order_public_events" as never,
          { _code: trackingCode } as never,
        );
        if (cancelled) return;
        const payload = (data as {
          status_history?: Array<{ status: string; at: string }>;
          system_messages?: Array<{ at: string; message: string }>;
          estimated_minutes?: number | null;
          final_total?: number | string | null;
          availability_confirmed_at?: string | null;
        }) || {};
        const merged: TimelineEvent[] = [
          ...(payload.status_history ?? []).map((h) => ({
            kind: "status" as const, at: h.at, status: h.status,
          })),
          ...(payload.system_messages ?? []).map((m) => ({
            kind: "message" as const, at: m.at, message: m.message,
          })),
        ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
        setEvents(merged);
        setEta(payload.estimated_minutes ?? null);
        setFinalTotal(payload.final_total != null ? Number(payload.final_total) : null);
        setAvailabilityAt(payload.availability_confirmed_at ?? null);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [trackingCode, currentStatus]);

  const isConfirmed = currentStatus !== "waiting_business_confirmation";
  // Até a confirmação final, mantenha sempre a mensagem-guia padrão.
  const currentGuidance = isConfirmed
    ? STATUS_GUIDANCE[currentStatus] ?? null
    : STATUS_GUIDANCE.waiting_business_confirmation;

  return (
    <div className="space-y-4">
      {currentGuidance && (
        <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary-foreground/90">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-foreground/90">{currentGuidance}</p>
        </div>
      )}

      {(availabilityAt || eta != null || finalTotal != null) && (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className={cn(
            "rounded-2xl border p-3 text-xs",
            availabilityAt ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted/40 text-muted-foreground",
          )}>
            <div className="mb-0.5 flex items-center gap-1.5 font-semibold">
              <Check className="size-3.5" /> Disponibilidade
            </div>
            <div>{availabilityAt ? "Confirmada pela loja" : "Aguardando"}</div>
          </div>
          <div className={cn(
            "rounded-2xl border p-3 text-xs",
            eta != null ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground",
          )}>
            <div className="mb-0.5 flex items-center gap-1.5 font-semibold">
              <Clock className="size-3.5" /> Prazo estimado
            </div>
            <div>{eta != null ? `~${eta} min` : "Aguardando"}</div>
          </div>
          <div className={cn(
            "rounded-2xl border p-3 text-xs",
            finalTotal != null ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted/40 text-muted-foreground",
          )}>
            <div className="mb-0.5 flex items-center gap-1.5 font-semibold">
              <DollarSign className="size-3.5" /> Valor final
            </div>
            <div>{finalTotal != null ? brl(finalTotal) : "Aguardando"}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando histórico…</div>
      ) : events.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</div>
      ) : (
        <ol className="relative space-y-4 pl-6">
          <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" aria-hidden />
          {events.map((ev, idx) => {
            const Icon = ev.kind === "status" ? iconFor(ev.status ?? "") : MessageCircle;
            const isLast = idx === events.length - 1;
            return (
              <li key={`${ev.kind}-${ev.at}-${idx}`} className="relative">
                <span
                  className={cn(
                    "absolute -left-6 top-0.5 grid size-6 place-items-center rounded-full border bg-background",
                    isLast ? "border-primary text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="text-sm font-medium text-foreground">
                  {ev.kind === "status" ? statusLabel(ev.status) : ev.message}
                </div>
                {ev.kind === "status" && STATUS_GUIDANCE[ev.status ?? ""] && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {STATUS_GUIDANCE[ev.status ?? ""]}
                  </div>
                )}
                <div className="mt-0.5 text-[11px] text-muted-foreground">{fmtTime(ev.at)}</div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
