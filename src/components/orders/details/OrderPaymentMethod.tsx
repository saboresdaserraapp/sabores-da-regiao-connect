import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  dinheiro: "Dinheiro",
  credit: "Cartão de crédito",
  credito: "Cartão de crédito",
  credit_card: "Cartão de crédito",
  debit: "Cartão de débito",
  debito: "Cartão de débito",
  debit_card: "Cartão de débito",
  card: "Cartão",
  online: "Pagamento online",
};

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  awaiting: { label: "Aguardando", variant: "secondary" },
  refused: { label: "Recusado", variant: "destructive" },
  refunded: { label: "Estornado", variant: "outline" },
};

interface Props {
  method: string | null;
  intent?: string | null;
  status?: string | null;
}

export function OrderPaymentMethod({ method, intent, status }: Props) {
  const raw = (method ?? intent ?? "").toLowerCase();
  const label = METHOD_LABELS[raw] ?? (method || intent || "Não informado");
  const st = status ? STATUS_LABELS[status.toLowerCase()] : null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
      <div className="flex items-center gap-2">
        <CreditCard className="size-4 text-muted-foreground" />
        <div>
          <div className="text-xs text-muted-foreground">Pagamento</div>
          <div className="font-medium capitalize">{label}</div>
        </div>
      </div>
      {st && <Badge variant={st.variant}>{st.label}</Badge>}
    </div>
  );
}