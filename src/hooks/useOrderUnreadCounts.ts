import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a map of orderId -> unread count of messages sent by the customer
 * (i.e. messages the establishment hasn't read yet).
 */
export function useOrderUnreadCountsForBusiness(establishmentId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["order-unread-counts", "business", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_messages")
        .select("order_id")
        .eq("establishment_id", establishmentId!)
        .eq("sender_type", "customer")
        .is("read_at", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = (row as any).order_id as string | null;
        if (!id) continue;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },
  });

  useEffect(() => {
    if (!establishmentId) return;
    const channel = supabase
      .channel(`order-unread-${establishmentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_messages", filter: `establishment_id=eq.${establishmentId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["order-unread-counts", "business", establishmentId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishmentId, qc]);

  return query;
}