import { Link, Navigate, useParams } from "react-router-dom";
import { PainelSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TicketDetail } from "@/components/support/TicketDetail";

export default function PainelTicketDetalhes() {
  const { establishmentId, ticketId } = useParams<{ establishmentId: string; ticketId: string }>();
  if (!ticketId || !establishmentId) {
    return <Navigate to={`/minha-loja/${establishmentId}/suporte/tickets`} replace />;
  }
  return (
    <PainelSection title="Ticket" subtitle="Detalhe do chamado">
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link to={`/minha-loja/${establishmentId}/suporte/tickets`}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
      </Button>
      <TicketDetail ticketId={ticketId} senderRole="establishment" />
    </PainelSection>
  );
}