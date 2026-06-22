import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MapPin, Clock, Phone, Share2, Navigation, Star, ShoppingBag, MessageCircle, Loader2, Info, Plus, X, Minus, Flame, Ban, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { StatusBadge } from "@/components/StatusBadge";
import { brl } from "@/lib/format";
import { cart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/track";
import { useEstablishmentTheme } from "@/hooks/useEstablishmentTheme";
import { BannerCarousel } from "@/components/banners/BannerCarousel";
import { useQuery } from "@tanstack/react-query";
import { FavoriteButton } from "@/components/FavoriteButton";
import { toast } from "sonner";
import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const FONT_PAIR_CLASS: Record<string, string> = {
  modern: "",
  rustic: "[--font-display:'Lora',serif]",
  elegant: "[--font-display:'Playfair_Display',serif]",
  playful: "[--font-display:'Caveat',cursive]",
};


function getProductPrice(p: any) {
  const now = new Date();
  const hasV2Promo = p.promotional_price && 
    (!p.promotion_starts_at || new Date(p.promotion_starts_at) <= now) &&
    (!p.promotion_ends_at || new Date(p.promotion_ends_at) >= now);
  
  if (hasV2Promo) return Number(p.promotional_price);
  if (p.promo && p.promotional_price) return Number(p.promotional_price);
  return Number(p.price || 0);
}

function getProductOriginalPrice(p: any) {
  return Number(p.price || 0);
}

function isProductInPromo(p: any) {
  const now = new Date();
  const hasV2Promo = p.promotional_price && 
    (!p.promotion_starts_at || new Date(p.promotion_starts_at) <= now) &&
    (!p.promotion_ends_at || new Date(p.promotion_ends_at) >= now);
  
  return !!(hasV2Promo || p.promo);
}

function getProductMainImage(p: any) {
  if (p.product_images?.length) {
    const primary = p.product_images.find((img: any) => img.is_primary);
    if (primary) return primary.image_url;
    return p.product_images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))[0].image_url;
  }
  return p.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836";
}

