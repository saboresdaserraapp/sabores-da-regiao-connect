import { useParams, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyEstablishmentIds } from "@/hooks/useMyEstablishmentIds";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import PedidoDetalhesLoja from "@/pages/minha-loja/pedidos/PedidoDetalhes";

/**
 * Rota oficial do lojista: /minha-loja/:establishmentId/pedidos/:orderId
 * Valida sessão + pertencimento ao estabelecimento antes de renderizar.
 */
export default function StoreOrderRoute() {
  const { establishmentId, orderId } = useParams<{ establishmentId: string; orderId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: myEsts, isLoading: estsLoading, error: estsError } = useMyEstablishmentIds();
  const location = useLocation();

  if (authLoading || (user && estsLoading)) {
    return <LoadingState variant="page" label="Carregando pedido..." />;
  }
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (!establishmentId || !orderId) {
    return (
      <ErrorState
        title="Pedido não informado"
        description="O link usado não contém os identificadores necessários."
      />
    );
  }
  if (estsError) {
    return (
      <ErrorState
        title="Não conseguimos validar suas permissões"
        description={(estsError as Error).message}
      />
    );
  }
  const isOwner = (myEsts ?? []).includes(establishmentId);
  if (!isOwner) {
    return (
      <ErrorState
        title="Sem permissão"
        description="Este pedido não pertence a um estabelecimento que você administra."
      />
    );
  }
  return <PedidoDetalhesLoja orderId={orderId} establishmentId={establishmentId} />;
}