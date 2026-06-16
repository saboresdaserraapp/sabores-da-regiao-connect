import { useState } from "react";
import { useOrderMessages } from "@/hooks/useOrderMessages";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Loader2, Send, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface OrderChatProps {
  orderId: string;
  senderType: "customer" | "business" | "system";
  establishmentId?: string;
}

export function OrderChat({ orderId, senderType, establishmentId }: OrderChatProps) {
  const [msg, setMsg] = useState("");
  const { data: messages, isLoading, isError, sendMessage, refetch } = useOrderMessages(orderId);

  const handleSend = () => {
    if (!msg.trim() || sendMessage.isPending) return;
    sendMessage.mutate({ message: msg, senderType, establishmentId }, {
      onSuccess: () => setMsg(""),
    });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (isError) return <div className="p-4 text-center text-red-500">Erro ao carregar mensagens.</div>;

  return (
    <div className="flex flex-col h-[400px] border border-border/70 rounded-xl bg-background overflow-hidden shadow-sm">
      <div className="p-3 border-b border-border/60 flex justify-between items-center bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
        <h3 className="font-semibold text-sm">Chat do Pedido</h3>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages?.map((m) => {
            const isMe = m.sender_type === senderType;
            const isSystem = m.sender_type === "system";

            if (isSystem) {
              return (
                <div key={m.id} className="text-center">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground uppercase">
                    {m.message}
                  </span>
                </div>
              );
            }

            return (
              <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                )}>
                  {m.message}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {format(new Date(m.created_at), "HH:mm", { locale: ptBR })}
                </span>
              </div>
            );
          })}
          {messages?.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma mensagem ainda.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/60 bg-muted/20 flex gap-2 safe-bottom">
        <Input 
          placeholder="Digite sua mensagem..." 
          value={msg} 
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!msg.trim() || sendMessage.isPending}>
          {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
