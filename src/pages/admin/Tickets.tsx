import { useState } from "react";
import { useSupportTickets, STATUS_LABEL } from "@/hooks/useSupportTickets";
import { TicketListItem } from "@/components/support/NewTicketDialog";
import { TicketDetail } from "@/components/support/TicketDetail";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";

export default function AdminTickets() {
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { data: tickets = [], isLoading } = useSupportTickets({ kind: "admin" });

  const filtered = tickets.filter((t) =>
    !q.trim() ||
    t.subject.toLowerCase().includes(q.toLowerCase()) ||
    STATUS_LABEL[t.status].toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Tickets de suporte" description="Inbox da equipe de suporte." />
      <div className="grid md:grid-cols-[360px_1fr] gap-4">
        <aside className="space-y-2">
          <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-card">Nenhum ticket.</div>
          )}
          {filtered.map((t) => (
            <TicketListItem key={t.id} ticket={t} selected={selected === t.id} onSelect={() => setSelected(t.id)} />
          ))}
        </aside>
        <section>
          {selected ? (
            <TicketDetail ticketId={selected} senderRole="admin" canManage />
          ) : (
            <div className="border rounded-lg p-10 text-center text-sm text-muted-foreground bg-card">
              Selecione um ticket.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}