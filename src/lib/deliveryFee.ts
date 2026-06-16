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

// ============= Distance helpers (safe, opt-in) =============
// Pure utilities for distance-based freight estimates. NOT wired into
// resolveDeliveryFee yet — callers may use these to compute or display
// a distance-based estimate without changing existing region logic.

export interface LatLng {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

/** Great-circle distance in kilometers between two coordinates, or null if missing. */
export function haversineKm(a: LatLng, b: LatLng): number | null {
  const lat1 = a?.latitude, lon1 = a?.longitude;
  const lat2 = b?.latitude, lon2 = b?.longitude;
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export interface DistanceFeeOptions {
  baseFee?: number;       // flat starting fee
  perKm?: number;         // R$ per km after freeKm
  freeKm?: number;        // km included in baseFee
  minFee?: number;        // floor
  maxKm?: number;         // beyond this, returns null (out of range)
}

/** Estimate a distance-based delivery fee. Returns null when distance is unknown or out of range. */
export function estimateDistanceFee(
  distanceKm: number | null,
  opts: DistanceFeeOptions = {},
): number | null {
  if (distanceKm == null || !isFinite(distanceKm)) return null;
  const { baseFee = 0, perKm = 0, freeKm = 0, minFee = 0, maxKm } = opts;
  if (maxKm != null && distanceKm > maxKm) return null;
  const billable = Math.max(0, distanceKm - freeKm);
  return Math.max(minFee, baseFee + billable * perKm);
}

// ============= Combined resolver with distance fallback =============
// Single source of truth used by Checkout and the floating cart preview.
// Applies region-based resolution first, then falls back to distance when:
//   - no region matched
//   - the model is not fixed/free/unavailable
//   - the store has distance config and both ends have coordinates

export interface ResolveWithDistanceInput extends ResolveInput {
  origin?: LatLng | null;       // establishment coords
  destination?: LatLng | null;  // selected address coords
}

export function resolveDeliveryFeeWithDistance(
  input: ResolveWithDistanceInput,
): DeliveryResolution {
  const base = resolveDeliveryFee(input);
  if (
    base.region ||
    base.status === "unavailable" ||
    base.status === "fixed" ||
    base.status === "free"
  ) {
    return base;
  }
  const s: any = input.settings || {};
  const hasCfg = s.distance_base_fee != null || s.distance_per_km != null;
  if (!hasCfg) return base;
  const km = haversineKm(input.origin ?? { latitude: null, longitude: null },
                         input.destination ?? { latitude: null, longitude: null });
  if (km == null) return base;
  const fee = estimateDistanceFee(km, {
    baseFee: Number(s.distance_base_fee ?? 0),
    perKm: Number(s.distance_per_km ?? 0),
    freeKm: Number(s.distance_free_km ?? 0),
    maxKm: s.distance_max_km != null ? Number(s.distance_max_km) : undefined,
  });
  if (fee == null) {
    return {
      ...base,
      status: "unavailable",
      blocked: true,
      notice: `Endereço fora do raio de entrega (${km.toFixed(1)} km).`,
    };
  }
  return {
    ...base,
    fee,
    status: "estimated",
    manual: true,
    autoMatched: true,
    notice: `Taxa estimada por distância (~${km.toFixed(1)} km). A loja pode confirmar pelo WhatsApp.`,
  };
}