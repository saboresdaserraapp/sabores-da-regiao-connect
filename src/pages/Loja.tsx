import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { LojaFilters, DEFAULT_FILTERS, type LojaFiltersState } from "@/components/LojaFilters";
import { CATEGORIES, type CategoryKey } from "@/data/catalogTypes";
import { usePublicProducts } from "@/hooks/usePublicCatalog";
import { Search, SlidersHorizontal, LayoutGrid, List, ShoppingBag, SearchX } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BannerCarousel } from "@/components/banners/BannerCarousel";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type SortKey = "relevancia" | "vendidos" | "avaliados" | "preco-asc" | "preco-desc" | "perto" | "promo";

const SORT_LABEL: Record<SortKey, string> = {
  relevancia: "Relevância",
  vendidos: "Mais vendidos",
  avaliados: "Melhor avaliados",
  "preco-asc": "Menor preço",
  "preco-desc": "Maior preço",
  perto: "Mais perto",
  promo: "Promoções primeiro",
};

const Loja = () => {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<LojaFiltersState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("relevancia");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Hydrate from URL params (?ord=, ?cat=)
  useEffect(() => {
    const ord = params.get("ord") as SortKey | null;
    const cat = params.get("cat") as CategoryKey | null;
    if (ord && SORT_LABEL[ord]) setSort(ord);
    if (cat && CATEGORIES.some(c => c.key === cat)) {
      setFilters(f => (f.cats.includes(cat) ? f : { ...f, cats: [cat] }));
    }
  }, [params]);

  const { data: all = [], isLoading, isError, refetch } = usePublicProducts();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = all.filter(p => {
      const e = p.establishment;
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !e.name.toLowerCase().includes(q)) return false;
      if (filters.cats.length && !filters.cats.includes(e.category)) return false;
      const [pmin, pmax] = filters.price;
      if (p.price < pmin) return false;
      if (pmax < 100 && p.price > pmax) return false;
      if (e.distanceKm > filters.maxDistance) return false;
      if (e.rating < filters.minRating) return false;
      if (filters.services.length && !filters.services.every(s => e.services.includes(s as "entrega" | "retirada" | "local"))) return false;
      for (const st of filters.styles) {
        if (st === "promo" && !p.promo) return false;
        if (st === "popular" && !p.popular) return false;
        if (st === "artesanal" && e.menuType !== "exclusivo" && !e.badges.includes("recomendado")) return false;
        if (st === "aberto" && !e.openNow) return false;
        if (st === "recomendado" && !e.badges.includes("recomendado")) return false;
        if (st === "turistas" && !e.badges.includes("turistas")) return false;
      }
      return true;
    });

    switch (sort) {
      case "vendidos":
        out = out.sort((a, b) => Number(b.popular ?? 0) - Number(a.popular ?? 0) || b.establishment.reviewsCount - a.establishment.reviewsCount);
        break;
      case "avaliados":
        out = out.sort((a, b) => b.establishment.rating - a.establishment.rating);
        break;
      case "preco-asc":
        out = out.sort((a, b) => a.price - b.price);
        break;
      case "preco-desc":
        out = out.sort((a, b) => b.price - a.price);
        break;
      case "perto":
        out = out.sort((a, b) => a.establishment.distanceKm - b.establishment.distanceKm);
        break;
      case "promo":
        out = out.sort((a, b) => Number(b.promo ?? 0) - Number(a.promo ?? 0));
        break;
    }
    // Disponíveis (loja aberta) primeiro; indisponíveis bem ranqueados depois
    return out.slice().sort((a, b) => {
      if (a.establishment.openNow === b.establishment.openNow) return 0;
      return a.establishment.openNow ? -1 : 1;
    });
  }, [all, query, filters, sort]);

  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...filters.cats.map(c => ({
      key: `cat-${c}`,
      label: CATEGORIES.find(x => x.key === c)?.label ?? c,
      remove: () => setFilters({ ...filters, cats: filters.cats.filter(x => x !== c) }),
    })),
    ...filters.styles.map(s => ({
      key: `st-${s}`,
      label: s,
      remove: () => setFilters({ ...filters, styles: filters.styles.filter(x => x !== s) }),
    })),
    ...filters.services.map(s => ({
      key: `sv-${s}`,
      label: s,
      remove: () => setFilters({ ...filters, services: filters.services.filter(x => x !== s) }),
    })),
    ...(filters.minRating > 0
      ? [{ key: "rating", label: `${filters.minRating}+`, remove: () => setFilters({ ...filters, minRating: 0 }) }]
      : []),
    ...(filters.price[0] > 0 || filters.price[1] < 100
      ? [{
          key: "price",
          label: `R$ ${filters.price[0]}–${filters.price[1]}`,
          remove: () => setFilters({ ...filters, price: [0, 100] }),
        }]
      : []),
  ];

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery("");
    setSort("relevancia");
    setParams({});
  };

  return (
    <div className="min-h-screen bg-gradient-cream pb-20">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-warm opacity-95" />
        <div className="container relative py-10 sm:py-12">
          <div className="max-w-2xl text-primary-foreground">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <ShoppingBag className="size-3.5" /> Loja completa
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">Todos os produtos da região</h1>
            <p className="mt-3 max-w-xl text-pretty text-primary-foreground/90">Combine filtros e ordenações pra achar exatamente o que você quer.</p>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-card p-2 shadow-elevated ring-1 ring-black/5">
              <Search className="ml-2 size-5 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar produto, descrição ou loja..."
                className="flex-1 bg-transparent py-2 text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Buscar produtos"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container py-6">
        <BannerCarousel placement="loja_top" className="mb-6" />
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar desktop */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-card">
              <LojaFilters value={filters} onChange={setFilters} onReset={reset} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span>Carregando produtos...</span>
                ) : (
                  <>
                    <strong className="text-foreground">{filtered.length}</strong> produto{filtered.length === 1 ? "" : "s"}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="mr-1 size-4" /> Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <LojaFilters value={filters} onChange={setFilters} onReset={reset} />
                    </div>
                  </SheetContent>
                </Sheet>

                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
                      <SelectItem key={k} value={k}>{SORT_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex overflow-hidden rounded-md border border-border">
                  <button
                    onClick={() => setView("grid")}
                    className={cn("p-2", view === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
                    aria-label="Visualização em grade"
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className={cn("p-2", view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
                    aria-label="Visualização em lista"
                  >
                    <List className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active chips */}
            {activeChips.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {activeChips.map(c => (
                  <button
                    key={c.key}
                    onClick={c.remove}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    {c.label} <span className="text-base leading-none">×</span>
                  </button>
                ))}
                <button onClick={reset} className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
                  Limpar tudo
                </button>
              </div>
            )}

            {/* Results */}
            {isLoading ? (
              <LoadingState variant="page" label="Carregando produtos..." />
            ) : isError ? (
              <ErrorState
                title="Não foi possível carregar a vitrine"
                description="Verifique sua conexão e tente novamente."
                onRetry={() => refetch()}
              />
            ) : all.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Novas lojas chegando em breve"
                description="Estamos preparando o catálogo da sua região. Volte em instantes para conferir as novidades."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Nenhum produto encontrado"
                description="Tente ajustar os filtros ou a busca para encontrar o que procura."
                action={<Button onClick={reset} variant="outline" size="sm">Limpar filtros</Button>}
              />
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map(p => (
                  <ProductCard key={`${p.establishment.id}-${p.id}`} p={p} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(p => (
                  <ProductCard key={`${p.establishment.id}-${p.id}`} p={p} variant="list" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loja;
