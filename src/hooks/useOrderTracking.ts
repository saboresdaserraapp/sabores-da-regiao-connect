import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
// RPC `get_order_by_tracking` returns the order row plus joined establishment fields.
export type TrackingOrder = OrderRow & {
  establishment_name?: string | null;
  establishment_slug?: string | null;
  establishment_whatsapp?: string | null;
  establishment_logo?: string | null;
};

export function useOrderTracking(trackingCode?: string) {
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!trackingCode) return;
    const { data } = await supabase.rpc("get_order_by_tracking" as never, { _code: trackingCode } as never);
    const row = Array.isArray(data) ? ((data as unknown as TrackingOrder[])[0] ?? null) : null;
    setOrder(row ?? null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchOrder();
    if (!trackingCode) return;
    const ch = supabase
      .channel(`order-${trackingCode}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const next = payload.new as Partial<OrderRow> | null;
        if (next?.tracking_code === trackingCode) fetchOrder();
      })
      .subscribe();
    const interval = setInterval(fetchOrder, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingCode]);

  return { order, loading, refetch: fetchOrder };
}
