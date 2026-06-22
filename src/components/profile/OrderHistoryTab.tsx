import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, RotateCcw, Search, ExternalLink, MessageCircle, AlertCircle } from "lucide-react";
import { brl } from "@/lib/format";
import { statusLabel } from "@/lib/orderStatusLabels";
import { useOrderHistory, isOngoing, isCanceled, type HistoryOrder, type OrderHistoryFilter } from "@/hooks/useOrderHistory";
import { reorderFromHistory } from "@/lib/reorder";
import { OrderHistoryDetailsDialog } from "./OrderHistoryDetailsDialog";

const FILTERS: { key: OrderHistoryFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "ongoing", label: "Em andamento" },
  { key: "done", label: "Concluídos" },
  { key: "canceled", label: "Cancelados" },
];

const PAGE = 20;

export function OrderHistoryTab() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderHistoryFilter>("all");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState<HistoryOrder | null>(null);
  const [reordering, setReordering] = useState(false);
  const { orders, isLoading, error } = useOrderHistory(filter, search);

  const grouped = useMemo(() => {
    const list = orders.slice(0, visible);
    const map = new Map<string, HistoryOrder[]>();
    for (const o of list) {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const k = key.charAt(0).toUpperCase() + key.slice(1);
      const arr = map.get(k) ?? [];
      arr.push(o);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [orders, visible]);

  async function handleReorder(order: HistoryOrder) {
    if (!order.establishment?.slug) {
      toast.error("Loja indisponível");
      return;
    }
    setReordering(true);
    try {
      const res = await reorderFromHistory(order);
      if (res.added === 0) {
        toast.error("Nenhum item desse pedido está disponível agora.");
        return;
      }
      if (res.skipped.length) {
        toast.warning(`${res.skipped.length} item(ns) não puderam ser adicionados.`, {
          description: res.skipped.map((s) => `${s.name}: ${s.reason}`).join(" · "),
        });
      }
      if (res.priceChanged.length) {
        toast.info("Alguns preços mudaram desde o pedido anterior.", {
          description: res.priceChanged
            .map((p) => `${p.name}: ${brl(p.oldPrice)} → ${brl(p.newPrice)}`)
            .join(" · "),
        });
      }
      toast.success(`${res.added} item(ns) adicionados ao carrinho`);
      setOpen(null);
      navigate(`/carrinho?reorder=1`);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível repetir o pedido");
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setVisible(PAGE);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por loja ou código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Carregando seus pedidos…
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <AlertCircle className="size-4" /> Não foi possível carregar seus pedidos.
          </div>
          <p className="mt-1 text-muted-foreground">Tente recarregar a página.</p>
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <Receipt className="mx-auto mb-3 size-10 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">Nenhum pedido por aqui ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando você fizer um pedido, ele aparece aqui pronto pra repetir num clique.
          </p>
        </div>
      )}

      {!isLoading && grouped.map(([month, list]) => (
        <section key={month} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</h4>
          <div className="grid gap-3">
            {list.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onOpen={() => setOpen(o)}
                onReorder={() => handleReorder(o)}
                reordering={reordering}
              />
            ))}
          </div>
        </section>
      ))}

      {!isLoading && orders.length > visible && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}>
            Carregar mais
          </Button>
        </div>
      )}

      <OrderHistoryDetailsDialog
        order={open}
        onClose={() => setOpen(null)}
        onReorder={handleReorder}
        reordering={reordering}
      />
    </div>
  );
}

function OrderCard({
  order,
  onOpen,
  onReorder,
  reordering,
}: {
  order: HistoryOrder;
  onOpen: () => void;
  onReorder: () => void;
  reordering: boolean;
}) {
  const total = Number(order.final_total ?? order.total ?? 0);
  const firstItems = order.items.slice(0, 2).map((i: any) => `${i.quantity}x ${i.product_name_snapshot}`);
  const extra = order.items.length > 2 ? ` · +${order.items.length - 2} itens` : "";
  const tone = isOngoing(order.status)
    ? "bg-amber-100 text-amber-900"
    : isCanceled(order.status)
    ? "bg-rose-100 text-rose-900"
    : order.status === "delivered"
    ? "bg-emerald-100 text-emerald-900"
    : "bg-muted text-foreground";

  return (
    <article className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        {order.establishment?.logo ? (
          <img src={order.establishment.logo} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="size-12 shrink-0 rounded-xl bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="truncate font-semibold">{order.establishment?.name ?? "Loja"}</h5>
            <Badge className={`${tone} border-0`}>{statusLabel(order.status)}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{order.tracking_code}</span> ·{" "}
            {new Date(order.created_at).toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {firstItems.join(" · ")}
            {extra}
          </p>
        </div>
        <div className="text-right">
          <div className="text-base font-bold tabular-nums">{brl(total)}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onOpen}>
          Ver detalhes
        </Button>
        <Button size="sm" onClick={onReorder} disabled={reordering}>
          {reordering ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <RotateCcw className="mr-1.5 size-4" />}
          Pedir de novo
        </Button>
        {isOngoing(order.status) && order.tracking_code && (
          <Button size="sm" variant="ghost" asChild>
            <a href={`/pedido/${order.tracking_code}`}>
              <ExternalLink className="mr-1.5 size-4" /> Acompanhar
            </a>
          </Button>
        )}
        {order.establishment?.whatsapp && (
          <Button size="sm" variant="ghost" asChild>
            <a
              href={`https://wa.me/${order.establishment.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="mr-1.5 size-4" /> WhatsApp
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}