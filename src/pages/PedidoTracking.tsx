import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyEstablishmentIds } from "@/hooks/useMyEstablishmentIds";
import PedidoTrackingPublic from "./PedidoTrackingPublic";
import PedidoCliente from "./PedidoCliente";
import PedidoDetalhesLoja from "./minha-loja/pedidos/PedidoDetalhes";
import { LoadingState } from "@/components/ui/loading-state";

type Resolved = { id: string; user_id: string | null; establishment_id: string };

export default function PedidoTracking() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: myEsts } = useMyEstablishmentIds();
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let active = true;
    if (!code || authLoading) return;
    if (!user) {
      setResolved(null);
      setResolving(false);
      return;
    }
    setResolving(true);
    supabase
      .from("orders")
      .select("id,user_id,establishment_id")
      .eq("tracking_code", code)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setResolved((data as any) ?? null);
        setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [code, user?.id, authLoading]);

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

  // Usuário autenticado mas pedido não encontrado / sem acesso:
  // pedido apagado, fechado, ou pertence a outra conta. Direciona para
  // a aba de pedidos do perfil em vez de mostrar a tela pública vazia.
  if (user && !resolved) {
    return <Navigate to="/minha-conta?tab=pedidos" replace />;
  }

  return <PedidoTrackingPublic />;
}