// Shared pricing logic — used by the panel preview AND WhatsApp message
// to keep the customer-facing price consistent with what the store sees.

export interface PricingProduct {
  price: number | string;
  promo?: boolean | null;
  promotional_price?: number | string | null;
  promotion_starts_at?: string | null;
  promotion_ends_at?: string | null;
}

export interface PricingOptionGroup {
  id: string;
  name: string;
  is_required: boolean | null;
  min_choices: number | null;
}

export interface PricingOption {
  id: string;
  option_group_id: string;
  name: string;
  price: number | string;
  is_available?: boolean | null;
}

export interface ForcedAddon {
  groupName: string;
  optionName: string;
  price: number;
}

export interface PriceBreakdown {
  basePrice: number;
  unitPrice: number;      // after promo
  promoActive: boolean;
  discountUnit: number;   // discount per unit
  discountPercent: number;
  forcedAddons: ForcedAddon[];
  addonsTotal: number;
  quantity: number;
  subtotal: number;       // unitPrice * quantity
  addonsSubtotal: number; // addonsTotal * quantity
  discountTotal: number;  // discountUnit * quantity
  total: number;          // subtotal + addonsSubtotal
}

export function isPromoActive(p: PricingProduct, at: Date = new Date()): boolean {
  if (!p.promo || !p.promotional_price) return false;
  const now = at.getTime();
  if (p.promotion_starts_at && new Date(p.promotion_starts_at).getTime() > now) return false;
  if (p.promotion_ends_at && new Date(p.promotion_ends_at).getTime() < now) return false;
  return Number(p.promotional_price) > 0 && Number(p.promotional_price) < Number(p.price);
}

/** Picks the cheapest available options to satisfy each required group's min_choices. */
export function pickForcedAddons(
  groups: PricingOptionGroup[],
  options: PricingOption[],
): ForcedAddon[] {
  const forced: ForcedAddon[] = [];
  groups.forEach((g) => {
    const min = g.min_choices ?? 0;
    if (!g.is_required || min < 1) return;
    const available = options
      .filter((o) => o.option_group_id === g.id && o.is_available !== false)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, min);
    available.forEach((o) =>
      forced.push({ groupName: g.name, optionName: o.name, price: Number(o.price) || 0 }),
    );
  });
  return forced;
}

export function computeBreakdown(
  product: PricingProduct,
  groups: PricingOptionGroup[] = [],
  options: PricingOption[] = [],
  quantity = 1,
): PriceBreakdown {
  const basePrice = Number(product.price) || 0;
  const promoActive = isPromoActive(product);
  const unitPrice = promoActive ? Number(product.promotional_price) : basePrice;
  const discountUnit = promoActive ? basePrice - unitPrice : 0;
  const discountPercent = basePrice > 0 ? (discountUnit / basePrice) * 100 : 0;
  const forcedAddons = pickForcedAddons(groups, options);
  const addonsTotal = forcedAddons.reduce((s, a) => s + a.price, 0);
  const q = Math.max(1, Math.floor(quantity) || 1);
  const subtotal = unitPrice * q;
  const addonsSubtotal = addonsTotal * q;
  return {
    basePrice,
    unitPrice,
    promoActive,
    discountUnit,
    discountPercent,
    forcedAddons,
    addonsTotal,
    quantity: q,
    subtotal,
    addonsSubtotal,
    discountTotal: discountUnit * q,
    total: subtotal + addonsSubtotal,
  };
}

export const money = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;