import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/loading-state";

/**
 * Resolves an :orderId URL param into the canonical /pedido/:tracking_code URL.
 * Used to keep notification links / legacy URLs working while there is only
 * one real order page in the app.
 */
export function RedirectByOrderId() {
  const { orderId } = useParams<{ orderId: string }>();
  const [code, setCode] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!orderId) {
      setCode(null);
      return;
    }
    supabase
      .from("orders")
      .select("tracking_code")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setCode((data?.tracking_code as string | null) ?? null);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (code === undefined) {
    return <LoadingState variant="page" label="Abrindo pedido..." />;
  }
  if (!code) return <Navigate to="/minha-conta?tab=pedidos" replace />;
  return <Navigate to={`/pedido/${code}`} replace />;
}

export default RedirectByOrderId;