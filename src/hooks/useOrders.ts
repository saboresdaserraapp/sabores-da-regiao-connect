import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { userOrdersService } from "@/lib/userOrders";

export function useUserOrders() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["orders-user", user?.id],
    enabled: !!user,
    queryFn: () => userOrdersService.getMyOrders(user!.id),
    refetchInterval: 30000, // Auto refresh every 30s
  });
}

export function useActiveOrders() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["active-orders", user?.id],
    enabled: !!user,
    queryFn: () => userOrdersService.getMyActiveOrders(user!.id),
    refetchInterval: 20000, // Faster refresh for active orders
  });
}

export function useOrderDetails(orderId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["order-detail-customer", orderId, user?.id],
    enabled: !!orderId && !!user,
    queryFn: () => userOrdersService.getMyOrderById(orderId!, user!.id),
  });
}


export function useEstablishmentOrders(establishmentId?: string) {
  return useQuery({
    queryKey: ["orders-estab", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("establishment_id", establishmentId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}
