import { useSearchParams } from "react-router-dom";
import { OrderChat } from "@/components/OrderChat";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/ui/loading-state";

/**
 * Rota DEV-only para testes E2E de chat do pedido (cliente ↔ loja).
 * Renderiza apenas o componente <OrderChat /> isolado, parametrizado via
 * query string, evitando depender de toda a árvore de detalhes do pedido.
 *
 * Uso:
 *   /__dev__/order-chat?orderId=UUID&as=customer
 *   /__dev__/order-chat?orderId=UUID&as=business&establishmentId=UUID
 *
 * Bloqueada por `import.meta.env.DEV` na definição da rota em App.tsx.
 */
export default function OrderChatHarness() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const orderId = params.get("orderId") ?? "";
  const as = (params.get("as") ?? "customer") as "customer" | "business";
  const establishmentId = params.get("establishmentId") ?? undefined;

  if (loading) return <LoadingState variant="page" label="Carregando..." />;
  if (!user) {
    return (
      <div className="p-6 text-sm" data-testid="harness-no-auth">
        Não autenticado. Faça login antes de abrir esta rota.
      </div>
    );
  }
  if (!orderId) {
    return (
      <div className="p-6 text-sm" data-testid="harness-missing-order">
        Faltou ?orderId= na URL.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-2 text-xs text-muted-foreground" data-testid="harness-info">
        as={as} · orderId={orderId}
      </div>
      <OrderChat
        orderId={orderId}
        senderType={as}
        establishmentId={establishmentId}
        title={`Chat (${as})`}
      />
    </div>
  );
}