import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, BellDot, Loader2, Package, MessageSquare } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function NotificationCenter() {
  const { data: notifications, isLoading, markAsRead } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.read_at).length || 0;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (n: any) => {
    const orderId =
      n?.type === "new_order_message" || n?.type === "order_chat_message"
        ? (n?.data?.order_id as string | undefined)
        : undefined;
    if (!n.read_at) markAsRead.mutate(n.id);
    if (orderId) {
      setOpen(false);
      navigate(`/minha-conta/pedidos/${orderId}`);
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
            <span className="text-[10px] text-muted-foreground uppercase font-medium">
              {unreadCount} novas
            </span>
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
                      {(n.type === "new_order_message" || n.type === "order_chat_message") ? <MessageSquare className="size-4" /> : <Package className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs mb-0.5">{n.title ?? ""}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.message ?? ""}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {n.created_at ? format(new Date(n.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR }) : ""}
                        </span>
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
