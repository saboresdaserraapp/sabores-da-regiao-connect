import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { Badge } from "./ui/badge";

export function OrderFloatingButton() {
  const { user } = useAuth();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchActiveOrders = async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", [
          "waiting_business_confirmation",
          "confirmed_by_business",
          "preparing",
          "ready_for_pickup",
          "out_for_delivery",
          "needs_more_reference",
          "difficult_address",
          "customer_not_responding"
        ]);
      
      setActiveOrdersCount(count || 0);
    };

    fetchActiveOrders();

    // Simple polling since we don't want complex realtime yet
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || activeOrdersCount === 0) return null;

  return (
    <Link 
      to="/minha-conta" 
      className="safe-bottom fixed bottom-24 right-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform animate-in fade-in slide-in-from-bottom-4"
    >
      <ShoppingBag className="size-5" />
      <span className="text-sm font-bold">Pedidos em andamento</span>
      {activeOrdersCount > 1 && (
        <Badge variant="secondary" className="bg-white text-primary hover:bg-white rounded-full size-5 flex items-center justify-center p-0 text-[10px]">
          {activeOrdersCount}
        </Badge>
      )}
    </Link>
  );
}
