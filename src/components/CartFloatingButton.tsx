import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cart, useCart } from "@/store/cart";
import { brl } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useAddresses } from "@/hooks/useAddresses";
import { useDeliveryRegions, useDeliverySettings } from "@/hooks/useDeliverySettings";
import { resolveDeliveryFeeWithDistance } from "@/lib/deliveryFee";
import { supabase } from "@/integrations/supabase/client";

export function CartFloatingButton() {
  const state = useCart();
  const { user } = useAuth();
  const establishmentId = state.establishmentId;
  const enabled = !!state.items.length && !!state.establishmentSlug;

  const { data: establishment } = useQuery({
    queryKey: ["cart-fab-establishment", establishmentId],
    enabled: enabled && !!establishmentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("establishments")
        .select("id, delivery_fee, neighborhood, latitude, longitude")
        .eq("id", establishmentId!)
        .maybeSingle();
      return data;
    },
  });
  const { data: settings } = useDeliverySettings(enabled ? establishmentId ?? undefined : undefined);
  const { data: regions } = useDeliveryRegions(enabled ? establishmentId ?? undefined : undefined, false);
  const { data: addresses } = useAddresses();

  if (!enabled) return null;

  const count = state.items.reduce((acc, i) => acc + i.quantity, 0);
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

  let feeLabel: { text: string; tone: "ok" | "muted" | "warn" } | null = null;
  if (preview) {
    if (preview.status === "unavailable") {
      feeLabel = { text: "Fora da área de entrega", tone: "warn" };
    } else if (preview.status === "free" || preview.fee === 0) {
      feeLabel = { text: "Entrega grátis", tone: "ok" };
    } else if (preview.status === "to_confirm") {
      feeLabel = { text: "Entrega a confirmar", tone: "muted" };
    } else if (preview.fee != null) {
      feeLabel = { text: `+ Entrega ${brl(preview.fee)}`, tone: "muted" };
    }
  }

  return (
    <div className="safe-bottom fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
      <Link
        to={`/loja/${state.establishmentSlug}/checkout`}
        title={preview?.notice || undefined}
        className="flex items-center justify-between rounded-full bg-primary p-2 pl-6 pr-2 text-primary-foreground shadow-glow transition-transform active:scale-95"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-white/20 font-bold">
            {count}
          </div>
          <div>
            <div className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Ver carrinho</div>
            <div className="font-display text-lg font-bold leading-tight">{brl(subtotal)}</div>
            {feeLabel && (
              <div
                className={
                  "text-[10px] font-medium leading-tight " +
                  (feeLabel.tone === "warn"
                    ? "text-red-100"
                    : feeLabel.tone === "ok"
                    ? "text-emerald-100"
                    : "opacity-80")
                }
              >
                {feeLabel.text}
              </div>
            )}
          </div>
        </div>
        <div className="flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-primary">
          Finalizar Pedido
        </div>
      </Link>
    </div>
  );
}