import { Check, Clock, MessageCircle, ChefHat, Package, Bike, PartyPopper, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ORDER_STATUSES = [
  { key: "waiting_business_confirmation", label: "Aguardando confirmação", icon: MessageCircle },
  { key: "confirmed_by_business", label: "Confirmado", icon: Check },
  { key: "preparing", label: "Em preparo", icon: ChefHat },
  { key: "ready_for_pickup", label: "Pronto", icon: Package },
  { key: "out_for_delivery", label: "Saiu para entrega", icon: Bike },
  { key: "delivered", label: "Concluído", icon: PartyPopper },
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number]["key"] | "canceled_by_business" | "canceled_by_customer" | "unknown";

export const STATUS_LABEL: Record<string, string> = {
  ...Object.fromEntries(ORDER_STATUSES.map(s => [s.key, s.label])),
  canceled_by_business: "Cancelado pela loja",
  canceled_by_customer: "Cancelado pelo cliente",
  customer_not_responding: "Cliente não respondeu",
  difficult_address: "Endereço difícil",
  needs_more_reference: "Precisa de referência",
  not_completed: "Não concluído",
  unknown: "Desconhecido",
};

export function statusIndex(s: string) {
  return ORDER_STATUSES.findIndex(x => x.key === s);
}

export function OrderStatusBadge({ status }: { status: string }) {
  const tone =
    status.startsWith("canceled") ? "bg-destructive/15 text-destructive" :
    status === "delivered" ? "bg-emerald-500/15 text-emerald-700" :
    status === "out_for_delivery" || status === "ready_for_pickup" ? "bg-primary/15 text-primary" :
    status === "preparing" ? "bg-amber-500/15 text-amber-700" :
    "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function OrderStatusStepper({ status }: { status: string }) {
  if (status.startsWith("canceled")) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <XCircle className="size-5" />
        <div>
          <div className="font-semibold">Pedido cancelado</div>
          <div className="text-xs opacity-80">Entre em contato com o estabelecimento pelo WhatsApp.</div>
        </div>
      </div>
    );
  }
  const current = Math.max(0, statusIndex(status));
  return (
    <ol className="grid grid-cols-7 gap-1">
      {ORDER_STATUSES.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex flex-col items-center text-center">
            <div
              className={cn(
                "grid size-9 place-items-center rounded-full border-2 transition-colors",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-primary/15 text-primary animate-pulse",
                !done && !active && "border-border bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </div>
            <span className={cn("mt-1 text-[10px] leading-tight", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
