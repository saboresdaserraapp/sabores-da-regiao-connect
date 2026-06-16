import { useSyncExternalStore } from "react";
import type { Product as MockProduct, ProductOption } from "@/data/mockData";

export interface Product extends MockProduct {
  promotion_starts_at?: string | null;
  promotion_ends_at?: string | null;
  product_option_groups?: any[];
  auto_pause_when_zero?: boolean;
  stock_quantity?: number;
}

export interface CartItem {
  uid: string;
  product: Product;
  quantity: number;
  options: (ProductOption & { quantity?: number; group_name?: string })[];
  removed: string[];
  note: string;
  unitPrice: number;
}

interface CartState {
  establishmentId: string | null;
  establishmentSlug: string | null;
  items: CartItem[];
}

let state: CartState = load();
const listeners = new Set<() => void>();

function load(): CartState {
  if (typeof localStorage === "undefined") return { establishmentId: null, establishmentSlug: null, items: [] };
  try {
    const data = localStorage.getItem("sdr_cart");
    if (!data) return { establishmentId: null, establishmentSlug: null, items: [] };
    const parsed = JSON.parse(data) as Partial<CartState>;
    return {
      establishmentId: parsed.establishmentId ?? null,
      establishmentSlug: parsed.establishmentSlug ?? null,
      items: parsed.items ?? [],
    };
  } catch { return { establishmentId: null, establishmentSlug: null, items: [] }; }
}
function persist() {
  localStorage.setItem("sdr_cart", JSON.stringify(state));
  listeners.forEach(l => l());
}

export const cart = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get() { return state; },
  setEstablishment(id: string, slug?: string) {
    if (state.establishmentId !== id) {
      state = { establishmentId: id, establishmentSlug: slug ?? null, items: [] };
      persist();
    } else if (slug && state.establishmentSlug !== slug) {
      state = { ...state, establishmentSlug: slug };
      persist();
    }
  },
  add(item: Omit<CartItem, "uid" | "unitPrice">) {
    const now = new Date();
    const hasV2Promo = item.product.promotional_price && 
      (!item.product.promotion_starts_at || new Date(item.product.promotion_starts_at) <= now) &&
      (!item.product.promotion_ends_at || new Date(item.product.promotion_ends_at) >= now);
    
    const basePrice = Number(hasV2Promo ? item.product.promotional_price : (item.product.promo ? item.product.promotional_price : (item.product.price || 0)));
    const unitPrice = basePrice + item.options.reduce((s, o) => s + (Number(o.price || 0) * (o.quantity || 1)), 0);
    state = {
      ...state,
      items: [...state.items, { ...item, uid: crypto.randomUUID(), unitPrice }],
    };
    persist();
  },
  update(uid: string, qty: number) {
    state = { ...state, items: state.items.map(i => i.uid === uid ? { ...i, quantity: qty } : i).filter(i => i.quantity > 0) };
    persist();
  },
  remove(uid: string) {
    state = { ...state, items: state.items.filter(i => i.uid !== uid) };
    persist();
  },
  clear() { state = { establishmentId: null, establishmentSlug: null, items: [] }; persist(); },
  subtotal() { return state.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0); },
  count() { return state.items.reduce((s, i) => s + i.quantity, 0); },
};

export function useCart() {
  return useSyncExternalStore(
    (l) => cart.subscribe(l),
    () => state,
    () => state,
  );
}
