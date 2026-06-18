import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, BellDot, Loader2, Package, MessageSquare, LifeBuoy, Ticket } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyEstablishmentIds } from "@/hooks/useMyEstablishmentIds";

const ORDER_TYPES = new Set([
  "new_order",
  "new_order_message",
  "order_chat_message",
  "order_status_update",
  "order_delivery_fee_proposal",
  "order_delivery_fee_accepted",
  "order_delivery_fee_rejected",
]);
const SUPPORT_CHAT_USER_TYPES = new Set([
  "support_chat_reply",
  "support_chat_message",
  "support_chat_assigned",
  "support_chat_closed",
]);
const TICKET_USER_TYPES = new Set(["support_ticket_reply", "support_ticket_status_changed"]);

// Tipos que SEMPRE são direcionados à loja, independente do destinatário
const STORE_ONLY_TYPES = new Set([
  "new_order",
  "support_chat_waiting",
  "support_ticket_created",
]);

function iconFor(type: string | null | undefined) {
  if (!type) return <Package className="size-4" />;
  if (ORDER_TYPES.has(type)) return <MessageSquare className="size-4" />;
  if (SUPPORT_CHAT_USER_TYPES.has(type) || type === "support_chat_waiting") return <LifeBuoy className="size-4" />;
  if (TICKET_USER_TYPES.has(type) || type === "support_ticket_created") return <Ticket className="size-4" />;
  return <Package className="size-4" />;
}

