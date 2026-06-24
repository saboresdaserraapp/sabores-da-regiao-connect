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

  const run = async (key: string, fn: () => Promise<{ data: unknown; error: { message: string } | null }>) => {
    setBusy(key);
    try {
      const { data, error } = await fn();
      if (error) throw error;
      const payload = data as { ok?: boolean; duplicated?: boolean } | null;
      if (payload?.duplicated) toast.info("Sem alteração — já estava registrado.");
      else toast.success("Registrado na linha do tempo.");
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
        disabled={busy === "avail"}
        onClick={() => run("avail", () =>
          supabase.rpc("mark_order_availability" as never, { _order_id: orderId, _note: null } as never),
        )}
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
            type="button" variant="secondary" disabled={busy === "eta" || !eta}
            onClick={() => run("eta", () =>
              supabase.rpc("mark_order_eta" as never, { _order_id: orderId, _minutes: Number(eta), _note: null } as never),
            )}
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
            type="button" variant="secondary" disabled={busy === "total" || total === ""}
            onClick={() => run("total", () =>
              supabase.rpc("mark_order_final_value" as never, { _order_id: orderId, _total: Number(total), _note: null } as never),
            )}
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