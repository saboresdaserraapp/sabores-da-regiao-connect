import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import { statusLabel } from "@/lib/orderStatusLabels";
import { MessageCircle, RotateCcw, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { HistoryOrder } from "@/hooks/useOrderHistory";
import { isOngoing } from "@/hooks/useOrderHistory";

interface Props {
  order: HistoryOrder | null;
  onClose: () => void;
  onReorder: (o: HistoryOrder) => void;
  reordering?: boolean;
}

export function OrderHistoryDetailsDialog({ order, onClose, onReorder, reordering }: Props) {
  if (!order) return null;
  const total = Number(order.final_total ?? order.total ?? 0);
  const whatsapp = order.establishment?.whatsapp;
  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {order.establishment?.logo && (
              <img src={order.establishment.logo} alt="" className="size-8 rounded-full object-cover" />
            )}
            {order.establishment?.name ?? "Pedido"}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{order.tracking_code}</span>
            <span>·</span>
            <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
            <Badge variant="secondary">{statusLabel(order.status)}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Itens</h4>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {order.items.map((i: any, idx: number) => {
                const opts = i?.selected_options_snapshot_json?.options ?? [];
                const removed = i?.selected_options_snapshot_json?.removed ?? [];
                return (
                  <li key={idx} className="p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {i.quantity}x {i.product_name_snapshot}
                      </span>
                      <span className="tabular-nums">{brl(Number(i.total_price ?? 0))}</span>
                    </div>
                    {opts.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        + {opts.map((o: any) => o.name).join(", ")}
                      </div>
                    )}
                    {removed.length > 0 && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Sem: {removed.join(", ")}
                      </div>
                    )}
                    {i.item_note && (
                      <div className="mt-0.5 text-xs italic text-muted-foreground">Obs: {i.item_note}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-1 rounded-lg border border-border p-3 text-sm">
            <Row label="Subtotal" value={brl(Number(order.subtotal ?? 0))} />
            <Row label="Taxa de entrega" value={brl(Number(order.delivery_fee ?? 0))} />
            <Row label="Total" value={brl(total)} bold />
          </section>

          <section className="grid gap-1 rounded-lg border border-border p-3 text-sm">
            <div>
              <span className="text-muted-foreground">Pagamento: </span>
              <span className="font-medium capitalize">{order.payment_method ?? "—"}</span>
              {order.change_for ? (
                <span className="text-muted-foreground"> · Troco para {brl(Number(order.change_for))}</span>
              ) : null}
            </div>
            {order.notes && (
              <div>
                <span className="text-muted-foreground">Observação: </span>
                <span>{order.notes}</span>
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onReorder(order)} disabled={!!reordering}>
              <RotateCcw className="mr-1.5 size-4" /> Pedir de novo
            </Button>
            {isOngoing(order.status) && order.tracking_code && (
              <Button variant="outline" asChild>
                <Link to={`/pedido/${order.tracking_code}`}>
                  <ExternalLink className="mr-1.5 size-4" /> Acompanhar
                </Link>
              </Button>
            )}
            {whatsapp && (
              <Button
                variant="outline"
                asChild
              >
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-1.5 size-4" /> WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}