import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProposalAcceptCard } from "@/components/orders/ProposalAcceptCard";

export function PendingProposalDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["pending-proposal", user?.id],
    enabled: !!user,
    refetchInterval: 20_000,
    queryFn: async () => {
      // 1) Get the user's recent orders awaiting their confirmation
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id, tracking_code, status, confirmation_flow_status")
        .eq("user_id", user!.id)
        .eq("status", "waiting_business_confirmation")
        .eq("confirmation_flow_status", "proposal_sent_to_customer")
        .order("created_at", { ascending: false })
        .limit(10);
      if (oErr || !orders?.length) return null;
      const ids = orders.map((o) => o.id);
      // 2) Find a 'sent' proposal for any of those orders
      const { data: proposals } = await (supabase as any)
        .from("order_confirmation_proposals")
        .select("id, order_id, status, created_at")
        .in("order_id", ids)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(1);
      const p = proposals?.[0];
      if (!p) return null;
      const order = orders.find((o) => o.id === p.order_id);
      return { id: p.id, order_id: p.order_id, tracking_code: order?.tracking_code };
    },
  });

  useEffect(() => {
    if (data?.id && dismissedFor !== data.id) setOpen(true);
  }, [data?.id, dismissedFor]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`pending-proposal-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_confirmation_proposals" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, refetch]);

  if (!data?.order_id) return null;
  const orderId = data.order_id as string;
  const tracking = (data as any)?.tracking_code as string | undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && data?.id) setDismissedFor(data.id); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirme o valor final da entrega</DialogTitle>
          <DialogDescription>
            O estabelecimento revisou a taxa de entrega do seu pedido
            {tracking ? ` ${tracking}` : ""}. Esse ajuste pode acontecer por causa do endereço,
            distância real, acesso ao local ou condições climáticas. O pedido só seguirá para
            preparo depois que você aceitar o valor final.
          </DialogDescription>
        </DialogHeader>
        <ProposalAcceptCard orderId={orderId} onChanged={() => { setOpen(false); refetch(); }} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { setOpen(false); navigate(`/minha-conta/pedidos/${orderId}`); }}>
            Ver detalhes do pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}