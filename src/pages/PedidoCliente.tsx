import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderChat } from "@/components/OrderChat";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, HelpCircle, MessageSquare, AlertOctagon } from "lucide-react";
import { statusLabel } from "@/lib/orderStatusLabels";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCreateTicket } from "@/hooks/useSupportTickets";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const createTicket = useCreateTicket();

  const scrollToChat = () => {
    setHelpOpen(false);
    setTimeout(() => {
      document.getElementById("order-chat-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const openTicket = async () => {
    if (!order) return;
    try {
      const t = await createTicket.mutateAsync({
        subject: `Problema no pedido ${order.tracking_code ?? ""}`.trim(),
        description: "",
        category: "order_issue",
        priority: "normal",
        opened_by_role: "customer",
        establishment_id: order.establishment_id,
        order_id: order.id,
      });
      setHelpOpen(false);
      toast.success("Ticket criado");
      navigate(`/minha-conta/suporte/tickets/${t.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir ticket");
    }
  };

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
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
                  <HelpCircle className="size-4 mr-2" />
                  Preciso de ajuda com este pedido
                </Button>
              </div>
            </div>

            <div id="order-chat-section" className="rounded-xl border border-border bg-card p-3">
              <h2 className="px-1 pb-2 text-sm font-semibold">Mensagens do pedido</h2>
              {user ? (
                <OrderChat
                  orderId={order.id}
                  senderType="customer"
                  establishmentId={order.establishment_id}
                  title="Conversa com a loja"
                  disabled={["delivered","canceled_by_customer","canceled_by_business","not_completed","customer_not_responding"].includes(order.status)}
                  disabledMessage="Este pedido foi finalizado. Para problemas, abra um ticket de suporte."
                />
              ) : (
                <p className="text-sm text-muted-foreground p-3">Faça login para conversar com a loja.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como podemos ajudar?</DialogTitle>
            <DialogDescription>
              Escolha falar diretamente com a loja ou abrir um chamado formal para a equipe da plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start h-auto py-3" onClick={scrollToChat}>
              <MessageSquare className="size-4 mr-3 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Falar com a loja</div>
                <div className="text-xs text-muted-foreground">Conversa rápida com o estabelecimento sobre este pedido.</div>
              </div>
            </Button>
            <Button className="justify-start h-auto py-3" onClick={openTicket} disabled={createTicket.isPending}>
              <AlertOctagon className="size-4 mr-3 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Abrir reclamação ou chamado</div>
                <div className="text-xs opacity-90">Análise formal pela equipe da plataforma, vinculada a este pedido.</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}