export function NotificationCenter() {
  const { data: notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { data: myEstablishments } = useMyEstablishmentIds();

  const isStoreContext =
    location.pathname.startsWith("/minha-loja") || location.pathname.startsWith("/admin");
  const [tab, setTab] = useState<"cliente" | "loja">(isStoreContext ? "loja" : "cliente");

  const bucketFor = (n: any): "cliente" | "loja" => {
    const type = n?.type as string | undefined;
    const data = n?.data ?? {};
    const estId = n?.related_establishment_id ?? n?.establishment_id ?? data.establishment_id;
    const isMine = !!estId && (myEstablishments ?? []).includes(estId);
    if (type && STORE_ONLY_TYPES.has(type)) return "loja";
    // Para todas as outras notificações de pedido/chat/ticket: classificamos
    // pelo destinatário real — se a notificação está vinculada a uma loja
    // gerenciada pelo usuário, vai para a aba "Loja"; caso contrário "Cliente".
    return isMine ? "loja" : "cliente";
  };

  const clienteList = (notifications ?? []).filter((n) => bucketFor(n) === "cliente");
  const lojaList = (notifications ?? []).filter((n) => bucketFor(n) === "loja");
  const unreadCliente = clienteList.filter((n) => !n.read_at).length;
  const unreadLoja = lojaList.filter((n) => !n.read_at).length;
  const unreadCount = unreadCliente + unreadLoja;

  const routeFor = (n: any): string | null => {
    const type = n?.type as string | undefined;
    const data = n?.data ?? {};
    const estId = n?.related_establishment_id ?? n?.establishment_id ?? data.establishment_id;
    const orderId = n?.related_order_id ?? data.order_id;
    const chatId = n?.related_support_chat_id ?? data.chat_id;
    const ticketId = n?.related_ticket_id ?? data.ticket_id;
    const isMyEstablishment = !!estId && (myEstablishments ?? []).includes(estId);

    if (type && ORDER_TYPES.has(type) && orderId) {
      // Roteia pelo destinatário real: se a notificação pertence a uma loja
      // gerenciada pelo usuário, abre o painel da loja. Caso contrário, abre
      // a tela do cliente. Isso garante que o mesmo usuário (dono + cliente)
      // veja cada notificação na tela correta.
      if (isMyEstablishment && estId) {
        return `/minha-loja/${estId}/pedidos/${orderId}`;
      }
      return `/minha-conta/pedidos/${orderId}`;
    }
    if (type === "support_chat_waiting") {
      return isAdmin ? "/admin/suporte/chats" : null;
    }
    if (type && SUPPORT_CHAT_USER_TYPES.has(type)) {
      if (isAdmin && chatId) return `/admin/suporte/chats/${chatId}`;
      return isMyEstablishment && estId
        ? `/minha-loja/${estId}/suporte/chat`
        : "/minha-conta/suporte/chat";
    }
    if (type === "support_ticket_created" && ticketId) {
      return isAdmin ? `/admin/suporte/tickets/${ticketId}` : null;
    }
    if (type && TICKET_USER_TYPES.has(type) && ticketId) {
      if (isAdmin) return `/admin/suporte/tickets/${ticketId}`;
      return isMyEstablishment && estId
        ? `/minha-loja/${estId}/suporte/tickets/${ticketId}`
        : `/minha-conta/suporte/tickets/${ticketId}`;
    }
    return null;
  };

  const handleClick = (n: any) => {
    if (!n.read_at) markAsRead.mutate(n.id);
    const route = routeFor(n);
    if (route) {
      setOpen(false);
      navigate(route);
    } else {
      const isOrderType = ORDER_TYPES.has(n?.type ?? "");
      if (isOrderType) {
        // eslint-disable-next-line no-console
        console.warn("[NotificationCenter] unable to resolve route", {
          type: n?.type,
          related_order_id: n?.related_order_id,
          related_establishment_id: n?.related_establishment_id,
          data: n?.data,
        });
      }
    }
  };

  const markBucketAsRead = (bucket: "cliente" | "loja") => {
    const list = bucket === "cliente" ? clienteList : lojaList;
    list.filter((n) => !n.read_at).forEach((n) => markAsRead.mutate(n.id));
  };

  const renderList = (list: any[]) => (
    <ScrollArea className="h-[350px]">
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nenhuma notificação por enquanto.
        </div>
      ) : (
        <div className="divide-y">
          {list.map((n) => (
            <div
              key={n.id}
              className={cn(
                "p-3 text-sm transition-colors hover:bg-muted/50 relative cursor-pointer",
                !n.read_at && "bg-primary/5"
              )}
              onClick={() => handleClick(n)}
            >
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {iconFor(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs mb-0.5">{n.title ?? ""}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{n.message ?? ""}</div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {n.created_at ? format(new Date(n.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR }) : ""}
                    </span>
                    {(() => {
                      const route = routeFor(n);
                      const isOrder = ORDER_TYPES.has(n.type ?? "");
                      if (isOrder && !route) {
                        return <span className="text-[10px] text-muted-foreground italic">Pedido não disponível</span>;
                      }
                      if (route) {
                        const label = isOrder
                          ? "Ver pedido"
                          : TICKET_USER_TYPES.has(n.type ?? "") || n.type === "support_ticket_created"
                          ? "Ver ticket"
                          : "Abrir";
                        return <span className="text-[10px] font-medium text-primary">{label} →</span>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              {!n.read_at && <div className="absolute top-3 right-3 size-2 bg-primary rounded-full" />}
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          {unreadCount > 0 ? <BellDot className="size-5 text-primary" /> : <Bell className="size-5" />}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 size-4 p-0 flex items-center justify-center text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "cliente" | "loja")}>
          <div className="p-3 border-b border-border/60 bg-muted/40 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Notificações</h3>
              {((tab === "cliente" ? unreadCliente : unreadLoja) > 0) && (
                <button
                  onClick={() => markBucketAsRead(tab)}
                  className="text-[10px] text-primary uppercase font-medium hover:underline"
                >
                  Marcar como lidas
                </button>
              )}
            </div>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="cliente" className="text-xs gap-1.5">
                Cliente
                {unreadCliente > 0 && (
                  <Badge className="h-4 min-w-4 px-1 text-[10px]">{unreadCliente}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="loja" className="text-xs gap-1.5">
                Loja
                {unreadLoja > 0 && (
                  <Badge className="h-4 min-w-4 px-1 text-[10px]">{unreadLoja}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="cliente" className="m-0">{renderList(clienteList)}</TabsContent>
          <TabsContent value="loja" className="m-0">{renderList(lojaList)}</TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
