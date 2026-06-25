import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRecentOrderCodes, subscribeRecentOrderCodes } from "@/lib/recentOrderCodes";
import { getGuestSeenMap, subscribeGuestSeen } from "@/lib/guestSeenMessages";
import type { ChatOrderRow } from "@/hooks/useMyChatOrders";

/**
 * For guests (not logged in): aggregates the recent tracking codes stored
 * in localStorage. Each code is looked up via the public RPC
 * `get_order_by_tracking`, and message counts are fetched via the public RPC
 * `get_order_messages_by_tracking`. Polls every 15s as a fallback since
 * Realtime cannot reach RLS-protected order_messages without an auth session.
 */
export function useGuestChatOrders(enabled: boolean) {
  const [codes, setCodes] = useState<string[]>(() => getRecentOrderCodes());
  const [seenVersion, setSeenVersion] = useState(0);
  const qc = useQueryClient();

  useEffect(() => {
    setCodes(getRecentOrderCodes());
    return subscribeRecentOrderCodes(() => setCodes(getRecentOrderCodes()));
  }, []);

  useEffect(() => {
    return subscribeGuestSeen(() => {
      setSeenVersion((v) => v + 1);
      qc.invalidateQueries({ queryKey: ["guest-chat-orders"] });
    });
  }, [qc]);

  return useQuery({
    enabled: enabled && codes.length > 0,
    queryKey: ["guest-chat-orders", codes.join(","), seenVersion],
    refetchInterval: enabled ? 15_000 : false,
    queryFn: async (): Promise<ChatOrderRow[]> => {
      const seen = getGuestSeenMap();
      const rows = await Promise.all(
        codes.map(async (code) => {
          const { data: orderRows } = await supabase.rpc(
            "get_order_by_tracking" as never,
            { _code: code } as never,
          );
          const order = Array.isArray(orderRows) ? (orderRows as Array<Record<string, unknown>>)[0] : null;
          if (!order) return null;
          const { data: msgs } = await supabase.rpc(
            "get_order_messages_by_tracking" as never,
            { _code: code } as never,
          );
          const msgList = (msgs ?? []) as Array<{ sender_type: string; created_at: string; read_at: string | null }>;
          const lastAt = msgList[msgList.length - 1]?.created_at ?? null;
          const seenAt = seen[code] ? new Date(seen[code]).getTime() : 0;
          const unread = msgList.filter((m) => {
            if (m.sender_type !== "business") return false;
            if (m.read_at) return false;
            return new Date(m.created_at).getTime() > seenAt;
          }).length;
          return {
            id: String(order.id),
            tracking_code: (order.tracking_code as string) ?? code,
            status: String(order.status ?? "waiting_business_confirmation"),
            establishment_id: String(order.establishment_id ?? ""),
            establishment_name: (order.establishment_name as string | null) ?? null,
            establishment_logo: (order.establishment_logo as string | null) ?? null,
            last_message_at: lastAt,
            unread_from_business: unread,
            created_at: (order.created_at as string) ?? new Date().toISOString(),
          } as ChatOrderRow;
        }),
      );
      return rows.filter((r): r is ChatOrderRow => r !== null);
    },
  });
}

export function useGuestOrderMessages(trackingCode: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && !!trackingCode,
    queryKey: ["guest-order-messages", trackingCode],
    refetchInterval: enabled && trackingCode ? 8_000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_order_messages_by_tracking" as never,
        { _code: trackingCode! } as never,
      );
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; sender_type: string; message: string; created_at: string;
        attachments: unknown; read_at: string | null;
      }>;
    },
  });
}