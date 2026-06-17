import { useEffect, useRef } from "react";
import { useChatMessages, useSendChatMessage, useChatQueuePosition, type SupportChat } from "@/hooks/useSupportChat";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ActorRole } from "@/hooks/useSupportTickets";
import { ChatComposer } from "./ChatComposer";
import { AttachmentList } from "./AttachmentList";
import { roleBubbleClass, roleLabel, roleAlign } from "./chatBubbleStyles";

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
  const { data: queuePos } = useChatQueuePosition(chat);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const onSend = async (message: string, attachments: unknown[]) => {
    if (chat.status === "closed") return;
    const m = message.trim();
    if (!m && attachments.length === 0) return;
    try {
      await send.mutateAsync({
        chat_id: chat.id,
        message: m || "(anexo)",
        sender_role: senderRole,
        attachments,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao enviar";
      toast.error(msg);
      throw e;
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
      {chat.status === "waiting" && senderRole !== "admin" && (
        <div className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Você entrou na fila de atendimento. Aguarde um instante.
          {queuePos != null && <> Sua posição: <strong>Nº {queuePos}</strong>.</>}
        </div>
      )}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            {chat.status === "waiting" ? "Envie sua primeira mensagem. Um atendente entrará em contato." : "Sem mensagens."}
          </div>
        )}
        {messages.filter((m) => m).map((m) => {
          const mine = m.sender_id === user?.id;
          const isSystem = m.sender_role === "system";
          if (isSystem) {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="text-[11px] italic text-muted-foreground bg-muted/70 px-3 py-1 rounded-full max-w-[85%] text-center">
                  {m.message ?? ""}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${roleAlign(m.sender_role, mine)}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${roleBubbleClass(m.sender_role, mine)}`}>
                <div className="text-[10px] font-medium opacity-80 mb-0.5">
                  {roleLabel(m.sender_role, mine)}
                </div>
                {m.message && m.message !== "(anexo)" && (
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                )}
                <AttachmentList attachments={(m as { attachments?: unknown }).attachments} />
              </div>
            </div>
          );
        })}
      </div>
      {chat.status !== "closed" && (
        <div className="border-t p-2">
          <ChatComposer scope="support" scopeId={chat.id} onSend={onSend} />
        </div>
      )}
    </div>
  );
}