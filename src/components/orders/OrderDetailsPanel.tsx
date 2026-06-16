import { brl } from "@/lib/format";

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  options?: string[];
  removed?: string[];
  note?: string;
}

export function OrderDetailsPanel({ order }: { order: any }) {
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens</div>
        <ul className="divide-y divide-border/70 rounded-xl border border-border/60 bg-card/40">
          {items.map((i, idx) => (
            <li key={idx} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">
                  {i.quantity}x {i.name || (i as any).product_name_snapshot || "Produto"}
                </div>
                <div className="font-semibold text-primary">{brl((i.unit_price || (i as any).unit_price_snapshot || 0) * i.quantity)}</div>
              </div>
              {i.options?.length ? (
                <div className="text-xs text-muted-foreground">
                  + {i.options.map(o => typeof o === 'string' ? o : (o as any).name).filter(Boolean).join(", ")}
                </div>
              ) : (i as any).selected_options_snapshot_json?.options?.length ? (
                <div className="text-xs text-muted-foreground">
                  + {(i as any).selected_options_snapshot_json.options.map((o: any) => o.name || o).filter(Boolean).join(", ")}
                </div>
              ) : null}
              {i.removed?.length ? (
                <div className="text-xs text-muted-foreground">
                  Sem: {i.removed.map(r => typeof r === 'string' ? r : (r as any).name).filter(Boolean).join(", ")}
                </div>
              ) : (i as any).selected_options_snapshot_json?.removed?.length ? (
                <div className="text-xs text-muted-foreground">
                  Sem: {(i as any).selected_options_snapshot_json.removed.map((r: any) => r.name || r).filter(Boolean).join(", ")}
                </div>
              ) : null}
              {(i.note || (i as any).item_note) && (
                <div className="text-xs italic text-muted-foreground">"{i.note || (i as any).item_note}"</div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Info label="Cliente" value={order.customer_name || "-"} />
        <Info label="Telefone" value={order.customer_phone || "-"} />
        <Info label="Pagamento" value={order.payment_method || "a combinar"} />
        <Info label="Enviado" value={new Date(order.created_at).toLocaleString("pt-BR")} />
        {order.notes && <div className="sm:col-span-2"><Info label="Observação geral" value={order.notes} /></div>}
      </div>

      <div className="rounded-xl bg-muted/50 p-3">
        <Row label="Subtotal" value={brl(Number(order.subtotal || 0))} />
        <Row label="Taxa de entrega" value={brl(Number(order.delivery_fee || 0))} />
        <div className="my-1 border-t border-border" />
        <Row label="Total estimado" value={brl(Number(order.total || 0))} strong />
        {order.final_total != null && (
          <Row label="Total confirmado" value={brl(Number(order.final_total))} strong />
        )}
      </div>

      {Array.isArray(order.status_history) && order.status_history.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico</div>
          <ul className="space-y-1 text-xs">
            {order.status_history.map((h: any, i: number) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1">
                <span className="font-medium">{h.status}</span>
                <span className="text-muted-foreground">{h.at ? new Date(h.at).toLocaleString("pt-BR") : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={"flex items-center justify-between py-0.5 " + (strong ? "font-semibold" : "text-muted-foreground")}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
