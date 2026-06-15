import type { DeliveryRegion, DeliverySettings } from "@/hooks/useDeliverySettings";

export type DeliveryStatus = "fixed" | "free" | "estimated" | "to_confirm" | "unavailable";

export interface DeliveryResolution {
  fee: number | null;
  status: DeliveryStatus;
  region: DeliveryRegion | null;
  manual: boolean;
  blocked: boolean;
  notice?: string;
  minOrderValue: number;
  missingForMin: number;
  autoMatched: boolean;
}

function norm(s?: string | null) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchRegionByName(
  regions: DeliveryRegion[] | undefined,
  ...candidates: (string | null | undefined)[]
): DeliveryRegion | null {
  if (!regions?.length) return null;
  const cands = candidates.map(norm).filter(Boolean);
  if (!cands.length) return null;
  for (const r of regions) {
    const rn = norm(r.name);
    if (!rn) continue;
    if (cands.some((c) => c === rn || c.includes(rn) || rn.includes(c))) return r;
  }
  return null;
}

export interface ResolveInput {
  settings?: DeliverySettings | null;
  regions?: DeliveryRegion[];
  fixedFee?: number | null;            // establishments.delivery_fee
  subtotal: number;
  manualRegionId?: string | null;      // selected by user (overrides match)
  neighborhood?: string | null;
  popularLocationName?: string | null;
}

export function resolveDeliveryFee(input: ResolveInput): DeliveryResolution {
  const { settings, regions, fixedFee, subtotal, manualRegionId } = input;
  const model = settings?.delivery_model ?? "to_confirm";

  const base: DeliveryResolution = {
    fee: null, status: "to_confirm", region: null,
    manual: !!settings?.always_confirm_by_whatsapp,
    blocked: false, minOrderValue: 0, missingForMin: 0, autoMatched: false,
  };

  if (model === "no_delivery" || model === "pickup_only" || model === "dine_in_only") {
    return { ...base, status: "unavailable", blocked: true,
      notice: "Esta loja não realiza entregas — escolha retirada ou consumo no local." };
  }
  if (model === "free") {
    return { ...base, fee: 0, status: "free", manual: false };
  }
  if (model === "fixed") {
    const f = Number(fixedFee ?? 0);
    return { ...base, fee: f, status: "fixed",
      manual: !!settings?.always_confirm_by_whatsapp };
  }

  // by_region / by_region_manual / to_confirm with regions
  let region: DeliveryRegion | null = null;
  let autoMatched = false;
  if (manualRegionId) {
    region = regions?.find((r) => r.id === manualRegionId) ?? null;
  } else {
    region = matchRegionByName(regions, input.neighborhood, input.popularLocationName);
    autoMatched = !!region;
  }

  if (!region) {
    if (model === "to_confirm") {
      return { ...base, status: "to_confirm", manual: true,
        notice: "A taxa de entrega será confirmada pelo estabelecimento pelo WhatsApp." };
    }
    return { ...base, status: "to_confirm", manual: true,
      notice: "Sua região não está cadastrada. O estabelecimento confirmará pelo WhatsApp se atende, o prazo e a taxa." };
  }

  if (region.status === "nao_atendida") {
    return { ...base, region, status: "unavailable", blocked: true,
      notice: region.public_note || "Esta loja não atende essa região." };
  }

  const min = Number(region.min_order_value || 0);
  const missing = Math.max(0, min - subtotal);
  const manual = !!region.requires_manual_confirmation
    || !!settings?.always_confirm_by_whatsapp
    || model === "by_region_manual";

  return {
    fee: Number(region.fee || 0),
    status: "estimated",
    region,
    manual,
    blocked: missing > 0,
    notice: missing > 0
      ? `Pedido mínimo de R$ ${min.toFixed(2).replace(".", ",")} para entregar em ${region.name}.`
      : (region.public_note ?? undefined),
    minOrderValue: min,
    missingForMin: missing,
    autoMatched,
  };
}