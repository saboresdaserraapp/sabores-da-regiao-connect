import { useEffect, useRef, useState } from "react";
import { useChatMessages, useSendChatMessage, type SupportChat } from "@/hooks/useSupportChat";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { ActorRole } from "@/hooks/useSupportTickets";

export function ChatPanel({
  chat,
  senderRole,
  headerExtra,
}: {
  chat: SupportChat;
  senderRole: ActorRole;
  headerExtra?: React.ReactNode;
}) {
  const { user } = useAuth();
  const { data: messages = [] } = useChatMessages(chat.id);
  const send = useSendChatMessage();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const onSend = async () => {
    const m = text.trim();
    if (!m || chat.status === "closed") return;
    try {
      await send.mutateAsync({ chat_id: chat.id, message: m, sender_role: senderRole });
      setText("");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar");
    }
  };

  const statusLabel =
    chat.status === "waiting" ? "Aguardando atendente" :
    chat.status === "active" ? "Em atendimento" : "Encerrado";

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-3 flex items-center justify-between gap-2">
        <div>
          <div className="font-medium text-sm">{chat.topic || "Suporte rápido"}</div>
          <Badge variant="outline" className="mt-1">{statusLabel}</Badge>
        </div>
        {headerExtra}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            {chat.status === "waiting" ? "Envie sua primeira mensagem. Um atendente entrará em contato." : "Sem mensagens."}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                <div className="text-[10px] opacity-70 mb-0.5">
                  {m.sender_role === "admin" ? "Suporte" : m.sender_role === "establishment" ? "Loja" : m.sender_role === "system" ? "Sistema" : "Você"}
                </div>
                <div className="whitespace-pre-wrap">{m.message}</div>
              </div>
            </div>
          );
        })}
      </div>
      {chat.status !== "closed" && (
        <div className="border-t p-2 flex items-end gap-2">
          <Textarea
            rows={2}
            placeholder="Mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          />
          <Button size="sm" onClick={onSend} disabled={send.isPending || !text.trim()}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}