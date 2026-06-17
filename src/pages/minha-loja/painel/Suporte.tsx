import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { NewTicketDialog, TicketListItem } from "@/components/support/NewTicketDialog";
import { TicketDetail } from "@/components/support/TicketDetail";
import { PageHeader } from "@/components/ui/page-header";

export default function PainelSuporte() {
  const { establishmentId } = useParams();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: tickets = [], isLoading } = useSupportTickets(
    establishmentId ? { kind: "establishment", establishmentId } : { kind: "mine" }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suporte"
        description="Fale com a equipe Sabores da Serra."
        actions={
          <NewTicketDialog
            role="establishment"
            establishmentId={establishmentId}
            onCreated={(id) => setSelected(id)}
          />
        }
      />
      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        <aside className="space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!isLoading && tickets.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-card">
              Nenhum ticket aberto.
            </div>
          )}
          {tickets.map((t) => (
            <TicketListItem key={t.id} ticket={t} selected={selected === t.id} onSelect={() => setSelected(t.id)} />
          ))}
        </aside>
        <section>
          {selected ? (
            <TicketDetail ticketId={selected} senderRole="establishment" />
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