import { brl } from "@/lib/format";

interface Props {
  subtotal: number | null;
  finalSubtotal?: number | null;
  deliveryFee: number | null;
  finalDeliveryFee?: number | null;
  discount?: number | null;
  extraFee?: number | null;
  total: number | null;
  finalTotal?: number | null;
}

export function OrderSummary(p: Props) {
  const sub = Number(p.finalSubtotal ?? p.subtotal ?? 0);
  const fee = Number(p.finalDeliveryFee ?? p.deliveryFee ?? 0);
  const total = Number(p.finalTotal ?? p.total ?? 0);
  const discount = Number(p.discount ?? 0);
  const extra = Number(p.extraFee ?? 0);
  return (
    <div className="grid gap-1 rounded-xl border border-border p-3 text-sm">
      <Row label="Subtotal" value={brl(sub)} />
      <Row label="Taxa de entrega" value={brl(fee)} />
      {discount > 0 && <Row label="Desconto" value={`- ${brl(discount)}`} />}
      {extra > 0 && <Row label="Taxa extra" value={brl(extra)} />}
      <div className="mt-1 border-t border-border pt-2">
        <Row label="Total" value={brl(total)} bold />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-foreground" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}