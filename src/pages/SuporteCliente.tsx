import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { PageHeader } from "@/components/ui/page-header";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { NewTicketDialog, TicketListItem } from "@/components/support/NewTicketDialog";
import { TicketDetail } from "@/components/support/TicketDetail";
import { Loader2 } from "lucide-react";

export default function SuporteCliente() {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: tickets = [], isLoading } = useSupportTickets({ kind: "mine" });

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-cream">
      <Header />
      <main className="container py-8">
        <PageHeader
          title="Suporte"
          description="Abra um ticket e converse com nossa equipe."
          actions={<NewTicketDialog role="customer" onCreated={(id) => setSelected(id)} />}
        />
        <div className="grid md:grid-cols-[320px_1fr] gap-4">
          <aside className="space-y-2">
            {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            {!isLoading && tickets.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-card">
                Você ainda não tem tickets.
              </div>
            )}
            {tickets.map((t) => (
              <TicketListItem key={t.id} ticket={t} selected={selected === t.id} onSelect={() => setSelected(t.id)} />
            ))}
          </aside>
          <section>
            {selected ? (
              <TicketDetail ticketId={selected} senderRole="customer" />
            ) : (
              <div className="border rounded-lg p-10 text-center text-sm text-muted-foreground bg-card">
                Selecione um ticket ou abra um novo.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}