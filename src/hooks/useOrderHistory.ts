import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type EstabRow = Database["public"]["Tables"]["establishments"]["Row"];
type EstabLite = Pick<EstabRow, "id" | "name" | "slug" | "logo" | "whatsapp">;

export type OrderHistoryFilter = "all" | "ongoing" | "done" | "canceled";

const ONGOING = new Set([
  "waiting_business_confirmation",
  "confirmed_by_business",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
]);
const CANCELED = new Set([
  "canceled_by_business",
  "canceled_by_customer",
  "customer_not_responding",
  "difficult_address",
  "needs_more_reference",
  "not_completed",
]);

export interface HistoryOrder {
  id: string;
  tracking_code: string | null;
  establishment_id: string;
  items: unknown[];
  subtotal: number | null;
  delivery_fee: number | null;
  total: number | null;
  final_total: number | null;
  final_delivery_fee: number | null;
  confirmation_flow_status: string | null;
  status: string;
  payment_method: string | null;
  notes: string | null;
  address_id: string | null;
  created_at: string;
  establishment: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    whatsapp: string | null;
  } | null;
}

export function useOrderHistory(filter: OrderHistoryFilter, search: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["order-history", user?.id ?? "anon"],
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, tracking_code, establishment_id, items, subtotal, delivery_fee, total, final_total, final_delivery_fee, confirmation_flow_status, status, payment_method, notes, address_id, created_at"
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const orders = (data ?? []) as Array<Pick<OrderRow,
        "id" | "tracking_code" | "establishment_id" | "items" | "subtotal" |
        "delivery_fee" | "total" | "final_total" | "final_delivery_fee" |
        "confirmation_flow_status" | "status" | "payment_method" | "notes" |
        "address_id" | "created_at">>;
      const estabIds = Array.from(new Set(orders.map((o) => o.establishment_id).filter(Boolean)));
      const estabsById = new Map<string, HistoryOrder["establishment"]>();
      if (estabIds.length) {
        const { data: estabs } = await supabase
          .from("establishments")
          .select("id, name, slug, logo, whatsapp")
          .in("id", estabIds);
        (estabs ?? []).forEach((e: EstabLite) => estabsById.set(e.id, e));
      }
      return orders.map((o) => ({
        ...o,
        items: Array.isArray(o.items) ? (o.items as unknown[]) : [],
        establishment: estabsById.get(o.establishment_id) ?? null,
      })) as HistoryOrder[];
    },
  });

  // Lightweight realtime: refetch when any of the user's orders change.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`history-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => query.refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const all = query.data ?? [];
  const filtered = all.filter((o) => {
    if (filter === "ongoing" && !ONGOING.has(o.status)) return false;
    if (filter === "done" && o.status !== "delivered") return false;
    if (filter === "canceled" && !CANCELED.has(o.status)) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      const hay = `${o.tracking_code ?? ""} ${o.establishment?.name ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  return { ...query, orders: filtered, allOrders: all };
}

export function isOngoing(status: string) {
  return ONGOING.has(status);
}
export function isCanceled(status: string) {
  return CANCELED.has(status);
}