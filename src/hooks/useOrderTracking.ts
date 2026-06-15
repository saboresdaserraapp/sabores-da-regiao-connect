import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOrderTracking(trackingCode?: string) {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!trackingCode) return;
    const { data } = await supabase.rpc("get_order_by_tracking" as never, { _code: trackingCode } as never);
    const row = Array.isArray(data) ? (data as any[])[0] : null;
    setOrder(row ?? null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchOrder();
    if (!trackingCode) return;
    const ch = supabase
      .channel(`order-${trackingCode}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload: any) => {
        if (payload.new?.tracking_code === trackingCode) fetchOrder();
      })
      .subscribe();
    const interval = setInterval(fetchOrder, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingCode]);

  return { order, loading, refetch: fetchOrder };
}
