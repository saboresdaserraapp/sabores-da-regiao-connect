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
      return data;
    },
  });

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
      const { data, error } = await supabase.from("order_messages").insert({
        order_id: orderId!,
        message,
        sender_type: senderType,
        sender_user_id: user?.id,
        establishment_id: establishmentId,
        customer_user_id: senderType === "customer" ? user?.id : undefined,
      }).select().single();

      if (error) throw error;

      // Create notification for the recipient
      // This is a simple implementation, ideally this would be a DB trigger or Edge Function
      const { data: orderData } = await supabase.from("orders").select("user_id, establishment_id").eq("id", orderId!).single();
      
      if (orderData) {
        // Find recipient - if customer sent, recipient is the establishment owner
        // We look up the establishment owner user_id
        const { data: estabData } = await supabase.from("establishments").select("owner_id").eq("id", orderData.establishment_id as string).single();
        const recipientId = senderType === "customer" 
          ? (estabData as any)?.owner_id
          : orderData.user_id;

        if (recipientId) {
          await supabase.from("notifications").insert({
            user_id: recipientId,
            type: "new_order_message",
            title: "Nova mensagem sobre seu pedido",
            message: senderType === "customer" ? "O cliente enviou uma mensagem." : "O estabelecimento enviou uma mensagem.",
            data: { 
              related_order_id: orderId,
              related_establishment_id: orderData.establishment_id 
            } as any,
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-messages", orderId] });
    },
  });

  return { ...query, sendMessage };
}
