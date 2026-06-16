import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, ImageIcon, ChevronDown, ChevronUp, Smartphone, AlertTriangle, CheckCircle2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { OrderReferencesPanel } from "@/components/orders/OrderReferencesPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const STATUS_OPTIONS: { value: string; label: string; tone?: string }[] = [
  { value: "waiting_business_confirmation", label: "Aguardando confirmação" },
  { value: "confirmed_by_business",         label: "Confirmado pela loja" },
  { value: "preparing",                     label: "Em preparo" },
  { value: "ready_for_pickup",              label: "Pronto para retirada" },
  { value: "out_for_delivery",              label: "Saiu para entrega" },
  { value: "delivered",                     label: "Entregue" },
  { value: "canceled_by_business",          label: "Cancelado pela loja" },
  { value: "customer_not_responding",       label: "Cliente não respondeu" },
  { value: "difficult_address",             label: "Endereço difícil" },
  { value: "needs_more_reference",          label: "Precisa de referência" },
];

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]));

type Order = {
  id: string; tracking_code: string | null; customer_name: string | null; customer_phone: string | null;
  total: number; subtotal: number; delivery_fee: number; status: string; created_at: string;
  payment_method: string | null; notes: string | null; items: any; address_id: string | null;
  assigned_driver_name: string | null; driver_reference_sent_at: string | null;
  payment_status: string | null; payment_paid_at: string | null;
};

const KANBAN_GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "new",       label: "Novos",                statuses: ["waiting_business_confirmation"] },
  { key: "confirmed", label: "Confirmados",          statuses: ["confirmed_by_business"] },
  { key: "preparing", label: "Em preparo / Prontos", statuses: ["preparing", "ready_for_pickup"] },
  { key: "delivery",  label: "Em entrega",           statuses: ["out_for_delivery"] },
  { key: "done",      label: "Finalizados",          statuses: ["delivered", "canceled_by_business", "canceled_by_customer", "not_completed"] },
];

const STAGNANT_MIN = 30;
function isStagnant(o: Order) {
  if (o.status !== "waiting_business_confirmation") return false;
  const mins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
  return mins >= STAGNANT_MIN;
}

