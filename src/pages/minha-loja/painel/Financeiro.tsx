import { useEffect, useMemo, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection, Gated } from "./_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Order = {
  id: string; tracking_code: string | null; customer_name: string | null;
  total: number; subtotal: number | null; delivery_fee: number | null;
  status: string; created_at: string; payment_method: string | null;
};
type Mark = {
  order_id: string; paid_status: string; paid_at: string | null;
  payment_method_real: string | null; amount_received: number | null;
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function brl(v: number) { return `R$ ${v.toFixed(2).replace(".", ",")}`; }

export default function Financeiro() {
  const { ctx } = useActiveEstablishment();
  const [orders, setOrders] = useState<Order[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!ctx) return;
    setLoading(true);
    const { data: os } = await supabase.from("orders")
      .select("id,tracking_code,customer_name,total,subtotal,delivery_fee,status,created_at,payment_method")
      .eq("establishment_id", ctx.establishmentId)
      .order("created_at", { ascending: false }).limit(100);
    const { data: ms } = await supabase.from("order_financial_marks")
      .select("order_id,paid_status,paid_at,payment_method_real,amount_received")
      .eq("establishment_id", ctx.establishmentId);
    setOrders((os ?? []) as Order[]);
    const map: Record<string, Mark> = {};
    (ms ?? []).forEach((m) => { map[m.order_id] = m as Mark; });
    setMarks(map);
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ctx?.establishmentId]);

  const totals = useMemo(() => {
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const inRange = (iso: string, days: number) => now - new Date(iso).getTime() < days * day;
    let estTotal = 0, confTotal = 0, count = 0, conf = 0, canc = 0;
    let estDay = 0, confDay = 0, estWeek = 0, confWeek = 0, estMonth = 0, confMonth = 0;
    let deliveryTotal = 0, deliveryMonth = 0, productsMonth = 0;
    for (const o of orders) {
      const m = marks[o.id];
      const isCancel = o.status === "cancelado" || m?.paid_status === "cancelado";
      if (isCancel) { canc++; continue; }
      estTotal += Number(o.total); count++;
      const fee = Number(o.delivery_fee || 0);
      const sub = Number(o.subtotal ?? (Number(o.total) - fee));
      deliveryTotal += fee;
      if (inRange(o.created_at, 1))   estDay   += Number(o.total);
      if (inRange(o.created_at, 7))   estWeek  += Number(o.total);
      if (inRange(o.created_at, 30)) { estMonth += Number(o.total); deliveryMonth += fee; productsMonth += sub; }
      if (m?.paid_status === "recebido") {
        const v = Number(m.amount_received ?? o.total);
        confTotal += v; conf++;
        if (inRange(o.created_at, 1))   confDay   += v;
        if (inRange(o.created_at, 7))   confWeek  += v;
        if (inRange(o.created_at, 30))  confMonth += v;
      }
    }
    return {
      estTotal, confTotal, count, conf, canc,
      estDay, confDay, estWeek, confWeek, estMonth, confMonth,
      deliveryTotal, deliveryMonth, productsMonth,
      ticketEst: count ? estTotal / count : 0,
      ticketConf: conf ? confTotal / conf : 0,
    };
  }, [orders, marks]);

  async function mark(orderId: string, paid_status: "recebido" | "pendente" | "cancelado", payment_method_real?: string) {
    if (!ctx) return;
    const payload = {
      order_id: orderId,
      establishment_id: ctx.establishmentId,
      paid_status,
      paid_at: paid_status === "recebido" ? new Date().toISOString() : null,
      payment_method_real: payment_method_real ?? null,
      marked_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    };
    const { error } = await supabase.from("order_financial_marks")
      .upsert(payload, { onConflict: "order_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Marcação salva");
    refresh();
  }

  if (!ctx) return null;

  return (
    <PainelSection
      title="Vendas e financeiro"
      subtitle="Valores são estimados a partir dos pedidos enviados ao WhatsApp. A loja registra manualmente os pagamentos recebidos."
      action={<Button size="sm" variant="outline" onClick={refresh} disabled={loading}>Atualizar</Button>}
    >
      <Gated feature="financial_basic">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 mb-4">
          ⚠️ Pedidos enviados via WhatsApp representam <strong>intenção de compra</strong>. A venda só é confirmada depois que você marca manualmente como recebida.
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <Stat label="Hoje (estimado)"   value={brl(totals.estDay)}   hint={`Confirmado: ${brl(totals.confDay)}`} />
          <Stat label="Semana (estimado)" value={brl(totals.estWeek)}  hint={`Confirmado: ${brl(totals.confWeek)}`} />
          <Stat label="Mês (estimado)"    value={brl(totals.estMonth)} hint={`Confirmado: ${brl(totals.confMonth)}`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <Stat label="Produtos (mês)"   value={brl(totals.productsMonth)} hint="Soma dos subtotais" />
          <Stat label="Entregas (mês)"   value={brl(totals.deliveryMonth)} hint="Soma das taxas de entrega" />
          <Stat label="Entregas (total)" value={brl(totals.deliveryTotal)} hint="Receita separada para conciliar com motoboys" />
        </div>

        <div className="grid gap-3 sm:grid-cols-4 mb-4">
          <Stat label="Pedidos enviados" value={String(totals.count)} />
          <Stat label="Confirmados"      value={String(totals.conf)} />
          <Stat label="Cancelados"       value={String(totals.canc)} />
          <Stat label="Ticket médio est." value={brl(totals.ticketEst)} hint={`Confirmado: ${brl(totals.ticketConf)}`} />
        </div>

        <h3 className="text-sm font-semibold mb-2">Pedidos recentes</h3>
        <div className="space-y-2">
          {orders.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>}
          {orders.map(o => {
            const m = marks[o.id];
            const status = m?.paid_status ?? "pendente";
            return (
              <div key={o.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.customer_name ?? "Cliente"}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.tracking_code} · {new Date(o.created_at).toLocaleString()} · {o.payment_method ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                    <Badge variant={status === "recebido" ? "default" : status === "cancelado" ? "destructive" : "secondary"} className="text-[10px]">
                      {status === "recebido" ? "Pagamento registrado" : status === "cancelado" ? "Cancelado" : "Aguardando confirmação"}
                    </Badge>
                    <span className="font-semibold">{brl(Number(o.total))}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => mark(o.id, "recebido", o.payment_method ?? "outro")}>Registrar pagamento</Button>
                  <Button size="sm" variant="ghost" onClick={() => mark(o.id, "pendente")}>Marcar pendente</Button>
                  <Button size="sm" variant="ghost" onClick={() => mark(o.id, "cancelado")}>Cancelar</Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          <strong>Financeiro avançado:</strong> relatórios em PDF, conciliação por forma de pagamento e ticket por região aparecem no plano <strong>Gestão Premium</strong>.
        </div>
      </Gated>
    </PainelSection>
  );
}
