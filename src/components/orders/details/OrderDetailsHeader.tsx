import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/orderStatusLabels";

interface Props {
  trackingCode: string | null;
  createdAt: string;
  status: string;
  establishmentName?: string | null;
  establishmentLogo?: string | null;
}

export function OrderDetailsHeader({
  trackingCode,
  createdAt,
  status,
  establishmentName,
  establishmentLogo,
}: Props) {
  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/minha-conta?tab=pedidos">
          <ArrowLeft className="size-4 mr-1" /> Voltar para Meus Pedidos
        </Link>
      </Button>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        {establishmentLogo && (
          <img
            src={establishmentLogo}
            alt=""
            className="size-12 rounded-full object-cover shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Detalhes do pedido
          </div>
          <div className="truncate font-semibold text-lg">
            {establishmentName ?? "Pedido"}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {trackingCode && <span className="font-mono">{trackingCode}</span>}
            <span>·</span>
            <span>{new Date(createdAt).toLocaleString("pt-BR")}</span>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {statusLabel(status)}
        </Badge>
      </div>
    </div>
  );
}