export default function Pedidos() {
  const { ctx } = useActiveEstablishment();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  async function refresh() {
    if (!ctx) return;
    const { data } = await supabase.from("orders")
      .select("id,tracking_code,customer_name,customer_phone,total,subtotal,delivery_fee,status,created_at,payment_method,notes,items,address_id,assigned_driver_name,driver_reference_sent_at,payment_status,payment_paid_at")
      .eq("establishment_id", ctx.establishmentId)
      .order("created_at", { ascending: false }).limit(100);
    setOrders((data ?? []) as any);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ctx?.establishmentId]);

  async function updateStatus(o: Order, status: string) {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status atualizado");
    refresh();
  }

  async function markPaid(o: Order) {
    const { error } = await supabase.from("orders").update({
      payment_status: "paid",
      payment_paid_at: new Date().toISOString(),
      payment_received_method: o.payment_method,
    } as any).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento registrado");
    refresh();
  }

  function openWhats(o: Order) {
    if (!o.customer_phone) { toast.error("Sem telefone do cliente"); return; }
    const num = o.customer_phone.replace(/\D/g, "");
    
    // Header do pedido
    let msgStr = `*Pedido ${o.tracking_code ?? ""}*\n`;
    msgStr += `Cliente: ${o.customer_name ?? ""}\n`;
    msgStr += `Status atual: ${STATUS_LABEL[o.status] ?? o.status}\n\n`;
    
    // Itens do pedido
    if (o.items && Array.isArray(o.items)) {
      msgStr += `*Itens:*\n`;
      o.items.forEach((item: any) => {
        msgStr += `• ${item.quantity}x ${item.name} (R$ ${Number(item.price * item.quantity).toFixed(2)})\n`;
        if (item.options && Array.isArray(item.options)) {
          item.options.forEach((opt: any) => {
            msgStr += `  └ ${opt.name}${opt.price > 0 ? ` (+R$ ${Number(opt.price).toFixed(2)})` : ""}\n`;
          });
        }
      });
      msgStr += `\n`;
    }

    if (o.notes) msgStr += `*Observação:* ${o.notes}\n\n`;

    // Valores
    msgStr += `*Subtotal:* R$ ${Number(o.subtotal).toFixed(2)}\n`;
    msgStr += `*Taxa de entrega:* R$ ${Number(o.delivery_fee).toFixed(2)}\n`;
    msgStr += `*TOTAL ESTIMADO:* R$ ${Number(o.total).toFixed(2)}\n\n`;
    msgStr += `*Forma de pagamento:* ${o.payment_method ?? "A combinar"}\n\n`;
    msgStr += `_Por favor, confirme se os itens e valores acima estão corretos._`;

    const msg = encodeURIComponent(msgStr);
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  }

  if (!ctx) return null;
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const stagnantCount = orders.filter(isStagnant).length;

  const renderCard = (o: Order) => (
    <div key={o.id} className={`rounded-xl border p-3 text-sm transition-shadow hover:shadow-sm ${isStagnant(o) ? "border-red-300 bg-red-50/40" : "border-border/70"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-1">
            {isStagnant(o) && <AlertTriangle className="size-3.5 text-red-600" />}
            {o.customer_name ?? "Cliente"} · <span className="text-xs text-muted-foreground">{o.customer_phone ?? "—"}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {o.tracking_code} · {new Date(o.created_at).toLocaleString()} · {o.payment_method ?? "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[o.status] ?? o.status}</Badge>
          {o.payment_status === "paid" ? (
            <Badge className="bg-emerald-600 text-[10px]">Pago</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">A receber</Badge>
          )}
          <span className="font-semibold">R$ {Number(o.total).toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Subtotal R$ {Number(o.subtotal).toFixed(2)} · Taxa estimada R$ {Number(o.delivery_fee).toFixed(2)}
        {o.notes && <> · Obs: {o.notes}</>}
        {o.assigned_driver_name && (
          <div className="mt-1 text-[10px] text-primary font-medium flex items-center gap-1">
            <Smartphone className="size-3" /> Motoboy: {o.assigned_driver_name}
            {o.driver_reference_sent_at && <span className="text-muted-foreground">(Enviado {new Date(o.driver_reference_sent_at).toLocaleTimeString()})</span>}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
          <SelectTrigger className="h-8 text-xs w-[210px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => openWhats(o)}><MessageCircle className="size-3.5 mr-1" /> WhatsApp</Button>
        {o.payment_status !== "paid" && (
          <Button size="sm" variant="outline" className="text-emerald-700" onClick={() => markPaid(o)}>
            <CheckCircle2 className="size-3.5 mr-1" /> Marcar pago
          </Button>
        )}
        {o.address_id && (
          <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10"
            onClick={() => setExpandedRef(expandedRef === o.id ? null : o.id)}>
            <ImageIcon className="size-3.5 mr-1" /> Referências
            {expandedRef === o.id ? <ChevronUp className="size-3.5 ml-1" /> : <ChevronDown className="size-3.5 ml-1" />}
          </Button>
        )}
      </div>
      {expandedRef === o.id && o.address_id && (
        <div className="mt-4"><OrderReferencesPanel orderId={o.id} /></div>
      )}
    </div>
  );

  return (
    <PainelSection
      title="Pedidos pelo WhatsApp"
      subtitle="Pedidos recebidos são intenção de compra. Confirme cada um manualmente após contato com o cliente."
      action={
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      }
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 text-pretty mb-4 shadow-sm">
        ⚠️ Pedido enviado ao WhatsApp <strong>não é venda confirmada</strong>. Use os status abaixo para registrar o andamento real.
      </div>
      {stagnantCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 mb-4 shadow-sm flex items-center gap-2">
          <AlertTriangle className="size-4" />
          <span><strong>{stagnantCount}</strong> pedido(s) aguardando confirmação há mais de {STAGNANT_MIN} min.</span>
        </div>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="list"><List className="size-3.5 mr-1" /> Lista</TabsTrigger>
          <TabsTrigger value="kanban"><LayoutGrid className="size-3.5 mr-1" /> Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido neste filtro.</p>
          ) : (
            <div className="space-y-2">{filtered.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {KANBAN_GROUPS.map(group => {
              const items = orders.filter(o => group.statuses.includes(o.status));
              return (
                <div key={group.key} className="rounded-xl bg-muted/30 p-2 min-h-[120px]">
                  <div className="px-2 pb-2 pt-1 flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider">{group.label}</div>
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground italic px-2 py-3">Vazio</div>
                    ) : items.map(renderCard)}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </PainelSection>
  );
}
