import { useState } from "react";
import { useAdminChats, useClaimChat, useCloseChat, useSendChatMessage } from "@/hooks/useSupportChat";
import { ChatPanel } from "@/components/support/ChatPanel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function AdminSuporte() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: chats = [], isLoading } = useAdminChats();
  const claim = useClaimChat();
  const close = useCloseChat();
  const sendMsg = useSendChatMessage();

  const current = chats.find((c) => c.id === selected) || null;
  const mine = chats.filter((c) => c.claimed_by === user?.id);
  const queue = chats.filter((c) => c.status === "waiting" && !c.claimed_by);
  const others = chats.filter((c) => c.status === "active" && c.claimed_by && c.claimed_by !== user?.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Suporte ao vivo" description="Chats de suporte em tempo real." />
      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[70vh]">
        <aside className="space-y-4 overflow-y-auto pr-1">
          <Section title={`Na fila (${queue.length})`} chats={queue} selected={selected} onSelect={setSelected} />
          <Section title={`Meus chats (${mine.length})`} chats={mine} selected={selected} onSelect={setSelected} />
          <Section title={`Outros atendentes (${others.length})`} chats={others} selected={selected} onSelect={setSelected} muted />
          {isLoading && <div className="text-xs text-muted-foreground">Carregando...</div>}
        </aside>
        <section className="border rounded-lg bg-card overflow-hidden">
          {!current ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground p-6">
              Selecione um chat para começar.
            </div>
          ) : (
            <ChatPanel
              chat={current}
              senderRole="admin"
              headerExtra={
                <div className="flex gap-2">
                  {current.status === "waiting" || current.claimed_by !== user?.id ? (
                    <Button size="sm" onClick={async () => {
                      try {
                        await claim.mutateAsync(current.id);
                        try {
                          await sendMsg.mutateAsync({
                            chat_id: current.id,
                            sender_role: "system",
                            message: "Atendimento iniciado pelo suporte. Olá! Como posso ajudar?",
                          });
                        } catch { /* non-blocking */ }
                        toast.success("Chat atribuído");
                      }
                      catch (e: any) { toast.error(e?.message || "Falha"); }
                    }}>Assumir</Button>
                  ) : null}
                  {current.status !== "closed" && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { await close.mutateAsync(current.id); toast.success("Chat encerrado"); setSelected(null); }
                      catch (e: any) { toast.error(e?.message || "Falha"); }
                    }}>Encerrar</Button>
                  )}
                </div>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Section({ title, chats, selected, onSelect, muted }: {
  title: string;
  chats: { id: string; topic: string | null; last_message_at: string; status: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase text-muted-foreground px-1">{title}</div>
      {chats.length === 0 && <div className="text-xs text-muted-foreground px-1">—</div>}
      {chats.map((c) => (
        <button key={c.id} onClick={() => onSelect(c.id)}
          className={`w-full text-left p-2 rounded border text-sm hover:bg-muted/50 transition ${selected === c.id ? "bg-muted border-primary" : ""} ${muted ? "opacity-70" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="truncate">{c.topic || "Suporte rápido"}</div>
            <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground">{new Date(c.last_message_at).toLocaleString("pt-BR")}</div>
        </button>
      ))}
    </div>
  );
}