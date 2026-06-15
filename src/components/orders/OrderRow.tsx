import { useState } from "react";
import { ChevronDown, MessageCircle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import { ORDER_STATUSES, OrderStatusBadge, STATUS_LABEL } from "./OrderStatusStepper";
import { OrderDetailsPanel } from "./OrderDetailsPanel";

const ALL_STATUSES = [...ORDER_STATUSES.map(s => s.key), "cancelado"] as const;

export function OrderRow({ order, onChanged }: { order: any; onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(order.status);
  const [estimated, setEstimated] = useState<string>(order.estimated_minutes?.toString() ?? "");
  const [finalTotal, setFinalTotal] = useState<string>(order.final_total?.toString() ?? "");
  const [reply, setReply] = useState<string>(order.establishment_reply ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const history = Array.isArray(order.status_history) ? order.status_history : [];
    const nextHistory = status !== order.status
      ? [...history, { status, at: new Date().toISOString(), by: "estabelecimento" }]
      : history;
    const { error } = await supabase.from("orders").update({
      status: status as any,
      estimated_minutes: estimated ? Number(estimated) : null,
      final_total: finalTotal ? Number(finalTotal) : null,
      establishment_reply: reply || null,
      status_history: nextHistory as never,
    }).eq("id", order.id);
    setSaving(false);
    if (error) { toast.error("Não foi possível salvar: " + error.message); return; }
    toast.success("Pedido atualizado");
    onChanged?.();
  };

  const waLink = order.customer_phone
    ? `https://wa.me/${order.customer_phone.replace(/\D/g, "")}`
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/30"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{order.tracking_code || order.id.slice(0, 8)}</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="mt-0.5 truncate text-sm">
            <span className="font-semibold">{order.customer_name || "Cliente"}</span>
            <span className="text-muted-foreground"> · {new Date(order.created_at).toLocaleString("pt-BR")}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{brl(Number(order.final_total ?? order.total ?? 0))}</div>
          <ChevronDown className={cn("ml-auto size-4 transition-transform text-muted-foreground", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <OrderDetailsPanel order={order} />

          <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resposta ao cliente</div>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={2}
              placeholder="Ex: Confirmado! Saímos em 40min."
              className="w-full rounded-xl border border-border bg-background p-2 text-sm outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Prazo (min)</span>
                <input value={estimated} onChange={e => setEstimated(e.target.value)} type="number"
                  className="w-full rounded-xl border border-border bg-background p-2 text-sm outline-none focus:border-primary" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total final (R$)</span>
                <input value={finalTotal} onChange={e => setFinalTotal(e.target.value)} type="number" step="0.01"
                  className="w-full rounded-xl border border-border bg-background p-2 text-sm outline-none focus:border-primary" />
              </label>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</span>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2 text-sm outline-none focus:border-primary">
                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                <Save className="size-4" /> {saving ? "Salvando…" : "Salvar"}
              </button>
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                  <MessageCircle className="size-4" /> Abrir WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
