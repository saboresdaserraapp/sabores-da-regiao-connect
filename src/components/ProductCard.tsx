import { Link } from "react-router-dom";
import { useState } from "react";
import { Star, Flame, Award, Sparkles, Plus } from "lucide-react";
import type { ProductWithEstablishment } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { ProductQuickView } from "./ProductQuickView";

interface Props {
  p: ProductWithEstablishment;
  variant?: "grid" | "list" | "compact";
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProductCard({ p, variant = "grid" }: Props) {
  const [open, setOpen] = useState(false);
  const e = p.establishment;
  const href = `/loja/${e.slug}#product-${p.id}`;
  const isPromo = p.promo && p.promotional_price && Number(p.promotional_price) < Number(p.price);
  const oldPrice = isPromo ? p.price : null;
  const displayPrice = isPromo ? p.promotional_price : p.price;
  const unavailable = !e.openNow;

  const handleClick = (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setOpen(true);
  };

  if (variant === "list") {
    return (
      <>
        <Link
          to={href}
          onClick={handleClick}
          className={cn(
            "group flex gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
            unavailable && "opacity-75 saturate-[0.85]"
          )}
        >
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-32">
            <img src={p.image} alt={p.name} loading="lazy" className={cn("size-full object-cover transition-transform duration-500 group-hover:scale-105", unavailable && "grayscale-[0.35]")} />
            {unavailable && (
              <span className="absolute inset-x-1 bottom-1 rounded-md bg-background/85 px-1.5 py-0.5 text-center text-[10px] font-semibold text-foreground backdrop-blur">
                Loja fechada
              </span>
            )}
            {isPromo && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                <Flame className="size-3" /> {p.promotion_label || "Promo"}
              </span>
            )}
            <FavoriteButton kind="product" targetId={p.id} size="sm" className="absolute right-1.5 top-1.5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-semibold leading-tight text-balance">{p.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3 fill-accent text-accent" />
                {e.rating.toFixed(1)}
              </div>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground text-pretty">{p.description}</p>
            <div className="mt-auto flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <img src={e.logo} alt="" className="size-5 rounded-full object-cover" />
                <span className="truncate">{e.name}</span>
              </div>
              <div className="text-right">
                {oldPrice && <div className="text-[11px] text-muted-foreground line-through">{fmt(Number(oldPrice))}</div>}
                <div className="font-display text-lg font-bold text-primary">{fmt(Number(displayPrice))}</div>
              </div>
            </div>
          </div>
        </Link>
        <ProductQuickView productId={p.id} establishmentId={e.id} isOpen={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Link
        to={href}
        onClick={handleClick}
        className={cn(
          "group block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
          variant === "compact" ? "w-56 shrink-0" : "",
          unavailable && "opacity-75 saturate-[0.85]"
        )}
      >
        <div className="relative h-40 overflow-hidden">
          <img src={p.image} alt={p.name} loading="lazy" className={cn("size-full object-cover transition-transform duration-500 group-hover:scale-105", unavailable && "grayscale-[0.35] brightness-90")} />
          {unavailable && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-2">
              <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                Indisponível — loja fechada
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <div className="flex flex-col gap-1">
              {isPromo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Flame className="size-3" /> {p.promotion_label || "Promo"}
                </span>
              )}
              {p.popular && !isPromo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  <Award className="size-3" /> Top
                </span>
              )}
              {e.menuType === "exclusivo" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                  <Sparkles className="size-3" /> Artesanal
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <FavoriteButton kind="product" targetId={p.id} size="sm" />
              <div className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground backdrop-blur">
                <Star className="size-3 fill-accent text-accent" /> {e.rating.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 translate-y-8 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <div className="rounded-full bg-primary p-2 text-primary-foreground shadow-lg">
              <Plus className="size-5" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5 p-3">
          <h3 className="line-clamp-1 font-display text-base font-semibold leading-tight text-balance">{p.name}</h3>
          <p className="line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground text-pretty">{p.description}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <img src={e.logo} alt="" className="size-4 rounded-full object-cover" />
            <span className="truncate">{e.name}</span>
          </div>
          <div className="flex items-end justify-between pt-1">
            <div>
              {oldPrice && <div className="text-[10px] text-muted-foreground line-through">{fmt(Number(oldPrice))}</div>}
              <div className="font-display text-lg font-bold text-primary">{fmt(Number(displayPrice))}</div>
            </div>
            <span className="text-[10px] text-muted-foreground">{e.etaMin}min</span>
          </div>
        </div>
      </Link>
      <ProductQuickView productId={p.id} establishmentId={e.id} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
