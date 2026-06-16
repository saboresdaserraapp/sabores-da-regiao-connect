import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptProposal,
  fetchActiveProposal,
  OrderProposal,
  rejectProposal,
} from "@/lib/orderProposals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Check, X, MessageCircle } from "lucide-react";

type Props = {
  orderId: string;
  onChanged?: () => void;
};

export function ProposalAcceptCard({ orderId, onChanged }: Props) {
  const [proposal, setProposal] = useState<OrderProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  async function load() {
    setLoading(true);
    try {
      const p = await fetchActiveProposal(orderId);
      setProposal(p);
    } catch (e: any) {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`proposal-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_confirmation_proposals",
          filter: `order_id=eq.${orderId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading || !proposal || proposal.status !== "sent") return null;

  const onAccept = async () => {
    setBusy(true);
    try {
      await acceptProposal(proposal.id);
      toast.success("Pedido confirmado!");
      onChanged?.();
      qc.invalidateQueries({ queryKey: ["orders-user"] });
    } catch (e: any) {
      toast.error(e.message || "Não foi possível aceitar");
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      await rejectProposal(proposal.id, note || undefined);
      toast.success("Resposta enviada à loja");
      setRejectMode(false);
      setNote("");
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Não foi possível recusar");
    } finally {
      setBusy(false);
    }
  };

  const row = (label: string, val: number | null | undefined) =>
    val == null ? null : (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{brl(Number(val))}</span>
      </div>
    );

  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 shadow-sm">
      <div className="mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-primary">
          Ação necessária
        </div>
        <h3 className="font-display text-lg font-bold">A loja revisou seu pedido</h3>
      </div>

      <div className="space-y-1.5 mb-4">
        {row("Subtotal", proposal.proposed_subtotal)}
        {row("Taxa de entrega", proposal.proposed_delivery_fee)}
        {row("Desconto", proposal.proposed_discount)}
        {row("Acréscimo", proposal.proposed_extra_fee)}
        <div className="flex justify-between pt-2 border-t font-bold text-base">
          <span>Total final</span>
          <span className="text-primary">
            {proposal.proposed_total != null ? brl(Number(proposal.proposed_total)) : "—"}
          </span>
        </div>
        {proposal.estimated_preparation_time_min ? (
          <div className="text-xs text-muted-foreground">
            Prazo de preparo estimado: {proposal.estimated_preparation_time_min} min
          </div>
        ) : null}
        {proposal.estimated_delivery_time_min ? (
          <div className="text-xs text-muted-foreground">
            Prazo de entrega estimado: {proposal.estimated_delivery_time_min} min
          </div>
        ) : null}
        {proposal.business_note ? (
          <div className="mt-3 rounded-lg bg-card p-3 text-sm">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
              Observação da loja
            </div>
            {proposal.business_note}
          </div>
        ) : null}
      </div>

      {rejectMode ? (
        <div className="space-y-2">
          <Textarea
            rows={2}
            placeholder="Conte para a loja por que está recusando (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRejectMode(false)} disabled={busy}>
              Voltar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={onReject} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirmar recusa"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={onAccept} disabled={busy} className="sm:col-span-2">
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Aceitar e confirmar pedido
          </Button>
          <Button variant="outline" onClick={() => setRejectMode(true)} disabled={busy}>
            <X className="mr-2 size-4" /> Recusar
          </Button>
          <a
            href="#order-chat"
            className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline sm:col-span-3"
          >
            <MessageCircle className="size-3" /> Falar com a loja
          </a>
        </div>
      )}
    </section>
  );
}