import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import { CATEGORIES, type ProductWithEstablishment, type CategoryKey } from "@/data/catalogTypes";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  products: ProductWithEstablishment[];
  seeAllHref?: string;
}

export function ProductRow({ title, subtitle, products, seeAllHref }: Props) {
  const [cat, setCat] = useState<CategoryKey | null>(null);

  const available = useMemo(() => {
    const present = new Set(products.map(p => p.establishment.category));
    return CATEGORIES.filter(c => present.has(c.key));
  }, [products]);

  const list = useMemo(
    () => (cat ? products.filter(p => p.establishment.category === cat) : products),
    [products, cat]
  );

  if (!products.length) return null;

  return (
    <section className="container py-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {seeAllHref && (
          <Link to={seeAllHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver todos <ChevronRight className="size-4" />
          </Link>
        )}
      </div>

      {available.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
          <button
            onClick={() => setCat(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
            )}
          >
            Todas
          </button>
          {available.map(c => {
            const active = cat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCat(active ? null : c.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                )}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {list.map(p => (
          <ProductCard key={`${p.establishment.id}-${p.id}`} p={p} variant="compact" />
        ))}
        {!list.length && (
          <div className="py-8 text-sm text-muted-foreground">Nenhum produto nesta categoria.</div>
        )}
      </div>
    </section>
  );
}
