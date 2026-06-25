import { useParams, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import PedidoCliente from "@/pages/PedidoCliente";

/**
 * Rota oficial do cliente: /minha-conta/pedidos/:orderId
 * Garante auth e delega a renderização para PedidoCliente (que valida acesso por RLS).
 */
export default function CustomerOrderRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState variant="page" label="Carregando pedido..." />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (!orderId) {
    return (
      <ErrorState
        title="Pedido não informado"
        description="O link usado não contém o identificador do pedido."
      />
    );
  }
  return <PedidoCliente orderId={orderId} />;
}