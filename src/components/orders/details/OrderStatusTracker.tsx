import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/orderStatusLabels";

const FLOW: string[] = [
  "waiting_business_confirmation",
  "confirmed_by_business",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
];

const TERMINAL_BAD = new Set([
  "canceled_by_business",
  "canceled_by_customer",
  "customer_not_responding",
  "difficult_address",
  "needs_more_reference",
  "not_completed",
]);

interface Props {
  status: string;
  history?: Array<{ status: string; at?: string }> | null;
}

export function OrderStatusTracker({ status, history }: Props) {
  if (TERMINAL_BAD.has(status)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {statusLabel(status)}
      </div>
    );
  }

  // Pickup flow: skip out_for_delivery
  const isPickup = status === "ready_for_pickup";
  const steps = isPickup
    ? FLOW.filter((s) => s !== "out_for_delivery" && s !== "delivered").concat(["delivered"])
    : FLOW;

  const currentIndex = Math.max(0, steps.indexOf(status));

  return (
    <ol className="flex items-start gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const at = history?.find((h) => h.status === s)?.at;
        return (
          <li key={s} className="flex flex-1 min-w-[80px] flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i === 0 ? "opacity-0" : done || active ? "bg-primary" : "bg-border",
                )}
              />
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-primary/10 text-primary",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </div>
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i === steps.length - 1 ? "opacity-0" : done ? "bg-primary" : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 text-[10px] leading-tight",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {statusLabel(s)}
            </span>
            {at && (
              <span className="text-[9px] text-muted-foreground">
                {new Date(at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}