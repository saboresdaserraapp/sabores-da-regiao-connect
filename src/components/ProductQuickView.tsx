import { useEffect, useState } from "react";
import { X, Plus, Minus, Flame } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { cart, useCart } from "@/store/cart";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  productId: string;
  establishmentId: string;
  establishmentSlug?: string;
  isOpen: boolean;
  onClose: () => void;
}

function getProductPrice(p: any) {
  const now = new Date();
  const hasV2Promo = p.promotional_price &&
    (!p.promotion_starts_at || new Date(p.promotion_starts_at) <= now) &&
    (!p.promotion_ends_at || new Date(p.promotion_ends_at) >= now);
  if (hasV2Promo) return Number(p.promotional_price);
  if (p.promo && p.promotional_price) return Number(p.promotional_price);
  return Number(p.price || 0);
}
function getProductOriginalPrice(p: any) { return Number(p.price || 0); }
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
    return [...p.product_images].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))[0].image_url;
  }
  return p.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836";
}

export function ProductQuickView({ productId, establishmentId, establishmentSlug, isOpen, onClose }: Props) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const cartState = useCart();

  useEffect(() => {
    if (!isOpen || !productId) return;
    setLoading(true);
    setProduct(null);
    setProductOptions([]);
    setQuantity(1);
    publicSupabase
      .from("products")
      .select("*, product_option_groups(*, product_options(*)), product_images(*)")
      .eq("id", productId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[ProductQuickView] load error", error);
        setProduct(data);
        setLoading(false);
      });
  }, [isOpen, productId]);

  const handleAdd = () => {
    if (!product) return;
    if (product.is_available === false || product.is_active === false) {
      toast.error("Este produto não está disponível no momento.");
      return;
    }
    if (product.track_stock && product.stock_quantity <= 0 && product.auto_pause_when_zero) {
      toast.error("Este produto está esgotado.");
      return;
    }
    const requiredGroups = product.product_option_groups?.filter((g: any) => g.is_required) || [];
    const missingRequired = requiredGroups.find((g: any) => {
      const selectedInGroup = productOptions.filter(o => g.product_options.some((go: any) => (go.id && o.id && go.id === o.id) || (go.name === o.name && !go.id)));
      const currentQty = selectedInGroup.reduce((acc, o) => acc + (o.quantity || 1), 0);
      return currentQty < (g.min_choices || 1);
    });
    if (missingRequired) {
      toast.error(`A escolha no grupo "${missingRequired.name}" é obrigatória (mínimo ${missingRequired.min_choices || 1})`);
      return;
    }

    // Troca de loja: avisa antes de limpar carrinho
    if (cartState.establishmentId && cartState.establishmentId !== establishmentId && cartState.items.length > 0) {
      const ok = window.confirm("Seu carrinho contém itens de outra loja. Deseja substituí-los pelos itens desta loja?");
      if (!ok) return;
    }
    cart.setEstablishment(establishmentId, establishmentSlug);
    cart.add({
      product: {
        ...product,
        category: product.menu_category_id,
        image: getProductMainImage(product),
        price: getProductOriginalPrice(product),
        promotional_price: isProductInPromo(product) ? getProductPrice(product) : null,
      },
      quantity,
      options: productOptions,
      removed: [],
      note: "",
    });
    toast.success("Adicionado ao carrinho");
    onClose();
  };

  const total = product
    ? (getProductPrice(product) + productOptions.reduce((s, o) => s + (Number(o.price) * (o.quantity || 1)), 0)) * quantity
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col border-none bg-background">
        {loading || !product ? (
          <div className="flex items-center justify-center p-20 text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="relative h-56 w-full shrink-0">
              <img src={getProductMainImage(product)} alt={product.name} className="size-full object-cover" />
              <button
                onClick={onClose}
                className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur shadow-lg z-10"
              >
                <X className="size-5" />
              </button>
              {isProductInPromo(product) && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                  <Flame className="size-3" /> {product.promotion_label || "PROMO"}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-bold text-left">{product.name}</DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground leading-relaxed text-left">
                  {product.description}
                </DialogDescription>
                <div className="mt-4 flex flex-col items-start gap-1">
                  {isProductInPromo(product) ? (
                    <>
                      <span className="text-xs text-muted-foreground line-through decoration-destructive/50">{brl(getProductOriginalPrice(product))}</span>
                      <div className="font-display text-3xl font-bold text-primary">{brl(getProductPrice(product))}</div>
                    </>
                  ) : (
                    <div className="font-display text-3xl font-bold text-primary">{brl(getProductPrice(product))}</div>
                  )}
                </div>
              </DialogHeader>

              {/* Grupos de opcionais V2 */}
              {product.product_option_groups && product.product_option_groups.length > 0 && (
                <div className="space-y-8">
                  {[...product.product_option_groups].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((group: any) => (
                    <div key={group.id} className="space-y-4">
                      <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                        <div>
                          <h3 className="font-bold text-sm uppercase tracking-wider">{group.name}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">
                            {group.type === "single" ? "Selecione 1" : `Selecione de ${group.min_choices || 0} a ${group.max_choices || "vários"}`}
                          </p>
                        </div>
                        {group.is_required && (
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">OBRIGATÓRIO</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {[...(group.product_options || [])].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((opt: any) => {
                          const selectedInGroup = productOptions.filter(o => group.product_options.some((go: any) => go.id === o.id || (go.name === o.name && !go.id)));
                          const currentOpt = productOptions.find(o => o.id === opt.id || (o.name === opt.name && !o.id));
                          const isSelected = !!currentOpt;
                          const currentQty = currentOpt?.quantity || 0;
                          return (
                            <div
                              key={opt.id}
                              onClick={() => {
                                if (opt.is_available === false) { toast.error("Este adicional não está disponível"); return; }
                                if (group.type === "single") {
                                  const groupIds = group.product_options.map((o: any) => o.id);
                                  const filtered = productOptions.filter(o => !groupIds.includes(o.id));
                                  setProductOptions([...filtered, { ...opt, quantity: 1, group_name: group.name }]);
                                } else if (isSelected && !opt.allow_quantity) {
                                  setProductOptions(productOptions.filter(o => (o.id || o.name) !== (opt.id || opt.name)));
                                } else if (!isSelected) {
                                  const totalQty = selectedInGroup.reduce((acc, o) => acc + (o.quantity || 1), 0);
                                  if (!group.max_choices || totalQty < group.max_choices) {
                                    setProductOptions([...productOptions, { ...opt, quantity: 1, group_name: group.name }]);
                                  } else {
                                    toast.error(`Limite de ${group.max_choices} no grupo "${group.name}"`);
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
                                  {group.type === "single" ? (
                                    <div className={cn("size-5 rounded-full border flex items-center justify-center", isSelected ? "border-primary" : "border-muted-foreground/30")}>
                                      {isSelected && <div className="size-2.5 rounded-full bg-primary" />}
                                    </div>
                                  ) : (
                                    <div className={cn("size-5 rounded border flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                                      {isSelected && <Plus className="size-3 text-white" strokeWidth={4} />}
                                    </div>
                                  )}
                                  <span className="font-medium text-sm leading-tight">{opt.name}</span>
                                </div>
                                {Number(opt.price) > 0 && (
                                  <span className="text-sm font-bold text-primary">+{brl(Number(opt.price || 0))}</span>
                                )}
                              </div>
                              {opt.allow_quantity && isSelected && (
                                <div className="mt-3 flex items-center justify-between bg-background/50 p-2 rounded-lg border border-primary/20">
                                  <span className="text-xs font-medium text-muted-foreground">Quantidade</span>
                                  <div className="flex items-center gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); const n = currentQty - 1; if (n <= 0) setProductOptions(productOptions.filter(o => (o.id || o.name) !== (opt.id || opt.name))); else setProductOptions(productOptions.map(o => (o.id || o.name) === (opt.id || opt.name) ? { ...o, quantity: n, group_name: group.name } : o)); }} className="size-8 flex items-center justify-center rounded-full bg-primary/10 text-primary"><Minus className="size-4" /></button>
                                    <span className="font-bold min-w-[20px] text-center">{currentQty}</span>
                                    <button onClick={(e) => { e.stopPropagation(); const totalQty = selectedInGroup.reduce((acc, o) => acc + (o.quantity || 1), 0); if (!group.max_choices || totalQty < group.max_choices) setProductOptions(productOptions.map(o => (o.id || o.name) === (opt.id || opt.name) ? { ...o, quantity: currentQty + 1, group_name: group.name } : o)); else toast.error(`Limite de ${group.max_choices} atingido`); }} className="size-8 flex items-center justify-center rounded-full bg-primary/10 text-primary"><Plus className="size-4" /></button>
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

              {/* Opcionais V1 (legado JSONB) */}
              {(!product.product_option_groups || product.product_option_groups.length === 0) && Array.isArray(product.options) && product.options.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Opcionais</h3>
                  <div className="space-y-3">
                    {product.options.map((opt: any, idx: number) => {
                      const isSelected = productOptions.some(o => o.name === opt.name);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isSelected) setProductOptions(productOptions.filter(o => o.name !== opt.name));
                            else setProductOptions([...productOptions, { ...opt, group_name: "Opcionais" }]);
                          }}
                          className={cn("flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:bg-muted/50", isSelected ? "border-primary bg-primary/5" : "border-border/50")}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} onCheckedChange={() => {}} />
                            <Label className="font-medium cursor-pointer">{opt.name}</Label>
                          </div>
                          {opt.price > 0 && <span className="text-sm font-bold text-primary">+{brl(Number(opt.price) || 0)}</span>}
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
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="size-11 flex items-center justify-center hover:bg-muted font-bold text-lg">-</button>
                  <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="size-11 flex items-center justify-center hover:bg-muted font-bold text-lg">+</button>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={product.is_available === false || product.is_active === false || (product.track_stock && product.stock_quantity <= 0 && product.auto_pause_when_zero)}
                  className={cn(
                    "flex-1 flex h-12 items-center justify-between rounded-full px-6 text-sm font-bold shadow-glow active:scale-95 transition-all",
                    (product.is_available === false || product.is_active === false || (product.track_stock && product.stock_quantity <= 0 && product.auto_pause_when_zero))
                      ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <span>{product.is_available === false || product.is_active === false ? "Indisponível" : "Adicionar"}</span>
                  <span>{brl(total)}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
