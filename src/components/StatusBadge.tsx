import { cn } from "@/lib/utils";
import { Check, Star, Truck, ShoppingBag, Utensils, MapPin, Sparkles, Tag, Clock } from "lucide-react";
import type { ReactNode } from "react";

type Variant =
  | "aberto" | "fechado" | "entrega" | "retirada" | "local"
  | "verificado" | "recomendado" | "turistas" | "promocao";

const styles: Record<Variant, string> = {
  aberto: "bg-success/15 text-success border-success/20",
  fechado: "bg-muted text-muted-foreground border-border",
  entrega: "bg-primary/10 text-primary border-primary/20",
  retirada: "bg-secondary/10 text-secondary border-secondary/20",
  local: "bg-accent/15 text-accent-foreground border-accent/30",
  verificado: "bg-secondary text-secondary-foreground border-transparent",
  recomendado: "bg-accent text-accent-foreground border-transparent",
  turistas: "bg-primary text-primary-foreground border-transparent",
  promocao: "bg-destructive/10 text-destructive border-destructive/20",
};

const icons: Record<Variant, ReactNode> = {
  aberto: <Clock className="size-3" />,
  fechado: <Clock className="size-3" />,
  entrega: <Truck className="size-3" />,
  retirada: <ShoppingBag className="size-3" />,
  local: <Utensils className="size-3" />,
  verificado: <Check className="size-3" />,
  recomendado: <Star className="size-3" />,
  turistas: <MapPin className="size-3" />,
  promocao: <Tag className="size-3" />,
};

const labels: Record<Variant, string> = {
  aberto: "Aberto agora",
  fechado: "Fechado",
  entrega: "Entrega",
  retirada: "Retirada",
  local: "Comer no local",
  verificado: "Verificado",
  recomendado: "Recomendado por moradores",
  turistas: "Bom para turistas",
  promocao: "Promoção ativa",
};

export function StatusBadge({ variant, compact, className }: { variant: Variant; compact?: boolean; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
      styles[variant], className
    )}>
      {icons[variant]}
      {!compact && <span>{labels[variant]}</span>}
    </span>
  );
}

export { Sparkles };
