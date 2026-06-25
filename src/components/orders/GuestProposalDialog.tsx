import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

type GuestProposal = {
  id: string;
  status: string;
  proposed_subtotal: number | null;
  proposed_delivery_fee: number | null;
  proposed_discount: number | null;
  proposed_extra_fee: number | null;
  proposed_total: number | null;
  estimated_preparation_time_min: number | null;
  estimated_delivery_time_min: number | null;
  business_note: string | null;
};

/**
 * Dialog para visitantes (sem login) aceitarem/recusarem a proposta de
 * confirmação da loja. Usa RPCs SECURITY DEFINER validadas pelo
 * tracking_code do pedido.
 */
export function GuestProposalDialog({
  trackingCode,
  establishmentName,
}: {
  trackingCode: string;
  establishmentName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [note, setNote] = useState("");

  const { data: proposal, refetch } = useQuery({
    enabled: !!trackingCode,
    queryKey: ["guest-active-proposal", trackingCode],
    refetchInterval: 15_000,
    queryFn: async (): Promise<GuestProposal | null> => {
      const { data, error } = await supabase.rpc(
        "get_active_proposal_by_tracking" as never,
        { _code: trackingCode } as never,
      );
      if (error) throw error;
      const list = (data ?? []) as GuestProposal[];
      return list[0] ?? null;
    },
  });

  // Polling no realtime: order_confirmation_proposals está protegido por RLS,
  // então mantemos o refetchInterval. Quando o tracking_code muda, refaz.
  useEffect(() => { void refetch(); }, [trackingCode, refetch]);

  useEffect(() => {
    if (proposal && proposal.status === "sent") setOpen(true);
    else setOpen(false);
  }, [proposal?.id, proposal?.status]);

  if (!proposal) return null;

  const onAccept = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc(
        "accept_order_proposal_by_tracking" as never,
        { _code: trackingCode, _proposal_id: proposal.id } as never,
      );
      if (error) throw error;
      toast.success("Pedido confirmado!");
      setOpen(false);
      await refetch();
    } catch (e) {
      toast.error((e as Error)?.message || "Não foi possível aceitar");
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc(
        "reject_order_proposal_by_tracking" as never,
        { _code: trackingCode, _proposal_id: proposal.id, _note: note || null } as never,
      );
      if (error) throw error;
      toast.success("Resposta enviada à loja");
      setRejectMode(false);
      setNote("");
      setOpen(false);
      await refetch();
    } catch (e) {
      toast.error((e as Error)?.message || "Não foi possível recusar");
    } finally {
      setBusy(false);
    }
  };

  const row = (label: string, val: number | null) =>
    val == null ? null : (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{brl(Number(val))}</span>
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirme o valor final da entrega</DialogTitle>
          <DialogDescription>
            {establishmentName ? `${establishmentName} ` : "A loja "}
            revisou a taxa de entrega do seu pedido <span className="font-mono">{trackingCode}</span>.
            O pedido só seguirá para preparo depois que você aceitar o valor final.
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
          <div className="space-y-1.5 mb-3">
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
              <Button onClick={onAccept} disabled={busy} className="sm:col-span-2" data-testid="guest-accept-proposal">
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                Aceitar e confirmar pedido
              </Button>
              <Button variant="outline" onClick={() => setRejectMode(true)} disabled={busy}>
                <X className="mr-2 size-4" /> Recusar
              </Button>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}