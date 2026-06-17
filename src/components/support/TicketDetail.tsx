import { useRef, useEffect, useState } from "react";
import { useSupportTicket, useSupportMessages, useSendTicketMessage, useUpdateTicket, STATUS_LABEL, CATEGORY_LABEL, PRIORITY_LABEL, type ActorRole, type TicketStatus } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChatComposer } from "./ChatComposer";
import { AttachmentList } from "./AttachmentList";
import { roleBubbleClass, roleLabel, roleAlign } from "./chatBubbleStyles";

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
  const [internalNote, setInternalNote] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin" /></div>;
  if (!ticket) return <div className="py-10 text-sm text-muted-foreground text-center">Ticket não encontrado.</div>;

  const onSend = async (message: string, attachments: unknown[]) => {
    const asInternal = senderRole === "admin" && internalNote;
    const m = message.trim();
    if (!m && attachments.length === 0) return;
    await send.mutateAsync({
      ticket_id: ticket.id,
      message: m || "(anexo)",
      sender_role: senderRole,
      is_internal_note: asInternal,
      attachments,
    });
    setInternalNote(false);
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
        {messages.filter((m) => m).map((m) => {
          const mine = m.sender_id === user?.id;
          const isInternal = !!m.is_internal_note;
          const isSystem = m.sender_role === "system";
          const text = typeof m.message === "string" ? m.message : "";

          if (isSystem) {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="text-[11px] italic text-muted-foreground bg-muted/70 px-3 py-1 rounded-full max-w-[85%] text-center">
                  {text}
                </div>
              </div>
            );
          }

          const bubble = isInternal
            ? "bg-amber-100 border border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-50"
            : roleBubbleClass(m.sender_role, mine);

          return (
            <div key={m.id} className={`flex ${roleAlign(m.sender_role, mine)}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${bubble}`}>
                <div className="text-[10px] opacity-80 mb-0.5 flex items-center gap-1 font-medium">
                  {isInternal && <Lock className="size-3" />}
                  {isInternal && <span className="uppercase">Nota interna ·</span>}
                  {roleLabel(m.sender_role, mine)}
                  {" · "}
                  {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR }) : ""}
                </div>
                {text && text !== "(anexo)" && (
                  <div className="whitespace-pre-wrap break-words">{text}</div>
                )}
                <AttachmentList attachments={(m as { attachments?: unknown }).attachments} />
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <ChatComposer
          scope="ticket"
          scopeId={ticket.id}
          onSend={onSend}
          placeholder="Escreva uma mensagem..."
          extraTopSlot={senderRole === "admin" ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={internalNote}
                onChange={(e) => setInternalNote(e.target.checked)}
                className="size-3.5 accent-amber-500"
              />
              <Lock className="size-3" />
              Nota interna (visível só para a equipe de suporte)
            </label>
          ) : undefined}
        />
      ) : (
        <div className="text-center text-sm text-muted-foreground">Este ticket foi encerrado.</div>
      )}
    </div>
  );
}