import { brl } from "@/lib/format";

interface OrderItemOption {
  name: string;
  price?: number;
}

interface OrderItem {
  product_name_snapshot?: string | null;
  quantity?: number | null;
  unit_price_snapshot?: number | null;
  total_price?: number | null;
  item_note?: string | null;
  selected_options_snapshot_json?: {
    options?: OrderItemOption[];
    removed?: string[];
  } | null;
}

interface Props {
  items: OrderItem[];
}

export function OrderItemsList({ items }: Props) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">Nenhum item registrado.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {items.map((i, idx) => {
        const opts = i?.selected_options_snapshot_json?.options ?? [];
        const removed = i?.selected_options_snapshot_json?.removed ?? [];
        const qty = Number(i.quantity ?? 1);
        const unit = Number(i.unit_price_snapshot ?? 0);
        const totalPrice = Number(i.total_price ?? unit * qty);
        return (
          <li key={idx} className="p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">
                  {qty}x {i.product_name_snapshot ?? "Item"}
                </div>
                {opts.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {opts.map((o) => o.name).join(", ")}
                  </div>
                )}
                {removed.length > 0 && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Sem: {removed.join(", ")}
                  </div>
                )}
                {i.item_note && (
                  <div className="mt-0.5 text-xs italic text-muted-foreground">
                    Obs: {i.item_note}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="tabular-nums font-medium">{brl(totalPrice)}</div>
                {unit > 0 && qty > 1 && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {brl(unit)} cada
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}