import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, ImageIcon, ChevronDown, ChevronUp, Smartphone, AlertTriangle, CheckCircle2, LayoutGrid, List, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { OrderReferencesPanel } from "@/components/orders/OrderReferencesPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderFreteActions, flowStatusBadge, requiresCustomerAcceptance } from "@/components/orders/OrderFreteActions";
import { useOrderUnreadCountsForBusiness } from "@/hooks/useOrderUnreadCounts";

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
  final_delivery_fee?: number | null; final_total?: number | null;
  confirmation_flow_status?: string | null; current_confirmation_proposal_id?: string | null;
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

function formatPhoneBR(raw: string | null) {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}
function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
function relativeTime(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  return `há ${days}d`;
}

export default function Pedidos() {
  const { ctx } = useActiveEstablishment();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const { data: unreadMap } = useOrderUnreadCountsForBusiness(ctx?.establishmentId);
  const unread = (id: string) => unreadMap?.[id] ?? 0;

  async function refresh() {
    if (!ctx) return;
    const { data } = await supabase.from("orders")
      .select("id,tracking_code,customer_name,customer_phone,total,subtotal,delivery_fee,status,created_at,payment_method,notes,items,address_id,assigned_driver_name,driver_reference_sent_at,payment_status,payment_paid_at,final_delivery_fee,final_total,confirmation_flow_status,current_confirmation_proposal_id")
      .eq("establishment_id", ctx.establishmentId)
      .order("created_at", { ascending: false }).limit(100);
    setOrders((data ?? []) as any);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ctx?.establishmentId]);

  const BLOCKED_WITHOUT_ACCEPTANCE = new Set([
    "confirmed_by_business",
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered",
  ]);

  async function updateStatus(o: Order, status: string) {
    if (
      BLOCKED_WITHOUT_ACCEPTANCE.has(status) &&
      requiresCustomerAcceptance({ addressId: o.address_id, flowStatus: o.confirmation_flow_status })
    ) {
      toast.error(
        "Antes de confirmar este pedido, defina o valor final da entrega e aguarde o aceite do cliente."
      );
      return;
    }
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
    msgStr += `*Taxa de entrega estimada:* R$ ${Number(o.delivery_fee).toFixed(2)}\n`;
    if (o.final_delivery_fee != null) {
      msgStr += `*Taxa de entrega final:* R$ ${Number(o.final_delivery_fee).toFixed(2)}\n`;
    }
    if (o.final_total != null) {
      msgStr += `*TOTAL FINAL:* R$ ${Number(o.final_total).toFixed(2)}\n\n`;
    } else {
      msgStr += `*TOTAL ESTIMADO:* R$ ${Number(o.total).toFixed(2)}\n\n`;
    }
    msgStr += `*Forma de pagamento:* ${o.payment_method ?? "A combinar"}\n\n`;
    if (o.confirmation_flow_status === "proposal_sent_to_customer") {
      msgStr += `_Enviamos a proposta com o valor final pelo app. Confirme por lá ou responda aqui se está de acordo._\n`;
      msgStr += `_A taxa pode variar conforme endereço, acesso, distância, estrada ruim, chuva ou outras adversidades._`;
    } else {
      msgStr += `_Por favor, confirme se os itens e valores acima estão corretos._`;
    }

    const msg = encodeURIComponent(msgStr);
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  }

  if (!ctx) return null;
  let filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  if (onlyUnread) filtered = filtered.filter(o => unread(o.id) > 0);
  const stagnantCount = orders.filter(isStagnant).length;

  const renderKanbanCard = (o: Order) => (
    <div
      key={o.id}
      className={`w-full rounded-xl border bg-card p-2.5 text-sm shadow-sm transition-shadow hover:shadow-md ${
        unread(o.id) > 0 ? "border-primary ring-1 ring-primary/30" :
        isStagnant(o) ? "border-red-300 bg-red-50/50" : "border-border/70"
      }`}
    >
      {/* Top row: tracking + total */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
          {o.tracking_code ?? o.id.slice(0, 8)}
        </span>
        <div className="flex items-center gap-1.5">
          {unread(o.id) > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] font-medium gap-1 bg-primary">
              <MessageSquare className="size-3" /> {unread(o.id)}
            </Badge>
          )}
          <span className="text-sm font-bold tabular-nums">R$ {Number(o.total).toFixed(2)}</span>
        </div>
      </div>

      {/* Customer */}
      <div className="mt-1 flex items-center gap-1">
        {isStagnant(o) && <AlertTriangle className="size-3.5 shrink-0 text-red-600" />}
        <div className="truncate text-sm font-semibold">{o.customer_name ?? "Cliente"}</div>
      </div>
      <div className="truncate text-[11px] text-muted-foreground">
        {formatPhoneBR(o.customer_phone)} · {o.payment_method ?? "—"}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {shortDate(o.created_at)} <span className="opacity-70">· {relativeTime(o.created_at)}</span>
      </div>

      {/* Divider */}
      <div className="my-2 h-px bg-border/70" />

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
          {STATUS_LABEL[o.status] ?? o.status}
        </Badge>
        {o.payment_status === "paid" ? (
          <Badge className="bg-emerald-600 text-[10px] px-1.5 py-0 font-normal">Pago</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">A receber</Badge>
        )}
        {(() => {
          const fb = flowStatusBadge(o.confirmation_flow_status);
          return fb ? (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-normal ${fb.className}`}>{fb.label}</Badge>
          ) : null;
        })()}
      </div>

      {/* Money breakdown */}
      <div className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
        Sub R$ {Number(o.subtotal).toFixed(2)} · Taxa est R$ {Number(o.delivery_fee).toFixed(2)}
        {o.final_delivery_fee != null && (
          <> · <span className="text-foreground font-medium">Final R$ {Number(o.final_delivery_fee).toFixed(2)}</span></>
        )}
      </div>

      {o.notes && (
        <div className="mt-1 text-[11px] text-foreground/80 line-clamp-2">
          <span className="font-medium">Obs:</span> {o.notes}
        </div>
      )}

      {o.assigned_driver_name && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-primary">
          <Smartphone className="size-3" /> {o.assigned_driver_name}
          {o.driver_reference_sent_at && (
            <span className="text-muted-foreground font-normal">
              · {new Date(o.driver_reference_sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="my-2 h-px bg-border/70" />

      {/* Actions */}
      <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
        <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className={`mt-1.5 grid gap-1.5 ${o.payment_status !== "paid" ? "grid-cols-2" : "grid-cols-1"}`}>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openWhats(o)}>
          <MessageCircle className="size-3.5 mr-1" /> WhatsApp
        </Button>
        {o.payment_status !== "paid" && (
          <Button size="sm" variant="outline" className="h-8 text-xs text-emerald-700" onClick={() => markPaid(o)}>
            <CheckCircle2 className="size-3.5 mr-1" /> Pago
          </Button>
        )}
      </div>

      {o.address_id && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <OrderFreteActions
            orderId={o.id}
            establishmentId={ctx!.establishmentId}
            subtotal={o.subtotal}
            deliveryFee={o.final_delivery_fee ?? o.delivery_fee}
            flowStatus={o.confirmation_flow_status}
            onChanged={refresh}
          />
        </div>
      )}

      {o.address_id && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 h-8 w-full text-xs text-primary hover:bg-primary/10"
          onClick={() => setExpandedRef(expandedRef === o.id ? null : o.id)}
        >
          <ImageIcon className="size-3.5 mr-1" /> Referências
          {expandedRef === o.id ? <ChevronUp className="size-3.5 ml-1" /> : <ChevronDown className="size-3.5 ml-1" />}
        </Button>
      )}
      {expandedRef === o.id && o.address_id && (
        <div className="mt-2"><OrderReferencesPanel orderId={o.id} /></div>
      )}
    </div>
  );

  const renderCard = (o: Order) => (
    <div key={o.id} className={`rounded-xl border p-3 text-sm transition-shadow hover:shadow-sm ${
        unread(o.id) > 0 ? "border-primary ring-1 ring-primary/30" :
        isStagnant(o) ? "border-red-300 bg-red-50/40" : "border-border/70"
      }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-1">
            {isStagnant(o) && <AlertTriangle className="size-3.5 text-red-600" />}
            {o.customer_name ?? "Cliente"} · <span className="text-xs text-muted-foreground">{o.customer_phone ?? "—"}</span>
            {unread(o.id) > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] gap-1 bg-primary ml-1">
                <MessageSquare className="size-3" /> {unread(o.id)}
              </Badge>
            )}
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
          {(() => {
            const fb = flowStatusBadge(o.confirmation_flow_status);
            return fb ? (
              <Badge variant="outline" className={`text-[10px] ${fb.className}`}>{fb.label}</Badge>
            ) : null;
          })()}
          <span className="font-semibold">R$ {Number(o.final_total ?? o.total).toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Subtotal R$ {Number(o.subtotal).toFixed(2)} · Taxa estimada R$ {Number(o.delivery_fee).toFixed(2)}
        {o.final_delivery_fee != null && (
          <> · <span className="text-foreground font-medium">Taxa final R$ {Number(o.final_delivery_fee).toFixed(2)}</span></>
        )}
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
          <OrderFreteActions
            orderId={o.id}
            establishmentId={ctx!.establishmentId}
            subtotal={o.subtotal}
            deliveryFee={o.final_delivery_fee ?? o.delivery_fee}
            flowStatus={o.confirmation_flow_status}
            onChanged={refresh}
          />
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={onlyUnread ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setOnlyUnread(v => !v)}
          >
            <MessageSquare className="size-3.5 mr-1" /> Não lidas
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x -mx-1 px-1">
            {KANBAN_GROUPS.map(group => {
              const items = orders.filter(o => group.statuses.includes(o.status));
              return (
                <div
                  key={group.key}
                  className="flex-1 min-w-[280px] max-w-[320px] snap-start rounded-2xl bg-muted/40 p-2 flex flex-col max-h-[calc(100vh-280px)]"
                >
                  <div className="sticky top-0 z-[1] flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 backdrop-blur">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">{group.label}</div>
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="mt-1 space-y-2 overflow-y-auto pr-0.5">
                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-[11px] text-muted-foreground">
                        Sem pedidos
                      </div>
                    ) : items.map(renderKanbanCard)}
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
