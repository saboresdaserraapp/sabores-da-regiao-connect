import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useMyOpenChat, useOpenChat, useCloseChat, useChatQueuePosition } from "@/hooks/useSupportChat";
import { ChatPanel } from "@/components/support/ChatPanel";
import { toast } from "sonner";

export default function SuporteChatCliente() {
  const { user, loading } = useAuth();
  const { data: chat, isLoading } = useMyOpenChat();
  const open = useOpenChat();
  const close = useCloseChat();
  const { data: queuePosition } = useChatQueuePosition(chat);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleOpen = async () => {
    try { await open.mutateAsync({}); }
    catch (e: any) { toast.error(e?.message || "Não foi possível abrir o chat"); }
  };

  const handleClose = async () => {
    if (!chat) return;
    try { await close.mutateAsync(chat.id); toast.success("Atendimento encerrado"); }
    catch (e: any) { toast.error(e?.message || "Falha ao encerrar"); }
  };

  return (
    <div className="min-h-screen bg-gradient-cream">
      <Header />
      <main className="container py-8 max-w-3xl">
        <PageHeader
          title="Suporte rápido"
          description="Converse com a equipe Sabores da Serra para dúvidas rápidas."
        />
        <div className="rounded-xl border bg-card overflow-hidden h-[70vh] flex flex-col">
          {isLoading ? (
            <div className="flex-1 grid place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : !chat ? (
            <div className="flex-1 grid place-items-center p-6 text-center">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Nenhum atendimento em andamento.</p>
                <Button onClick={handleOpen} disabled={open.isPending}>
                  {open.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Iniciar conversa com o suporte
                </Button>
              </div>
            </div>
          ) : (
            <ChatPanel
              chat={chat}
              senderRole="customer"
              headerExtra={
                <Button size="sm" variant="outline" onClick={handleClose}>Encerrar</Button>
              }
              banner={
                chat.status === "waiting"
                  ? `Você está na fila de atendimento. Posição: ${queuePosition ?? "—"}.`
                  : chat.status === "active"
                  ? "Você está conversando com o suporte."
                  : undefined
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}