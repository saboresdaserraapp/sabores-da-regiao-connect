import { useParams } from "react-router-dom";
import { PainelSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useMyOpenChat, useOpenChat, useCloseChat } from "@/hooks/useSupportChat";
import { ChatPanel } from "@/components/support/ChatPanel";
import { toast } from "sonner";

export default function PainelSuporteChat() {
  const { establishmentId } = useParams();
  const { data: chat, isLoading } = useMyOpenChat();
  const open = useOpenChat();
  const close = useCloseChat();

  const handleOpen = async () => {
    try { await open.mutateAsync({ establishment_id: establishmentId ?? null }); }
    catch (e: unknown) { toast.error((e as Error)?.message || "Não foi possível abrir o chat"); }
  };
  const handleClose = async () => {
    if (!chat) return;
    try { await close.mutateAsync(chat.id); toast.success("Atendimento encerrado"); }
    catch (e: unknown) { toast.error((e as Error)?.message || "Falha ao encerrar"); }
  };

  return (
    <PainelSection
      title="Suporte rápido"
      subtitle="Converse com a equipe Sabores da Serra para dúvidas rápidas. Para chamados formais, use a aba Tickets em Suporte."
    >
      <div className="rounded-xl border bg-card overflow-hidden h-[65vh] flex flex-col">
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
            senderRole="establishment"
            headerExtra={<Button size="sm" variant="outline" onClick={handleClose}>Encerrar</Button>}
          />
        )}
      </div>
    </PainelSection>
  );
}