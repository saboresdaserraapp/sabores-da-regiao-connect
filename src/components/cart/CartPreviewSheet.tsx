import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2, ShoppingBag, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cart, useCart } from "@/store/cart";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAddresses } from "@/hooks/useAddresses";
import { useDeliveryRegions, useDeliverySettings } from "@/hooks/useDeliverySettings";
import { resolveDeliveryFeeWithDistance } from "@/lib/deliveryFee";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CartPreviewSheet({ open, onOpenChange }: Props) {
  const state = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const establishmentId = state.establishmentId;

  const { data: establishment } = useQuery({
    queryKey: ["cart-preview-establishment", establishmentId],
    enabled: !!establishmentId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("establishments")
        .select("id, name, logo, slug, delivery_fee, latitude, longitude")
        .eq("id", establishmentId!)
        .maybeSingle();
      return data;
    },
  });
  const { data: settings } = useDeliverySettings(open ? establishmentId ?? undefined : undefined);
  const { data: regions } = useDeliveryRegions(open ? establishmentId ?? undefined : undefined, false);
  const { data: addresses } = useAddresses();

  const subtotal = cart.subtotal();
  const defaultAddr = user ? (addresses?.find((a) => a.is_default) ?? addresses?.[0]) : null;
  const preview = defaultAddr && establishment
    ? resolveDeliveryFeeWithDistance({
        settings,
        regions,
        fixedFee: establishment.delivery_fee != null ? Number(establishment.delivery_fee) : null,
        subtotal,
        neighborhood: defaultAddr.neighborhood,
        popularLocationName: (defaultAddr as any).popular_location_name,
        origin: { latitude: (establishment as any).latitude, longitude: (establishment as any).longitude },
        destination: { latitude: (defaultAddr as any).latitude, longitude: (defaultAddr as any).longitude },
      })
    : null;

  let feeLine: { label: string; value: string; tone: "ok" | "muted" | "warn" } | null = null;
  if (preview) {
    if (preview.status === "unavailable") feeLine = { label: "Entrega", value: "Fora da área", tone: "warn" };
    else if (preview.status === "free" || preview.fee === 0) feeLine = { label: "Entrega", value: "Grátis", tone: "ok" };
    else if (preview.status === "to_confirm") feeLine = { label: "Entrega", value: "A confirmar", tone: "muted" };
    else if (preview.fee != null) feeLine = { label: "Entrega", value: brl(preview.fee), tone: "muted" };
  }

  const total = subtotal + (preview?.fee ?? 0);
  const slug = state.establishmentSlug ?? establishment?.slug;
  const canCheckout = !!slug && state.items.length > 0 && preview?.status !== "unavailable";

  const handleCheckout = () => {
    if (!slug) return;
    onOpenChange(false);
    navigate(`/checkout`);
  };

  const handleClear = () => {
    if (!window.confirm("Esvaziar carrinho?")) return;
    cart.clear();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 p-4 text-left">
          <div className="flex items-center gap-3">
            {establishment?.logo ? (
              <img src={establishment.logo} alt="" className="size-10 rounded-full object-cover" />
            ) : (
              <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">Seu pedido</SheetTitle>
              <SheetDescription className="truncate text-xs">
                {establishment?.name ?? "Carrinho"}
              </SheetDescription>
            </div>
            {state.items.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-destructive"
              >
                Esvaziar
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {state.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
              <ShoppingBag className="size-10 text-muted-foreground" />
              <p className="font-display text-base font-semibold">Carrinho vazio</p>
              <p className="text-sm text-muted-foreground">Adicione itens da loja para continuar.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {state.items.map((item) => {
                const lineTotal = item.unitPrice * item.quantity;
                const editing = editingNote === item.uid;
                return (
                  <li key={item.uid} className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                    <div className="flex gap-3">
                      {item.product.image && (
                        <img
                          src={item.product.image}
                          alt=""
                          className="size-16 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium leading-tight">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">{brl(item.unitPrice)} cada</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => cart.remove(item.uid)}
                            className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remover item"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        {item.options.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {item.options.map((o, idx) => (
                              <li key={idx} className="text-[11px] text-muted-foreground">
                                + {o.name}
                                {o.quantity && o.quantity > 1 ? ` ×${o.quantity}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                        {item.removed.length > 0 && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Sem: {item.removed.join(", ")}
                          </p>
                        )}
                        {!editing && item.note && (
                          <p className="mt-1 line-clamp-2 rounded-md bg-muted/60 px-2 py-1 text-[11px] italic text-muted-foreground">
                            "{item.note}"
                          </p>
                        )}
                        {editing ? (
                          <Textarea
                            autoFocus
                            defaultValue={item.note}
                            placeholder="Observação para a loja..."
                            className="mt-2 min-h-[60px] text-xs"
                            onBlur={(e) => {
                              cart.updateNote(item.uid, e.target.value.trim());
                              setEditingNote(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingNote(item.uid)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            <Pencil className="size-3" />
                            {item.note ? "Editar observação" : "Adicionar observação"}
                          </button>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-border bg-background">
                            <button
                              type="button"
                              onClick={() => cart.update(item.uid, item.quantity - 1)}
                              className="grid size-7 place-items-center text-muted-foreground hover:text-foreground"
                              aria-label="Diminuir"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="min-w-[1.75rem] text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => cart.update(item.uid, item.quantity + 1)}
                              className="grid size-7 place-items-center text-muted-foreground hover:text-foreground"
                              aria-label="Aumentar"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <span className="font-display text-sm font-bold text-primary">{brl(lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {state.items.length > 0 && (
          <div className="border-t border-border/60 bg-muted/30 p-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{brl(subtotal)}</dd>
              </div>
              {feeLine && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{feeLine.label}</dt>
                  <dd
                    className={cn(
                      "font-medium",
                      feeLine.tone === "warn" && "text-destructive",
                      feeLine.tone === "ok" && "text-emerald-600",
                    )}
                  >
                    {feeLine.value}
                  </dd>
                </div>
              )}
              <Separator className="my-1.5" />
              <div className="flex justify-between text-base">
                <dt className="font-display font-semibold">Total</dt>
                <dd className="font-display font-bold text-primary">{brl(total)}</dd>
              </div>
            </dl>

            {preview?.notice && (
              <p className="mt-2 text-[11px] text-muted-foreground">{preview.notice}</p>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Continuar comprando
              </Button>
              <Button
                className="flex-1"
                disabled={!canCheckout}
                onClick={handleCheckout}
              >
                Finalizar pedido
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default CartPreviewSheet;