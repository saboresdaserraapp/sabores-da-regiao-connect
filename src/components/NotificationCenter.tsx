import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, BellDot, Loader2, Package, MessageSquare, LifeBuoy, Ticket } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyEstablishmentIds } from "@/hooks/useMyEstablishmentIds";

const ORDER_TYPES = new Set([
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

function iconFor(type: string | null | undefined) {
  if (!type) return <Package className="size-4" />;
  if (ORDER_TYPES.has(type)) return <MessageSquare className="size-4" />;
  if (SUPPORT_CHAT_USER_TYPES.has(type) || type === "support_chat_waiting") return <LifeBuoy className="size-4" />;
  if (TICKET_USER_TYPES.has(type) || type === "support_ticket_created") return <Ticket className="size-4" />;
  return <Package className="size-4" />;
}

export function NotificationCenter() {
  const { data: notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.read_at).length || 0;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: myEstablishments } = useMyEstablishmentIds();

  const routeFor = (n: any): string | null => {
    const type = n?.type as string | undefined;
    const data = n?.data ?? {};
    const estId = n?.related_establishment_id ?? n?.establishment_id ?? data.establishment_id;
    const orderId = n?.related_order_id ?? data.order_id;
    const chatId = n?.related_support_chat_id ?? data.chat_id;
    const ticketId = n?.related_ticket_id ?? data.ticket_id;
    const isMyEstablishment = !!estId && (myEstablishments ?? []).includes(estId);

    if (type && ORDER_TYPES.has(type) && orderId) {
      return isMyEstablishment && estId
        ? `/minha-loja/${estId}/pedidos/${orderId}`
        : `/minha-conta/pedidos/${orderId}`;
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
    }
  };

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
        <div className="p-3 border-b border-border/60 bg-muted/40 flex justify-between items-center">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              className="text-[10px] text-primary uppercase font-medium hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : notifications?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma notificação por enquanto.
            </div>
          ) : (
            <div className="divide-y">
              {notifications?.map((n) => (
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
      </PopoverContent>
    </Popover>
  );
}
