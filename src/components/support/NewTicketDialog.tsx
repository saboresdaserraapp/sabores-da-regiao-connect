import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTicket, CATEGORY_LABEL, PRIORITY_LABEL, type ActorRole, type TicketCategory, type TicketPriority } from "@/hooks/useSupportTickets";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

export function NewTicketDialog({
  role,
  establishmentId,
  onCreated,
}: {
  role: ActorRole;
  establishmentId?: string;
  onCreated?: (ticketId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("other");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const create = useCreateTicket();

  const onSubmit = async () => {
    if (!subject.trim()) { toast.error("Informe um assunto"); return; }
    try {
      const t = await create.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
        category, priority,
        opened_by_role: role,
        establishment_id: establishmentId ?? null,
      });
      toast.success("Ticket criado");
      setOpen(false);
      setSubject(""); setDescription(""); setCategory("other"); setPriority("normal");
      onCreated?.(t.id);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar ticket");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 size-4" /> Novo ticket</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Abrir ticket de suporte</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Descreva o problema..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Abrir ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TicketListItem({
  ticket, selected, onSelect,
}: {
  ticket: { id: string; subject: string; status: string; last_message_at: string; priority: string };
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition ${selected ? "bg-muted border-primary" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium truncate">{ticket.subject}</div>
        <span className="text-[10px] uppercase rounded-full px-2 py-0.5 bg-muted">{ticket.status}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {new Date(ticket.last_message_at).toLocaleString("pt-BR")}
      </div>
    </button>
  );
}