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

  const { data, refetch } = useQuery({
    queryKey: ["pending-proposal", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("order_confirmation_proposals")
        .select("id, order_id, orders!inner(id, user_id, tracking_code, status, confirmation_flow_status)")
        .eq("status", "sent")
        .eq("orders.user_id", user!.id)
        .eq("orders.status", "waiting_business_confirmation")
        .eq("orders.confirmation_flow_status", "proposal_sent_to_customer")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    if (data?.order_id) setOpen(true);
  }, [data?.order_id]);

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
  const tracking = (data as any)?.orders?.tracking_code as string | undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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