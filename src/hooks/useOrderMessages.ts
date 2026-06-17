import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useOrderMessages(orderId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["order-messages", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_messages")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime updates (trigger handles notifications)
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["order-messages", orderId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({
      message,
      senderType,
      establishmentId,
    }: {
      message: string;
      senderType: "customer" | "business" | "system";
      establishmentId?: string;
    }) => {
      if (!user?.id) throw new Error("Você precisa estar logado para enviar mensagens.");
      const { data, error } = await supabase.from("order_messages").insert({
        order_id: orderId!,
        message: message.trim(),
        sender_type: senderType,
        sender_user_id: user.id,
        establishment_id: establishmentId,
        customer_user_id: senderType === "customer" ? user.id : null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-messages", orderId] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!orderId || !user?.id) return;
      await supabase
        .from("order_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .is("read_at", null)
        .neq("sender_user_id", user.id);
    },
  });

  return { ...query, sendMessage, markAsRead };
}
