import { useState, useRef, useEffect } from "react";
import { useSupportTicket, useSupportMessages, useSendTicketMessage, useUpdateTicket, STATUS_LABEL, CATEGORY_LABEL, PRIORITY_LABEL, type ActorRole, type TicketStatus } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Paperclip, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function useTicketAttachments(ticketId: string | undefined) {
  return useQuery({
    enabled: !!ticketId,
    queryKey: ["support_ticket_attachments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_attachments")
        .select("*").eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

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
  const qc = useQueryClient();
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const { data: messages = [] } = useSupportMessages(ticketId);
  const { data: attachments = [] } = useTicketAttachments(ticketId);
  const send = useSendTicketMessage();
  const update = useUpdateTicket();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [internalNote, setInternalNote] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin" /></div>;
  if (!ticket) return <div className="py-10 text-sm text-muted-foreground text-center">Ticket não encontrado.</div>;

  const onSend = async () => {
    const message = text.trim();
    if (!message && pending.length === 0) return;
    const asInternal = senderRole === "admin" && internalNote;
    try {
      const msg = await send.mutateAsync({
        ticket_id: ticket.id,
        message: message || "(anexo)",
        sender_role: senderRole,
        is_internal_note: asInternal,
      });
      if (pending.length) {
        setUploading(true);
        for (const f of pending) {
          const path = `${ticket.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
          const up = await supabase.storage.from("support-attachments").upload(path, f);
          if (up.error) throw up.error;
          const { data: signed } = await supabase.storage.from("support-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
          await supabase.from("support_ticket_attachments").insert({
            ticket_id: ticket.id,
            message_id: (msg as any).id,
            uploaded_by: user!.id,
            file_url: signed?.signedUrl ?? path,
            file_name: f.name, file_type: f.type, file_size: f.size,
          });
        }
        qc.invalidateQueries({ queryKey: ["support_ticket_attachments", ticket.id] });
        setPending([]);
      }
      setText("");
      setInternalNote(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar");
    } finally {
      setUploading(false);
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
        {messages.filter((m) => m && typeof m.message === "string").map((m: any) => {
          const mine = m.sender_id === user?.id;
          const mAtts = attachments.filter((a: any) => a.message_id === m.id);
          const isInternal = !!m.is_internal_note;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                isInternal ? "bg-amber-100 border border-amber-300 text-amber-950"
                : mine ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <div className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1">
                  {isInternal && <Lock className="size-3" />}
                  {isInternal && <span className="font-semibold uppercase">Nota interna ·</span>}
                  {m.sender_role === "admin" ? "Suporte" : m.sender_role === "establishment" ? "Loja" : m.sender_role === "system" ? "Sistema" : "Cliente"}
                  {" · "}
                  {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR }) : ""}
                </div>
                <div className="whitespace-pre-wrap">{m.message ?? ""}</div>
                {mAtts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {mAtts.map((a: any) => (
                      <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs underline opacity-90 hover:opacity-100">
                        <Paperclip className="size-3" />{a.file_name || "anexo"}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <div className="space-y-2">
          {senderRole === "admin" && (
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
          )}
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((f, i) => (
                <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1">
                  <Paperclip className="size-3" />{f.name}
                  <button onClick={() => setPending((p) => p.filter((_, j) => j !== i))} className="opacity-60 hover:opacity-100"><X className="size-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={fileRef} type="file" multiple className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []);
                setPending((p) => [...p, ...fs]);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} title="Anexar arquivo">
              <Paperclip className="size-4" />
            </Button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva uma mensagem..."
              rows={2}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSend(); }}
            />
            <Button onClick={onSend} disabled={send.isPending || uploading || (!text.trim() && pending.length === 0)}>
              {(send.isPending || uploading) ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground">Este ticket foi encerrado.</div>
      )}
    </div>
  );
}