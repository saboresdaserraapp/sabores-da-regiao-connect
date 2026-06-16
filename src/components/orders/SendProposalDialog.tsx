import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendProposal } from "@/lib/orderProposals";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

type Props = {
  orderId: string;
  establishmentId: string;
  defaultSubtotal: number;
  defaultDeliveryFee: number;
  onSent?: () => void;
  trigger?: React.ReactNode;
};

export function SendProposalDialog({
  orderId,
  establishmentId,
  defaultSubtotal,
  defaultDeliveryFee,
  onSent,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subtotal, setSubtotal] = useState<string>(String(defaultSubtotal ?? 0));
  const [fee, setFee] = useState<string>(String(defaultDeliveryFee ?? 0));
  const [discount, setDiscount] = useState<string>("");
  const [extra, setExtra] = useState<string>("");
  const [prep, setPrep] = useState<string>("");
  const [del, setDel] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const total =
    Number(subtotal || 0) +
    Number(fee || 0) +
    Number(extra || 0) -
    Number(discount || 0);

  const onSubmit = async () => {
    setBusy(true);
    try {
      await sendProposal({
        orderId,
        establishmentId,
        subtotal: Number(subtotal || 0),
        deliveryFee: Number(fee || 0),
        discount: discount ? Number(discount) : null,
        extraFee: extra ? Number(extra) : null,
        total,
        prepMin: prep ? Number(prep) : null,
        deliveryMin: del ? Number(del) : null,
        note: note || null,
      });
      toast.success("Proposta enviada ao cliente");
      setOpen(false);
      onSent?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar proposta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="w-full">
            <Send className="mr-2 size-4" /> Definir taxa e enviar proposta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar proposta de confirmação</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subtotal" v={subtotal} set={setSubtotal} />
          <Field label="Taxa de entrega" v={fee} set={setFee} />
          <Field label="Desconto (opcional)" v={discount} set={setDiscount} />
          <Field label="Acréscimo (opcional)" v={extra} set={setExtra} />
          <Field label="Prazo preparo (min)" v={prep} set={setPrep} step="1" />
          <Field label="Prazo entrega (min)" v={del} set={setDel} step="1" />
        </div>
        <div className="space-y-2">
          <Label>Observação para o cliente</Label>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">Total final</span>
          <span className="font-bold">
            {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            Enviar proposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  v,
  set,
  step = "0.01",
}: {
  label: string;
  v: string;
  set: (s: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} min="0" value={v} onChange={(e) => set(e.target.value)} />
    </div>
  );
}