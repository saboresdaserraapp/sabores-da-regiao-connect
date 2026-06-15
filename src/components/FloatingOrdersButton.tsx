import { useState, useEffect } from "react";
import { useActiveOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Receipt, ArrowRight } from "lucide-react";
import { brl } from "@/lib/format";

export function FloatingOrdersButton() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const { data: activeOrders, isLoading } = useActiveOrders();

  useEffect(() => {
    if (activeOrders && activeOrders.length > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [activeOrders]);

  if (!user || !isVisible || activeOrders?.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[90%] sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary shadow-2xl rounded-2xl p-1 border border-primary-foreground/10 ring-4 ring-black/5">
        <Link 
          to="/minha-conta?tab=pedidos"
          className="flex items-center justify-between gap-3 px-4 py-3 text-primary-foreground hover:bg-primary/90 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Receipt className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold leading-none">
                {activeOrders!.length === 1 
                  ? "Pedido em andamento" 
                  : `${activeOrders!.length} Pedidos em andamento`}
              </div>
              <div className="text-[10px] opacity-90 font-medium uppercase tracking-wider mt-1">
                {(activeOrders![0].establishments as any)?.name} • {activeOrders![0].status.replace(/_/g, " ")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-bold">
            {brl(Number(activeOrders![0].total_estimated || activeOrders![0].total))}
            <ArrowRight className="size-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
