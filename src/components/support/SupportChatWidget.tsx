import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyOpenChat, useOpenChat, useCloseChat } from "@/hooks/useSupportChat";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./ChatPanel";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SupportChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: chat, isLoading } = useMyOpenChat();
  const openChat = useOpenChat();
  const closeChat = useCloseChat();

  if (!user) return null;

  const startChat = async () => {
    try {
      await openChat.mutateAsync({ topic: "Suporte rápido" });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir chat");
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center hover:scale-105 transition"
          aria-label="Suporte"
        >
          <MessageCircle className="size-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 left-5 z-40 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-2.5rem)] rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2 bg-primary text-primary-foreground">
            <div className="font-semibold text-sm">Suporte</div>
            <button onClick={() => setOpen(false)} aria-label="Fechar"><X className="size-4" /></button>
          </div>
          {isLoading ? (
            <div className="flex-1 grid place-items-center"><Loader2 className="size-5 animate-spin" /></div>
          ) : !chat ? (
            <div className="flex-1 grid place-items-center p-6 text-center gap-3">
              <p className="text-sm text-muted-foreground">Precisa de ajuda? Inicie uma conversa com nossa equipe.</p>
              <Button onClick={startChat} disabled={openChat.isPending}>
                {openChat.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Iniciar chat
              </Button>
            </div>
          ) : (
            <ChatPanel
              chat={chat}
              senderRole="customer"
              headerExtra={
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm("Encerrar conversa?")) return;
                  try { await closeChat.mutateAsync(chat.id); }
                  catch (e: any) { toast.error(e?.message || "Falha"); }
                }}>Encerrar</Button>
              }
            />
          )}
        </div>
      )}
    </>
  );
}