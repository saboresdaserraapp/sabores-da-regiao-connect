import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyEstablishmentIds } from "@/hooks/useMyEstablishmentIds";
import PedidoTrackingPublic from "./PedidoTrackingPublic";
import PedidoCliente from "./PedidoCliente";
import PedidoDetalhesLoja from "./minha-loja/pedidos/PedidoDetalhes";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

type Resolved = { id: string; user_id: string | null; establishment_id: string };

export default function PedidoTracking() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: myEsts } = useMyEstablishmentIds();
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [resolving, setResolving] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let active = true;
    if (!code || authLoading) return;
    if (!user) {
      setResolved(null);
      setResolving(false);
      return;
    }
    setResolving(true);
    setResolveError(null);
    setNotFound(false);
    supabase
      .from("orders")
      .select("id,user_id,establishment_id")
      .eq("tracking_code", code)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setResolveError(error.message);
          setResolved(null);
        } else if (!data) {
          setNotFound(true);
          setResolved(null);
        } else {
          setResolved(data as any);
        }
        setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [code, user?.id, authLoading, retryTick]);

  if (authLoading || (user && resolving)) {
    return <LoadingState variant="page" label="Carregando pedido..." />;
  }

  if (user && resolved) {
    const isOwner = (myEsts ?? []).includes(resolved.establishment_id);
    if (isOwner) {
      return (
        <PedidoDetalhesLoja
          orderId={resolved.id}
          establishmentId={resolved.establishment_id}
        />
      );
    }
    if (resolved.user_id === user.id) {
      return <PedidoCliente orderId={resolved.id} />;
    }
  }

  if (user && resolveError) {
    return (
      <ErrorState
        title="Não conseguimos abrir este pedido"
        message={resolveError}
        onRetry={() => setRetryTick((t) => t + 1)}
      />
    );
  }

  // Pedido confirmadamente não existe / sem acesso: redireciona para a aba
  // de pedidos do perfil em vez de mostrar a tela pública vazia.
  if (user && notFound) {
    return <Navigate to="/minha-conta?tab=pedidos" replace />;
  }

  return <PedidoTrackingPublic />;
}