import { Navigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TicketDetail } from "@/components/support/TicketDetail";

export default function TicketDetalhesCliente() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!ticketId) return <Navigate to="/minha-conta/suporte/tickets" replace />;
  return (
    <div className="min-h-screen bg-gradient-cream">
      <Header />
      <main className="container py-6 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/minha-conta/suporte/tickets"><ArrowLeft className="size-4 mr-1" /> Meus tickets</Link>
        </Button>
        <TicketDetail ticketId={ticketId} senderRole="customer" />
      </main>
    </div>
  );
}