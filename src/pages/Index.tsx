import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { ProductRow } from "@/components/ProductRow";
import { CATEGORIES } from "@/data/mockData";
import { usePublicEstablishments, usePublicProducts } from "@/hooks/usePublicCatalog";
import { Search, Filter, Sparkles, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/track";
import { BannerCarousel } from "@/components/banners/BannerCarousel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";



const QUICK_FILTERS = [
  { key: "aberto", label: "Aberto agora" },
  { key: "entrega", label: "Entrega" },
  { key: "retirada", label: "Retirada" },
  { key: "local", label: "Comer no local" },
  { key: "promocao", label: "Promoções" },
  { key: "top", label: "Melhor avaliados" },
  { key: "perto", label: "Perto de mim" },
  { key: "turistas", label: "Bom para turistas" },
] as const;

const Index = () => {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const { data: establishments = [], isLoading: estabsLoading, isError: estabsError, refetch: refetchEstabs } = usePublicEstablishments();
  const { data: allProducts = [] } = usePublicProducts();

  useEffect(() => { trackEvent("pageview", { meta: { route: "/" } }); }, []);


  const toggleFilter = (k: string) =>
    setFilters(f => f.includes(k) ? f.filter(x => x !== k) : [...f, k]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const estabIdsByProduct = q
      ? new Set(
          allProducts
            .filter(p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
            .map(p => p.establishment.id)
        )
      : null;
    return establishments.filter(e => {
      if (q) {
        const matches =
          e.name.toLowerCase().includes(q) ||
          e.categoryLabel.toLowerCase().includes(q) ||
          (estabIdsByProduct?.has(e.id) ?? false);
        if (!matches) return false;
      }
      if (activeCat && e.category !== activeCat) return false;
      if (filters.includes("aberto") && !e.openNow) return false;
      if (filters.includes("entrega") && !e.services.includes("entrega")) return false;
      if (filters.includes("retirada") && !e.services.includes("retirada")) return false;
      if (filters.includes("local") && !e.services.includes("local")) return false;
      if (filters.includes("promocao") && !e.badges.includes("promocao")) return false;
      if (filters.includes("turistas") && !e.badges.includes("turistas")) return false;
      if (filters.includes("top") && e.rating < 4.7) return false;
      if (filters.includes("perto") && e.distanceKm > 2) return false;
      return true;
    });
  }, [establishments, allProducts, query, activeCat, filters]);

  // Abertos primeiro, fechados (mas bem ranqueados) depois — em todas as seções
  const orderByOpenThenRating = (arr: typeof list) =>
    arr.slice().sort((a, b) => {
      if (a.openNow !== b.openNow) return a.openNow ? -1 : 1;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.reviewsCount - a.reviewsCount;
    });
  const destaques = orderByOpenThenRating(list);
  const promos = orderByOpenThenRating(list.filter(e => e.badges.includes("promocao")));
  const recomendados = orderByOpenThenRating(list.filter(e => e.badges.includes("recomendado")));
  const turismo = orderByOpenThenRating(list.filter(e => e.badges.includes("turistas")));
  const maisPedidos = list.slice().sort((a, b) => {
    if (a.openNow !== b.openNow) return a.openNow ? -1 : 1;
    return b.reviewsCount - a.reviewsCount;
  });

  return (
    <div className="min-h-screen bg-gradient-cream pb-20">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-warm opacity-95" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "40px 40px, 60px 60px" }} />
        <div className="container relative py-12 sm:py-16">
          <div className="max-w-2xl text-primary-foreground">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="size-3.5" /> Plataforma regional de gastronomia
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Descubra os sabores<br />da sua região
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-primary-foreground/90 sm:text-lg">
              Restaurantes, pizzarias, cafés e mais — pedido pronto e enviado direto no WhatsApp do estabelecimento.
            </p>
            <div className="mt-7 flex items-center gap-2 rounded-2xl bg-card p-2 shadow-elevated ring-1 ring-black/5">
              <Search className="ml-2 size-5 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar restaurante, prato, categoria..."
                className="flex-1 bg-transparent py-2 text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Buscar"
              />
              <button className="hidden items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/85 sm:inline-flex">
                <Filter className="size-4" /> Filtros
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick filters */}
      <section className="container py-5">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {QUICK_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97]",
                filters.includes(f.key)
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >{f.label}</button>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="container py-2">
        <h2 className="mb-3 font-display text-xl font-semibold tracking-tight">Categorias</h2>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
          {CATEGORIES.map(c => {
            const active = activeCat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCat(active ? null : c.key)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition-all duration-200 ease-out min-w-[92px] active:scale-[0.97]",
                  active
                    ? "border-primary bg-primary/10 text-primary shadow-soft"
                    : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
                )}
              >
                <span className="text-2xl leading-none">{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Banner home topo */}
      <section className="container py-4">
        <BannerCarousel placement="home_top" categoryKey={activeCat || undefined} />
      </section>

      {list.length === 0 ? (
        <section className="container py-8">
          <EmptyState
            icon={SearchX}
            title="Nenhum estabelecimento encontrado"
            description="Tente remover alguns filtros ou ajustar sua busca para ver mais opções."
            action={
              <Button variant="outline" size="sm" onClick={() => { setQuery(""); setActiveCat(null); setFilters([]); }}>
                Limpar filtros
              </Button>
            }
          />
        </section>
      ) : (
        <Section title="Em destaque agora" items={destaques} />
      )}

      <ProductsSections activeCat={activeCat} query={query} />

      {/* Banner meio da home — estilo portal */}
      <section className="container py-2">
        <BannerCarousel placement="home_mid" categoryKey={activeCat || undefined} aspect="banner" />
      </section>

      <Section title="Promoções de hoje" items={promos} />
      <Section title="Recomendados por moradores" items={recomendados} />
      <Section title="Mais pedidos da região" items={maisPedidos} />
      <Section title="Visitando a região" items={turismo} />



      <footer className="container mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Sabores da Região · Os pedidos são confirmados diretamente com cada estabelecimento via WhatsApp.
      </footer>
      
    </div>
  );
};

function Section({ title, items }: { title: string; items: any[] }) {
  if (!items.length) return null;
  return (
    <section className="container py-7">
      <div className="mb-4 flex items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "lugar" : "lugares"}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(e => <EstablishmentCard key={e.id} e={e} />)}
      </div>
    </section>
  );
}

function ProductsSections({ activeCat, query }: { activeCat: string | null; query: string }) {
  const { data: all = [] } = usePublicProducts();
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(p => {
      if (activeCat && p.establishment.category !== activeCat) return false;
      if (q) {
        const matches =
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          p.establishment.name.toLowerCase().includes(q) ||
          p.establishment.categoryLabel.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [all, activeCat, query]);
  // Disponíveis (loja aberta) primeiro, indisponíveis bem ranqueados depois
  const openFirst = <T extends { establishment: { openNow: boolean } }>(arr: T[]) =>
    arr.slice().sort((a, b) => (a.establishment.openNow === b.establishment.openNow ? 0 : a.establishment.openNow ? -1 : 1));
  const vendidos = openFirst(
    scoped.filter(p => p.popular).sort((a, b) => b.establishment.reviewsCount - a.establishment.reviewsCount)
  );
  const avaliados = openFirst(
    scoped.filter(p => p.establishment.rating >= 4.7).sort((a, b) => b.establishment.rating - a.establishment.rating)
  );
  const promos = openFirst(scoped.filter(p => p.promo));

  return (
    <>
      <ProductRow title="Mais vendidos do app" subtitle="Os produtos favoritos da galera" products={vendidos} seeAllHref="/loja?ord=vendidos" />
      <ProductRow title="Mais bem avaliados" subtitle="Notas altas de quem já provou" products={avaliados} seeAllHref="/loja?ord=avaliados" />
      <ProductRow title="Em promoção" subtitle="Aproveite enquanto durar" products={promos} seeAllHref="/loja?ord=promo" />
    </>
  );
}

export default Index;

