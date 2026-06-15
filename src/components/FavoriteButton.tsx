import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites, useFavoriteToggle, type FavoriteKind } from "@/hooks/useFavorites";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function FavoriteButton({ kind, targetId, className, size = "md" }: {
  kind: FavoriteKind;
  targetId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { data: favs } = useFavorites();
  const toggle = useFavoriteToggle();
  // Mock data ids ("1", "2") não são UUIDs — favoritos só fazem sentido para entidades reais
  if (!UUID_RE.test(targetId)) return null;
  const active = !!favs?.some((f: any) => f.kind === kind && f.target_id === targetId);
  const dim = size === "sm" ? "size-7" : "size-9";
  const icon = size === "sm" ? "size-3.5" : "size-4";
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(kind, targetId); }}
      aria-label={active ? "Remover dos favoritos" : "Favoritar"}
      className={cn(
        "grid place-items-center rounded-full border border-border bg-background/90 backdrop-blur transition-colors hover:border-primary",
        dim, className
      )}
    >
      <Heart className={cn(icon, active ? "fill-primary text-primary" : "text-muted-foreground")} />
    </button>
  );
}
