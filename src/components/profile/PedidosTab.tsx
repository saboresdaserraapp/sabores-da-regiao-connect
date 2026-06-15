import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Receipt, ShoppingBag } from "lucide-react";
import { useUserOrders } from "@/hooks/useOrders";
import { brl } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL } from "@/components/orders/OrderStatusStepper";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export function PedidosTab() {
  const { data: orders = [], isLoading, error, refetch } = useUserOrders();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["orders-user", user.id] });
          qc.invalidateQueries({ queryKey: ["active-orders", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">Carregando seus pedidos...</p>
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
      <p className="text-sm text-destructive font-medium">Não foi possível carregar o histórico.</p>
      <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
    </div>
  );

  if (orders.length === 0) return <Empty msg="Nenhum pedido encontrado no seu histórico." />;
  
  return (
    <div className="space-y-4">
      {orders.map((o: any) => (
        <div 
          key={o.id} 
          onClick={() => navigate(`/minha-conta/pedidos/${o.id}`)}
          className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                {o.establishments?.logo ? (
                  <img src={o.establishments.logo} alt="" className="size-full object-cover" />
                ) : (
                  <ShoppingBag className="size-full p-3 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="font-bold leading-tight">
                  {o.establishments?.name}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5 tracking-wider">
                  {new Date(o.created_at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-primary">{brl(Number(o.total_estimated || o.total))}</div>
              <Badge variant="outline" className="text-[10px] font-bold mt-1 uppercase border-primary/20 bg-primary/5 text-primary">
                {STATUS_LABEL[o.status] || String(o.status).replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              size="sm" 
              className="rounded-full font-bold h-9 px-5 bg-primary hover:bg-primary/90 shadow-sm"
              onClick={() => navigate(`/minha-conta/pedidos/${o.id}`)}
            >
              <Receipt className="size-4 mr-2" /> VER DETALHES
            </Button>
            {o.establishments?.whatsapp && (
              <Button asChild size="sm" variant="outline" className="rounded-full font-bold h-9 px-5 border-primary/20 hover:bg-primary/5 text-primary">
                <a href={`https://wa.me/${o.establishments.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Sobre o pedido ${o.tracking_code || o.id.slice(0, 8)}.`)}`} target="_blank" rel="noreferrer">
                  FALAR COM A LOJA
                </a>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center space-y-4">
      <div className="text-sm text-muted-foreground">{msg}</div>
      <Button asChild><Link to="/">Explorar restaurantes</Link></Button>
    </div>
  );
}
