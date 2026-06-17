import { useEffect, useRef } from "react";
import { useOrderMessages } from "@/hooks/useOrderMessages";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ChatComposer } from "./support/ChatComposer";
import { AttachmentList } from "./support/AttachmentList";

interface OrderChatProps {
  orderId: string;
  senderType: "customer" | "business" | "system";
  establishmentId?: string;
  title?: string;
  quickReplies?: string[];
  disabled?: boolean;
  disabledMessage?: string;
}

export function OrderChat({
  orderId,
  senderType,
  establishmentId,
  title = "Chat do Pedido",
  quickReplies,
  disabled = false,
  disabledMessage,
}: OrderChatProps) {
  const { data: messages, isLoading, isError, sendMessage, refetch, markAsRead } = useOrderMessages(orderId);
  const lastMarkedCount = useRef(0);

  useEffect(() => {
    const count = messages?.length ?? 0;
    if (count > 0 && count !== lastMarkedCount.current) {
      lastMarkedCount.current = count;
      markAsRead.mutate();
    }
  }, [messages, markAsRead]);

  const handleQuick = (text: string) => {
    const value = text.trim();
    if (!value || sendMessage.isPending) return;
    sendMessage.mutate({ message: value, senderType, establishmentId });
  };
  const handleSend = async (text: string, attachments: unknown[]) => {
    const value = text.trim();
    if (!value && attachments.length === 0) return;
    await sendMessage.mutateAsync({
      message: value || "(anexo)",
      senderType,
      establishmentId,
      attachments,
    });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (isError) return <div className="p-4 text-center text-red-500">Erro ao carregar mensagens.</div>;

  return (
    <div className="flex flex-col h-[400px] border border-border/70 rounded-xl bg-background overflow-hidden shadow-sm">
      <div className="p-3 border-b border-border/60 flex justify-between items-center bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages?.map((m) => {
            const isMe = m.sender_type === senderType;
            const isSystem = m.sender_type === "system";
            const text = typeof m.message === "string" ? m.message : "";
            const createdAt = m.created_at ? new Date(m.created_at) : null;
            const attachments = (m as { attachments?: unknown }).attachments;

            if (isSystem) {
              return (
                <div key={m.id} className="text-center">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground uppercase">
                    {text}
                  </span>
                </div>
              );
            }

            const label = isMe
              ? "Você"
              : senderType === "customer"
                ? "Loja"
                : "Cliente";
            const otherBubble = senderType === "customer"
              ? "bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-50 dark:border-amber-800"
              : "bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-50 dark:border-emerald-800";
            return (
              <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : `${otherBubble} rounded-tl-none`
                )}>
                  <div className="text-[10px] font-medium opacity-80 mb-0.5">{label}</div>
                  {text && text !== "(anexo)" && (
                    <div className="whitespace-pre-wrap break-words">{text}</div>
                  )}
                  <AttachmentList attachments={attachments} />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {createdAt ? format(createdAt, "HH:mm", { locale: ptBR }) : ""}
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

      {disabled ? (
        <div className="p-3 border-t border-border/60 bg-muted/30 text-xs text-muted-foreground text-center safe-bottom">
          {disabledMessage ?? "Este pedido foi finalizado. Para problemas, abra um ticket de suporte."}
        </div>
      ) : (
        <div className="border-t border-border/60 bg-muted/20 safe-bottom">
          {quickReplies && quickReplies.length > 0 && (
            <div className="px-3 pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Mensagens rápidas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-w-[320px]">
                  {quickReplies.map((q) => (
                    <DropdownMenuItem
                      key={q}
                      onSelect={() => handleQuick(q)}
                      className="text-xs whitespace-normal"
                    >
                      {q}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <div className="p-3">
            <ChatComposer
              scope="order"
              scopeId={orderId}
              onSend={handleSend}
              placeholder="Digite sua mensagem..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
