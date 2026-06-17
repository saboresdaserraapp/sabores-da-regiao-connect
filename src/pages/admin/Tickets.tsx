import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSupportTickets, STATUS_LABEL, PRIORITY_LABEL, type TicketStatus, type TicketPriority } from "@/hooks/useSupportTickets";
import { TicketListItem } from "@/components/support/NewTicketDialog";
import { TicketDetail } from "@/components/support/TicketDetail";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminTickets() {
  const { ticketId } = useParams<{ ticketId?: string }>();
  const [selected, setSelected] = useState<string | null>(ticketId ?? null);
  useEffect(() => { if (ticketId) setSelected(ticketId); }, [ticketId]);
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<"all" | "customer" | "establishment">("all");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");
  const { data: tickets = [], isLoading } = useSupportTickets({ kind: "admin" });

  const filtered = tickets.filter((t) => {
    const matchQ = !q.trim() ||
      t.subject.toLowerCase().includes(q.toLowerCase()) ||
      STATUS_LABEL[t.status].toLowerCase().includes(q.toLowerCase());
    const matchOrigin = origin === "all"
      || (origin === "customer" && t.opened_by_role === "customer")
      || (origin === "establishment" && t.opened_by_role === "establishment");
    const matchStatus = status === "all" || t.status === status;
    const matchPrio = priority === "all" || t.priority === priority;
    return matchQ && matchOrigin && matchStatus && matchPrio;
  });

  // SLA metrics
  const now = Date.now();
  const open = tickets.filter((t) => t.status !== "closed" && t.status !== "resolved");
  const avgFirstResponseMs = (() => {
    const resolved = tickets.filter((t) => t.resolved_at);
    if (!resolved.length) return null;
    const total = resolved.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0);
    return total / resolved.length;
  })();
  const stale24h = open.filter((t) => now - new Date(t.last_message_at).getTime() > 24 * 3600 * 1000).length;
  const urgentOpen = open.filter((t) => t.priority === "urgent" || t.priority === "high").length;
  const fmtH = (ms: number | null) => ms == null ? "—" : `${(ms / 3600000).toFixed(1)}h`;

  return (
    <div className="space-y-6">
      <PageHeader title="Tickets de suporte" description="Inbox da equipe de suporte." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Abertos</div><div className="text-2xl font-semibold">{open.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Alta/Urgente</div><div className="text-2xl font-semibold">{urgentOpen}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Parados &gt;24h</div><div className="text-2xl font-semibold">{stale24h}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tempo médio resolução</div><div className="text-2xl font-semibold">{fmtH(avgFirstResponseMs)}</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-[360px_1fr] gap-4">
        <aside className="space-y-2">
          <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <Select value={origin} onValueChange={(v) => setOrigin(v as any)}>
              <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda origem</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="establishment">Loja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda prioridade</SelectItem>
                {Object.entries(PRIORITY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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