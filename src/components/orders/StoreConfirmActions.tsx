import { useState } from "react";
import { Loader2, Check, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  orderId: string;
  estimatedMinutes: number | null;
  finalTotal: number | null;
  availabilityConfirmedAt: string | null;
  onChanged?: () => void;
};

export function StoreConfirmActions({
  orderId, estimatedMinutes, finalTotal, availabilityConfirmedAt, onChanged,
}: Props) {
  const [eta, setEta] = useState<string>(estimatedMinutes != null ? String(estimatedMinutes) : "");
  const [total, setTotal] = useState<string>(finalTotal != null ? String(finalTotal) : "");
  const [busy, setBusy] = useState<string | null>(null);

  const LABELS: Record<string, { ok: string; dup: string }> = {
    avail: { ok: "Disponibilidade confirmada.", dup: "Disponibilidade já estava confirmada." },
    eta:   { ok: "Prazo informado ao cliente.",  dup: "Prazo já estava registrado com esse valor." },
    total: { ok: "Valor final enviado ao cliente.", dup: "Valor final já estava registrado." },
  };

  const run = async (key: string, rpc: string, args: Record<string, unknown>) => {
    if (busy) return; // evita cliques duplicados em qualquer botão
    setBusy(key);
    try {
      const { data, error } = await supabase.rpc(rpc as never, args as never);
      if (error) throw error;
      const payload = data as { ok?: boolean; duplicated?: boolean } | null;
      const label = LABELS[key] ?? { ok: "Registrado na linha do tempo.", dup: "Sem alteração — já estava registrado." };
      if (payload?.duplicated) toast.info(label.dup);
      else toast.success(label.ok);
      onChanged?.();
    } catch (err) {
      toast.error((err as Error)?.message || "Erro");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-primary">
        Confirmações para o cliente
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        disabled={!!busy}
        onClick={() => run("avail", "mark_order_availability", { _order_id: orderId, _note: null })}
      >
        {busy === "avail" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
        Confirmar disponibilidade
        {availabilityConfirmedAt && <span className="ml-auto text-[10px] text-success">já confirmada</span>}
      </Button>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-wider">Prazo estimado (min)</Label>
        <div className="flex gap-2">
          <Input
            type="number" min={1} step={1} value={eta}
            onChange={(e) => setEta(e.target.value)} placeholder="Ex.: 45"
          />
          <Button
            type="button" variant="secondary" disabled={!!busy || !eta}
            onClick={() => run("eta", "mark_order_eta", { _order_id: orderId, _minutes: Number(eta), _note: null })}
          >
            {busy === "eta" ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-wider">Valor final (R$)</Label>
        <div className="flex gap-2">
          <Input
            type="number" min={0} step="0.01" value={total}
            onChange={(e) => setTotal(e.target.value)} placeholder="Ex.: 89,90"
          />
          <Button
            type="button" variant="secondary" disabled={!!busy || total === ""}
            onClick={() => run("total", "mark_order_final_value", { _order_id: orderId, _total: Number(total), _note: null })}
          >
            {busy === "total" ? <Loader2 className="size-4 animate-spin" /> : <DollarSign className="size-4" />}
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Cada confirmação aparece na linha do tempo pública do pedido sem duplicar — clicar
        novamente com o mesmo valor não gera novo evento.
      </p>
    </div>
  );
}