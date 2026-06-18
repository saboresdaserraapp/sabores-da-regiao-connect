import { useEffect, useRef, useState } from "react";
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
  const reopenTimer = useRef<number | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["pending-proposal", user?.id],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      // 1) Recent orders of this user (no status filter, RLS already scopes by user)
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id, tracking_code, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (oErr || !orders?.length) return null;
      const ids = orders.map((o) => o.id);
      // 2) Any 'sent' proposal for any of those orders
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
      return { id: p.id as string, order_id: p.order_id as string, tracking_code: order?.tracking_code as string | undefined };
    },
  });

  // Whenever there's a pending proposal, force-open the dialog.
  useEffect(() => {
    if (data?.id) setOpen(true);
    else setOpen(false);
  }, [data?.id]);

  useEffect(() => {
    if (!user) return;
    const chProp = supabase
      .channel(`pending-proposal-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_confirmation_proposals" },
        () => refetch()
      )
      .subscribe();
    const chOrders = supabase
      .channel(`pending-proposal-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(chProp);
      supabase.removeChannel(chOrders);
    };
  }, [user?.id, refetch]);

  if (!data?.order_id) return null;
  const orderId = data.order_id as string;
  const tracking = (data as any)?.tracking_code as string | undefined;

  const scheduleReopen = () => {
    if (reopenTimer.current) window.clearTimeout(reopenTimer.current);
    reopenTimer.current = window.setTimeout(() => {
      refetch();
    }, 5_000);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // If the user dismisses without responding, reopen shortly after.
        if (!v) scheduleReopen();
      }}
    >
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
          <Button variant="outline" onClick={() => { setOpen(false); navigate(tracking ? `/pedido/${tracking}` : `/minha-conta/pedidos/${orderId}`); }}>
            Ver detalhes do pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}