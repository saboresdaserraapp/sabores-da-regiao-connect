import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderChat } from "@/components/OrderChat";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import { statusLabel } from "@/lib/orderStatusLabels";
import { useAuth } from "@/hooks/useAuth";

type OrderRow = {
  id: string;
  tracking_code: string | null;
  status: string;
  establishment_id: string;
  user_id: string | null;
  created_at: string;
  total: number;
  final_total: number | null;
  establishment?: { name: string | null; logo: string | null } | null;
};

export default function PedidoCliente() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!orderId) return;
    setLoading(true);
    supabase
      .from("orders")
      .select("id,tracking_code,status,establishment_id,user_id,created_at,total,final_total,establishment:establishments(name,logo)")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else setOrder(data as any);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/minha-conta"><ArrowLeft className="size-4 mr-1" /> Meus pedidos</Link>
        </Button>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : error || !order ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Pedido não encontrado ou você não tem acesso.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {order.establishment?.logo && (
                  <img src={order.establishment.logo} alt="" className="size-10 rounded-full object-cover" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{order.establishment?.name ?? "Pedido"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{order.tracking_code ?? ""}</div>
                </div>
                <div className="ml-auto"><Badge variant="secondary">{statusLabel(order.status as any)}</Badge></div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">R$ {Number(order.final_total ?? order.total ?? 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <h2 className="px-1 pb-2 text-sm font-semibold">Mensagens do pedido</h2>
              {user ? (
                <OrderChat
                  orderId={order.id}
                  senderType="customer"
                  establishmentId={order.establishment_id}
                />
              ) : (
                <p className="text-sm text-muted-foreground p-3">Faça login para conversar com a loja.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}