function ProductGallery({ images, defaultImage, name }: { images?: any[], defaultImage?: string, name: string }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const allImages = useMemo(() => {
    const gallery = (images || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(img => img.image_url);
    if (gallery.length === 0 && defaultImage) return [defaultImage];
    if (gallery.length === 0) return ["https://images.unsplash.com/photo-1504674900247-0877df9cc836"];
    return gallery;
  }, [images, defaultImage]);

  if (allImages.length <= 1) {
    return <img src={allImages[0]} alt={name} className="size-full object-cover" />;
  }

  return (
    <div className="relative size-full group">
      <img src={allImages[currentIdx]} alt={name} className="size-full object-cover transition-all duration-500" />
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCurrentIdx(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCurrentIdx(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <ChevronRight className="size-5" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {allImages.map((_, i) => (
          <div key={i} className={cn("size-1.5 rounded-full transition-all", i === currentIdx ? "bg-white w-4" : "bg-white/50")} />
        ))}
      </div>
    </div>
  );
}

export default function EstablishmentPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const { data: themeData } = useEstablishmentTheme(slug);

  const { data: est, isLoading: loadingEstab } = useQuery({
    queryKey: ["establishment", slug],
    queryFn: async () => {
      const { data, error } = await publicSupabase
        .from("establishments")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      
      if (data) {
        cart.setEstablishment(data.id, data.slug);
        trackEvent("establishment_view", { establishment_id: data.id, neighborhood: data.neighborhood });
      }
      return data;
    },
  });

  const { data: menu = [], isLoading: loadingMenu } = useQuery({
    queryKey: ["establishment-menu", est?.id],
    enabled: !!est?.id,
    queryFn: async () => {
      const [{ data: cats }, { data: products }] = await Promise.all([
        publicSupabase.from("menu_categories").select("*").eq("establishment_id", est!.id).order("position"),
        publicSupabase.from("products")
          .select("*, product_option_groups(*, product_options(*)), product_images(*)")
          .eq("establishment_id", est!.id)
          .order("display_order", { ascending: true })
          .order("name"),
      ]);
      
      const allProducts = products ?? [];
      const sortProds = (arr: any[]) =>
        arr.slice().sort((a, b) => {
          const av = a.is_available === false ? 1 : 0;
          const bv = b.is_available === false ? 1 : 0;
          if (av !== bv) return av - bv;
          const ao = a.display_order ?? 9999;
          const bo = b.display_order ?? 9999;
          if (ao !== bo) return ao - bo;
          return String(a.name).localeCompare(String(b.name));
        });

      const catList = (cats ?? []).map((c) => ({
        ...c,
        products: sortProds(allProducts.filter((p) => p.menu_category_id === c.id)),
      }));

      const knownIds = new Set((cats ?? []).map((c) => c.id));
      const orphanProducts = allProducts.filter(
        (p) => !p.menu_category_id || !knownIds.has(p.menu_category_id),
      );

      const result = catList.filter((c) => c.products.length > 0);
      if (orphanProducts.length > 0) {
        result.push({
          id: "__uncategorized__",
          establishment_id: est!.id,
          name: result.length === 0 ? "Cardápio" : "Outros",
          position: 9999,
          products: sortProds(orphanProducts),
        } as any);
      }
      return result;
    }
  });

  const [visibleItemsCount, setVisibleItemsCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Auto-abre o dialog do produto quando vem com hash #product-<id>
  useEffect(() => {
    if (!menu.length) return;
    const hash = window.location.hash;
    const match = hash.match(/^#product-(.+)$/);
    if (!match) return;
    const productId = match[1];
    for (const cat of menu) {
      const found = (cat as any).products?.find((p: any) => String(p.id) === productId);
      if (found) {
        setSelectedProduct(found);
        setProductOptions([]);
        setQuantity(1);
        // garante que todos os produtos da categoria fiquem visíveis para o scroll
        const idx = menu.indexOf(cat);
        const minVisible = menu.slice(0, idx + 1).reduce((acc: number, c: any) => acc + c.products.length, 0);
        setVisibleItemsCount((v) => Math.max(v, minVisible));
        break;
      }
    }
  }, [menu]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleItemsCount((prev) => prev + 10);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMoreRef.current]);

  const visibleMenu = useMemo(() => {
    let count = 0;
    return menu.map(cat => {
      if (count >= visibleItemsCount) return { ...cat, products: [] };
      const remaining = visibleItemsCount - count;
      const products = cat.products.slice(0, remaining);
      count += products.length;
      return { ...cat, products };
    }).filter(cat => cat.products.length > 0);
  }, [menu, visibleItemsCount]);

  const hasMore = useMemo(() => {
    const totalProducts = menu.reduce((acc, cat) => acc + cat.products.length, 0);
    return visibleItemsCount < totalProducts;
  }, [menu, visibleItemsCount]);

  const loading = loadingEstab || loadingMenu;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!est) {
    return (
      <div className="container flex min-h-screen flex-col items-center justify-center py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Loja não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Esta loja pode estar temporariamente indisponível ou em análise.</p>
        <Link to="/loja" className="mt-6 text-primary underline">Voltar para a busca</Link>
      </div>
    );
  }

  const isExclusivo = est.menu_type === "exclusivo";
  const theme = isExclusivo ? themeData?.theme : null;
  const brandColor = theme?.accent_color || est.brand_color;
  
  const pageStyle: React.CSSProperties = {};
  if (brandColor) (pageStyle as Record<string, string>)["--primary"] = brandColor;
  
  const fontClass = theme ? FONT_PAIR_CLASS[theme.font_pair] ?? "" : "";

  return (
    <div className={cn("relative min-h-screen bg-background pb-28", fontClass)} style={pageStyle}>
      {est && (
        <Helmet>
          <title>{`${est.name} — Sabores da Região`}</title>
          <meta
            name="description"
            content={
              (est.description && String(est.description).slice(0, 160)) ||
              `Peça online em ${est.name}${est.neighborhood ? ` — ${est.neighborhood}` : ""}. Cardápio, preços e pedido direto pelo Sabores da Região.`
            }
          />
          <link rel="canonical" href={`https://saboresapp.lovable.app/loja/${est.slug}`} />
          <meta property="og:type" content="restaurant.restaurant" />
          <meta property="og:title" content={`${est.name} — Sabores da Região`} />
          <meta
            property="og:description"
            content={
              (est.description && String(est.description).slice(0, 160)) ||
              `Peça online em ${est.name}. Cardápio e pedido pelo Sabores da Região.`
            }
          />
          <meta property="og:url" content={`https://saboresapp.lovable.app/loja/${est.slug}`} />
          {(est.cover || est.logo) && <meta property="og:image" content={est.cover || est.logo} />}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${est.name} — Sabores da Região`} />
          {(est.cover || est.logo) && <meta name="twitter:image" content={est.cover || est.logo} />}
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            name: est.name,
            url: `https://saboresapp.lovable.app/loja/${est.slug}`,
            image: est.cover || est.logo || undefined,
            description: est.description || undefined,
            address: est.address ? { "@type": "PostalAddress", streetAddress: est.address, addressLocality: est.neighborhood || undefined } : undefined,
            telephone: est.whatsapp || undefined,
            servesCuisine: est.category || undefined,
            aggregateRating: est.rating ? { "@type": "AggregateRating", ratingValue: est.rating, reviewCount: est.reviews_count || 1 } : undefined,
          })}</script>
        </Helmet>
      )}
      <Dialog open={!!selectedProduct} onOpenChange={(v) => !v && setSelectedProduct(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col border-none bg-background">
          {selectedProduct && (
            <>
              <div className="relative h-56 w-full shrink-0">
                <ProductGallery images={selectedProduct.product_images} defaultImage={selectedProduct.image} name={selectedProduct.name} />
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur shadow-lg z-10"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <DialogTitle className="font-display text-2xl font-bold text-left">{selectedProduct.name}</DialogTitle>
                    {isProductInPromo(selectedProduct) && (
                      <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full animate-pulse uppercase tracking-wider">
                        {selectedProduct.promotion_label || "Promoção"}
                      </span>
                    )}
                  </div>
                  {selectedProduct.tags_json && Array.isArray(selectedProduct.tags_json) && selectedProduct.tags_json.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedProduct.tags_json.map((tag: any, idx: number) => (
                        <span key={idx} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <DialogDescription className="mt-2 text-sm text-muted-foreground leading-relaxed text-left">
                    {selectedProduct.description}
                  </DialogDescription>
                  <div className="mt-4 flex flex-col items-start gap-1">
                    {isProductInPromo(selectedProduct) ? (
                      <>
                        <span className="text-xs text-muted-foreground line-through decoration-destructive/50">{brl(getProductOriginalPrice(selectedProduct))}</span>
                        <div className="font-display text-3xl font-bold text-primary">
                          {brl(getProductPrice(selectedProduct))}
                        </div>
                      </>
                    ) : (
                      <div className="font-display text-3xl font-bold text-primary">
                        {brl(getProductPrice(selectedProduct))}
                      </div>
                    )}
                  </div>
                </DialogHeader>

                {/* Opcionais V2 (Grupos) */}
                {selectedProduct.product_option_groups && selectedProduct.product_option_groups.length > 0 && (
                  <div className="space-y-8">
                    {selectedProduct.product_option_groups.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((group: any) => (
                      <div key={group.id} className="space-y-4">
                        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                          <div>
                            <h3 className="font-bold text-sm uppercase tracking-wider">{group.name}</h3>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">
                              {group.type === 'single' ? 'Selecione 1' : `Selecione de ${group.min_choices || 0} a ${group.max_choices || 'vários'}`}
                            </p>
                          </div>
                          {group.is_required && (
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">OBRIGATÓRIO</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {group.product_options?.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((opt: any) => {
                            const selectedInGroup = productOptions.filter(o => group.product_options.some((go: any) => go.id === o.id || (go.name === o.name && !go.id)));
                            const currentOpt = productOptions.find(o => o.id === opt.id || (o.name === opt.name && !o.id));
                            const isSelected = !!currentOpt;
                            const currentQty = currentOpt?.quantity || 0;

                            return (
                              <div 
                                key={opt.id} 
                                onClick={() => {
                                  if (opt.is_available === false) {
                                    toast.error("Este adicional não está disponível");
                                    return;
                                  }
                                  if (group.type === 'single') {
                                    const groupOptionIds = group.product_options.map((o: any) => o.id);
                                    const filtered = productOptions.filter(o => !groupOptionIds.includes(o.id));
                                    setProductOptions([...filtered, { ...opt, quantity: 1, group_name: group.name }]);
                                  } else {
                                    if (isSelected && !opt.allow_quantity) {
                                      setProductOptions(productOptions.filter(o => (o.id || o.name) !== (opt.id || opt.name)));
                                    } else if (!isSelected) {
                                      const totalQtyInGroup = selectedInGroup.reduce((acc, o) => acc + (o.quantity || 1), 0);
                                      if (!group.max_choices || totalQtyInGroup < group.max_choices) {
                                        setProductOptions([...productOptions, { ...opt, quantity: 1, group_name: group.name }]);
                                      } else {
                                        toast.error(`Limite de ${group.max_choices} ${group.max_choices === 1 ? 'item' : 'itens'} atingido no grupo "${group.name}"`);
                                      }
                                    }
                                  }
                                }}
                                className={cn(
                                  "flex flex-col p-4 rounded-xl border transition-all cursor-pointer hover:bg-muted/50",
                                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/50",
                                  opt.is_available === false && "opacity-50 grayscale cursor-not-allowed"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {group.type === 'single' ? (
                                      <div className={cn("size-5 rounded-full border flex items-center justify-center", isSelected ? "border-primary" : "border-muted-foreground/30")}>
                                        {isSelected && <div className="size-2.5 rounded-full bg-primary" />}
                                      </div>
                                    ) : (
                                      <div className={cn("size-5 rounded border flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                                        {isSelected && <Plus className="size-3 text-white" strokeWidth={4} />}
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm leading-tight">{opt.name}</span>
                                      {opt.is_available === false && (
                                        <span className="text-[10px] text-destructive font-bold uppercase">Indisponível</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {Number(opt.price) > 0 && (
                                      <span className="text-sm font-bold text-primary">+{brl(Number(opt.price || 0))}</span>
                                    )}
                                  </div>
                                </div>

                                {opt.allow_quantity && isSelected && (
                                  <div className="mt-3 flex items-center justify-between bg-background/50 p-2 rounded-lg border border-primary/20">
                                    <span className="text-xs font-medium text-muted-foreground">Quantidade</span>
                                    <div className="flex items-center gap-3">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newQty = currentQty - 1;
                                          if (newQty <= 0) {
                                            setProductOptions(productOptions.filter(o => (o.id || o.name) !== (opt.id || opt.name)));
                                          } else {
                                            setProductOptions(productOptions.map(o => (o.id || o.name) === (opt.id || opt.name) ? { ...o, quantity: newQty, group_name: group.name } : o));
                                          }
                                        }}
                                        className="size-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                                      >
                                        <Minus className="size-4" />
                                      </button>
                                      <span className="font-bold min-w-[20px] text-center">{currentQty}</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const totalQtyInGroup = selectedInGroup.reduce((acc, o) => acc + (o.quantity || 1), 0);
                                          if (!group.max_choices || totalQtyInGroup < group.max_choices) {
                                            setProductOptions(productOptions.map(o => (o.id || o.name) === (opt.id || opt.name) ? { ...o, quantity: currentQty + 1, group_name: group.name } : o));
                                          } else {
                                            toast.error(`Limite de ${group.max_choices} ${group.max_choices === 1 ? 'item' : 'itens'} atingido no grupo "${group.name}"`);
                                          }
                                        }}
                                        className="size-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                                      >
                                        <Plus className="size-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Opcionais V1 (Fallback JSONB) */}
                {(!selectedProduct.product_option_groups || selectedProduct.product_option_groups.length === 0) && selectedProduct.options && Array.isArray(selectedProduct.options) && selectedProduct.options.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Opcionais</h3>
                    <div className="space-y-3">
                      {selectedProduct.options.map((opt: any, idx: number) => {
                        const isSelected = productOptions.some(o => o.name === opt.name);
                        return (
                          <div 
                            key={idx} 
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:bg-muted/50",
                              isSelected ? "border-primary bg-primary/5" : "border-border/50"
                            )}
                            onClick={() => {
                              if (isSelected) {
                                setProductOptions(productOptions.filter(o => o.name !== opt.name));
                              } else {
                                setProductOptions([...productOptions, { ...opt, group_name: "Opcionais" }]);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSelected} onCheckedChange={() => {}} />
                              <Label className="font-medium cursor-pointer">{opt.name}</Label>
                            </div>
                            {opt.price > 0 && (
                                <span className="text-sm font-bold text-primary">+{brl(Number(opt.price) || 0)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 p-6 border-t border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-full bg-muted/20">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="size-11 flex items-center justify-center hover:bg-muted transition-colors font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="size-11 flex items-center justify-center hover:bg-muted transition-colors font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    disabled={selectedProduct.is_available === false || selectedProduct.is_active === false || (selectedProduct.track_stock && selectedProduct.stock_quantity <= 0 && selectedProduct.auto_pause_when_zero)}
                    onClick={() => {
                      // Verificar disponibilidade
                      if (selectedProduct.is_available === false || selectedProduct.is_active === false) {
                        toast.error("Este produto não está disponível no momento.");
                        return;
                      }

                      // Verificar estoque
                      if (selectedProduct.track_stock && selectedProduct.stock_quantity <= 0 && selectedProduct.auto_pause_when_zero) {
                        toast.error("Este produto está esgotado.");
                        return;
                      }

                      const requiredGroups = selectedProduct.product_option_groups?.filter((g: any) => g.is_required) || [];
                      const missingRequired = requiredGroups.find((g: any) => {
                        const selectedInGroup = productOptions.filter(o => g.product_options.some((go: any) => (go.id && o.id && go.id === o.id) || (go.name === o.name && !go.id)));
                        const currentQty = selectedInGroup.reduce((acc, o) => acc + (o.quantity || 1), 0);
                        return currentQty < (g.min_choices || 1);
                      });

                      if (missingRequired) {
                        toast.error(`A escolha no grupo "${missingRequired.name}" é obrigatória (mínimo ${missingRequired.min_choices || 1})`);
                        return;
                      }

                      cart.add({
                        product: { 
                          ...selectedProduct, 
                          category: selectedProduct.menu_category_id, 
                          image: getProductMainImage(selectedProduct),
                          price: getProductOriginalPrice(selectedProduct),
                          promotional_price: isProductInPromo(selectedProduct) ? getProductPrice(selectedProduct) : null
                        },
                        quantity,
                        options: productOptions,
                        removed: [],
                        note: ""
                      });
                      toast.success("Adicionado ao carrinho");
                      setSelectedProduct(null);
                    }}
                    className={cn(
                      "flex-1 flex h-12 items-center justify-between rounded-full px-6 text-sm font-bold shadow-glow active:scale-95 transition-all",
                      (selectedProduct.is_available === false || selectedProduct.is_active === false || (selectedProduct.track_stock && selectedProduct.stock_quantity <= 0 && selectedProduct.auto_pause_when_zero))
                        ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    <span>{selectedProduct.is_available === false || selectedProduct.is_active === false || (selectedProduct.track_stock && selectedProduct.stock_quantity <= 0 && selectedProduct.auto_pause_when_zero) ? "Indisponível" : "Adicionar"}</span>
                    <span>{brl((getProductPrice(selectedProduct) + productOptions.reduce((s, o) => s + (Number(o.price) * (o.quantity || 1)), 0)) * quantity)}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <div className="relative z-10">
        <div className="relative h-52 overflow-hidden sm:h-64">
          <img src={est.cover || "https://images.unsplash.com/photo-1504674900247-0877df9cc836"} alt={est.name} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/30" />
          <button onClick={() => navigate(-1)} className="absolute left-4 top-4 grid size-10 place-items-center rounded-full bg-background/80 backdrop-blur shadow-card">
            <ArrowLeft className="size-5" />
          </button>
        </div>

        <div className="container relative -mt-16">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start gap-4">
              <img src={est.logo || "https://images.unsplash.com/photo-1504674900247-0877df9cc836"} alt="" className="size-20 shrink-0 rounded-2xl border-4 border-card object-cover shadow-soft -mt-12" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge variant={est.status === "ativo" ? "aberto" : "fechado"} />
                </div>
                <h1 className="mt-2 font-display text-3xl font-bold leading-tight">{est.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{est.category_label} · {est.neighborhood}</p>
              </div>
            </div>
            
            <p className="mt-4 text-sm text-foreground/80">{est.description}</p>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <a href={`https://wa.me/${est.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">
                <MessageCircle className="size-5" /> WhatsApp
              </a>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold">
                <Share2 className="size-5" /> Compartilhar
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-10">
            {menu.length === 0 && !loading && (
              <div className="text-center py-20 border border-dashed rounded-3xl bg-card/50">
                <ShoppingBag className="mx-auto size-12 text-muted-foreground opacity-20" />
                <p className="mt-4 text-muted-foreground font-medium">Cardápio em construção</p>
                <p className="text-xs text-muted-foreground">Esta loja ainda não cadastrou produtos.</p>
              </div>
            )}

            {visibleMenu.map((cat: any) => (
              <section key={cat.id} id={`cat-${cat.id}`}>
                <h2 className="font-display text-2xl font-bold mb-4 px-1">{cat.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cat.products.map((p: any) => (
                    <div 
                      key={p.id} 
                      id={`product-${p.id}`}
                      onClick={() => {
                        setSelectedProduct(p);
                        setProductOptions([]);
                        setQuantity(1);
                      }}
                      className="group cursor-pointer flex gap-4 overflow-hidden rounded-3xl bg-card p-4 shadow-card transition-all hover:shadow-soft active:scale-[0.98]"
                    >
                      <div className={cn("relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-muted", (p.is_available === false || p.is_active === false || (p.track_stock && p.stock_quantity <= 0 && p.auto_pause_when_zero)) && "grayscale opacity-60")}>
                        {(p.is_available === false || p.is_active === false || (p.track_stock && p.stock_quantity <= 0 && p.auto_pause_when_zero)) && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider bg-black/60 px-2 py-1 rounded">Esgotado</span>
                          </div>
                        )}
                        {getProductMainImage(p) ? (
                          <img src={getProductMainImage(p)} alt={p.name} className="size-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                             <ShoppingBag className="size-8 text-muted-foreground/30" />
                          </div>
                        )}
                        {isProductInPromo(p) && (
                          <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground flex items-center gap-1 shadow-lg">
                            <Flame className="size-3" /> {p.promotion_label || "PROMO"}
                          </div>
                        )}
                        {/* Removido o Ban icon antigo para usar o label mais claro acima */}
                      </div>
                      
                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-lg font-bold leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                            <FavoriteButton kind="product" targetId={p.id} size="sm" />
                          </div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                              {p.description}
                            </p>
                            {p.tags_json && Array.isArray(p.tags_json) && p.tags_json.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.tags_json.slice(0, 2).map((tag: any, idx: number) => (
                                  <span key={idx} className="text-[9px] bg-muted/50 px-1.5 py-0.5 rounded-md text-muted-foreground">
                                    {tag}
                                  </span>
                                ))}
                                {p.tags_json.length > 2 && <span className="text-[9px] text-muted-foreground">+{p.tags_json.length - 2}</span>}
                              </div>
                            )}
                          </div>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex flex-col">
                            {isProductInPromo(p) && <span className="text-[10px] text-muted-foreground line-through">{brl(getProductOriginalPrice(p))}</span>}
                            <div className="font-display text-xl font-bold text-primary">
                              {brl(getProductPrice(p))}
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const isUnavailable = p.is_available === false || p.is_active === false || (p.track_stock && p.stock_quantity <= 0 && p.auto_pause_when_zero);
                              if (isUnavailable) {
                                toast.error("Este produto não está disponível");
                                return;
                              }
                              const hasRequired = p.product_option_groups?.some((g: any) => g.is_required);
                              if (hasRequired) {
                                setSelectedProduct(p);
                                setProductOptions([]);
                                setQuantity(1);
                                return;
                              }
                              cart.add({
                                product: { 
                                  ...p, 
                                  category: cat.id, 
                                  image: getProductMainImage(p),
                                  price: getProductOriginalPrice(p),
                                  promotional_price: isProductInPromo(p) ? getProductPrice(p) : null
                                },
                                quantity: 1,
                                options: [],
                                removed: [],
                                note: ""
                              });
                              toast.success("Adicionado ao carrinho");
                            }}
                            disabled={p.is_available === false || p.is_active === false || (p.track_stock && p.stock_quantity <= 0 && p.auto_pause_when_zero)}
                            className={cn(
                              "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-all active:scale-95",
                              (p.is_available === false || p.is_active === false || (p.track_stock && p.stock_quantity <= 0 && p.auto_pause_when_zero))
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                            )}
                          >
                            <Plus className="size-4" /> {p.is_available === false || p.is_active === false || (p.track_stock && p.stock_quantity <= 0 && p.auto_pause_when_zero) ? "Off" : "Add"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-primary opacity-50" />
              </div>
            )}
          </div>

          <div className="mt-12 rounded-3xl bg-card/50 p-6 border border-border/50 text-center">
            <h3 className="font-display font-bold text-lg mb-2">Informações da Loja</h3>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <span>{est.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>{est.hours}</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="size-4 text-primary" />
                <span>Aceita: {est.payments.join(", ")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
