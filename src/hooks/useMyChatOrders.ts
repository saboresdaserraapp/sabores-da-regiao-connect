import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ChatOrderRow = {
  id: string;
  tracking_code: string | null;
  status: string;
  establishment_id: string;
  establishment_name: string | null;
  establishment_logo: string | null;
  last_message_at: string | null;
  unread_from_business: number;
  created_at: string;
};

const ACTIVE_STATUSES = [
  "waiting_business_confirmation",
  "confirmed_by_business",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
];

export function useMyChatOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-chat-orders", user?.id],
    queryFn: async (): Promise<ChatOrderRow[]> => {
      // Recent orders for this customer (active first; fallback to last 10 by date).
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id,tracking_code,status,establishment_id,created_at,establishment:establishments(name,logo)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      type EstablishmentRel = { name: string | null; logo: string | null };
      type OrderRow = {
        id: string;
        tracking_code: string | null;
        status: string;
        establishment_id: string;
        created_at: string;
        // Supabase may type the embedded relation as a single object or an array
        // depending on FK detection; normalize downstream.
        establishment: EstablishmentRel | EstablishmentRel[] | null;
      };
      const list = (orders ?? []) as unknown as OrderRow[];
      if (list.length === 0) return [];

      const ids = list.map((o) => o.id);
      const { data: msgs } = await supabase
        .from("order_messages")
        .select("order_id,sender_type,read_at,created_at")
        .in("order_id", ids)
        .order("created_at", { ascending: false });
      const unread: Record<string, number> = {};
      const lastAt: Record<string, string> = {};
      for (const m of (msgs ?? []) as Array<{ order_id: string; sender_type: string; read_at: string | null; created_at: string }>) {
        if (!lastAt[m.order_id]) lastAt[m.order_id] = m.created_at;
        if (m.sender_type === "business" && !m.read_at) {
          unread[m.order_id] = (unread[m.order_id] ?? 0) + 1;
        }
      }

      return list
        .map((o) => {
          const est = Array.isArray(o.establishment) ? o.establishment[0] : o.establishment;
          return {
          id: o.id,
          tracking_code: o.tracking_code,
          status: o.status,
          establishment_id: o.establishment_id,
          establishment_name: est?.name ?? null,
          establishment_logo: est?.logo ?? null,
          last_message_at: lastAt[o.id] ?? null,
          unread_from_business: unread[o.id] ?? 0,
          created_at: o.created_at,
          };
        })
        .sort((a, b) => {
          // Active orders first, then unread, then most recent activity.
          const aActive = ACTIVE_STATUSES.includes(a.status) ? 1 : 0;
          const bActive = ACTIVE_STATUSES.includes(b.status) ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          if ((b.unread_from_business > 0 ? 1 : 0) !== (a.unread_from_business > 0 ? 1 : 0)) {
            return (b.unread_from_business > 0 ? 1 : 0) - (a.unread_from_business > 0 ? 1 : 0);
          }
          const at = a.last_message_at ?? a.created_at;
          const bt = b.last_message_at ?? b.created_at;
          return new Date(bt).getTime() - new Date(at).getTime();
        });
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`my-chat-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_messages", filter: `customer_user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my-chat-orders", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my-chat-orders", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  return query;
}