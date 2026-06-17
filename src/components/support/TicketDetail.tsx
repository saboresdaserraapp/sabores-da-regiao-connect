import { useState, useRef, useEffect } from "react";
import { useSupportTicket, useSupportMessages, useSendTicketMessage, useUpdateTicket, STATUS_LABEL, CATEGORY_LABEL, PRIORITY_LABEL, type ActorRole, type TicketStatus } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TicketDetail({
  ticketId,
  senderRole,
  canManage = false,
}: {
  ticketId: string;
  senderRole: ActorRole;
  canManage?: boolean;
}) {
  const { user } = useAuth();
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const { data: messages = [] } = useSupportMessages(ticketId);
  const send = useSendTicketMessage();
  const update = useUpdateTicket();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin" /></div>;
  if (!ticket) return <div className="py-10 text-sm text-muted-foreground text-center">Ticket não encontrado.</div>;

  const onSend = async () => {
    const message = text.trim();
    if (!message) return;
    try {
      await send.mutateAsync({ ticket_id: ticket.id, message, sender_role: senderRole });
      setText("");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold text-lg">{ticket.subject}</div>
            <div className="text-xs text-muted-foreground">
              {CATEGORY_LABEL[ticket.category]} · prioridade {PRIORITY_LABEL[ticket.priority].toLowerCase()}
            </div>
          </div>
          <Badge variant="outline">{STATUS_LABEL[ticket.status]}</Badge>
        </div>
        {ticket.description && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{ticket.description}</p>}
        {canManage && (
          <div className="flex gap-2 pt-2 border-t flex-wrap">
            <Select
              value={ticket.status}
              onValueChange={async (v) => {
                const patch: any = { status: v as TicketStatus };
                if (v === "resolved") patch.resolved_at = new Date().toISOString();
                if (v === "closed") patch.closed_at = new Date().toISOString();
                try { await update.mutateAsync({ id: ticket.id, patch }); toast.success("Status atualizado"); }
                catch (e: any) { toast.error(e?.message || "Falha"); }
              }}
            >
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {!ticket.assigned_admin_id && (
              <Button variant="outline" size="sm" onClick={async () => {
                try { await update.mutateAsync({ id: ticket.id, patch: { assigned_admin_id: user!.id } as any }); toast.success("Ticket atribuído a você"); }
                catch (e: any) { toast.error(e?.message || "Falha"); }
              }}>Atribuir a mim</Button>
            )}
          </div>
        )}
      </div>

      <div ref={listRef} className="rounded-lg border bg-background max-h-[420px] overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Sem mensagens ainda.</div>}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="text-[10px] opacity-70 mb-0.5">
                  {m.sender_role === "admin" ? "Suporte" : m.sender_role === "establishment" ? "Loja" : m.sender_role === "system" ? "Sistema" : "Cliente"}
                  {" · "}
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR })}
                </div>
                <div className="whitespace-pre-wrap">{m.message}</div>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma mensagem..."
            rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSend(); }}
          />
          <Button onClick={onSend} disabled={send.isPending || !text.trim()}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground">Este ticket foi encerrado.</div>
      )}
    </div>
  );
}