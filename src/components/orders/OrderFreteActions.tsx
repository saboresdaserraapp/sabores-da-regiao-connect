import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Truck, MessageSquareCheck, Loader2 } from "lucide-react";
import { SendProposalDialog } from "@/components/orders/SendProposalDialog";
import { fetchActiveProposal, registerWhatsappAcceptance } from "@/lib/orderProposals";
import { toast } from "sonner";

type Props = {
  orderId: string;
  establishmentId: string;
  subtotal: number;
  deliveryFee: number;
  flowStatus?: string | null;
  size?: "sm" | "default";
  onChanged?: () => void;
};

export function OrderFreteActions({
  orderId,
  establishmentId,
  subtotal,
  deliveryFee,
  flowStatus,
  size = "sm",
  onChanged,
}: Props) {
  const [openAccept, setOpenAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");

  const showAcceptBtn = flowStatus === "proposal_sent_to_customer";

  async function onConfirmAccept() {
    if (!confirmed) {
      toast.error("Marque a confirmação antes de registrar o aceite.");
      return;
    }
    setBusy(true);
    try {
      const prop = await fetchActiveProposal(orderId);
      if (!prop || prop.status !== "sent") {
        toast.error("Nenhuma proposta ativa encontrada.");
        return;
      }
      await registerWhatsappAcceptance({
        proposalId: prop.id,
        orderId,
        establishmentId,
        note: note || undefined,
      });
      toast.success("Aceite registrado. Pedido confirmado.");
      setOpenAccept(false);
      setConfirmed(false);
      setNote("");
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao registrar aceite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SendProposalDialog
        orderId={orderId}
        establishmentId={establishmentId}
        defaultSubtotal={Number(subtotal || 0)}
        defaultDeliveryFee={Number(deliveryFee || 0)}
        onSent={onChanged}
        trigger={
          <Button size={size} variant="outline" className="text-xs">
            <Truck className="size-3.5 mr-1" /> Editar frete
          </Button>
        }
      />

      {showAcceptBtn && (
        <Button
          size={size}
          variant="outline"
          className="text-xs text-emerald-700"
          onClick={() => setOpenAccept(true)}
        >
          <MessageSquareCheck className="size-3.5 mr-1" /> Aceite WhatsApp
        </Button>
      )}

      <AlertDialog open={openAccept} onOpenChange={setOpenAccept}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar aceite recebido pelo WhatsApp</AlertDialogTitle>
            <AlertDialogDescription>
              Use esta opção quando o cliente já confirmou o valor final pelo WhatsApp.
              O pedido será marcado como confirmado pela loja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Observação (opcional)</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Cliente confirmou às 14h pelo WhatsApp"
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(!!v)}
              />
              <span>Confirmo que o cliente aceitou este valor pelo WhatsApp.</span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirmAccept(); }} disabled={busy || !confirmed}>
              {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Registrar aceite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function flowStatusBadge(s?: string | null):
  | { label: string; className: string }
  | null {
  switch (s) {
    case "proposal_sent_to_customer":
      return { label: "Aguardando aceite", className: "border-amber-300 bg-amber-50 text-amber-900" };
    case "customer_accepted":
    case "confirmed":
      return { label: "Cliente aceitou", className: "border-emerald-300 bg-emerald-50 text-emerald-900" };
    case "customer_rejected":
      return { label: "Cliente recusou", className: "border-red-300 bg-red-50 text-red-900" };
    case "waiting_business_review":
      return { label: "Frete a definir", className: "border-slate-300 bg-slate-50 text-slate-700" };
    default:
      return null;
  }
}

export function requiresCustomerAcceptance(opts: {
  addressId: string | null;
  flowStatus?: string | null;
}): boolean {
  if (!opts.addressId) return false; // retirada/local
  const ok = ["customer_accepted", "confirmed", "not_required"];
  return !ok.includes(opts.flowStatus ?? "");
}