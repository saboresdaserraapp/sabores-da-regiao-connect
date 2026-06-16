import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/store/cart";
import type { HistoryOrder } from "@/hooks/useOrderHistory";

export interface ReorderPrefill {
  address_id?: string | null;
  payment?: string | null;
  change_for?: number | null;
  note?: string | null;
}

const PREFILL_KEY = "sdr_reorder_prefill";

export interface ReorderResult {
  added: number;
  skipped: { name: string; reason: string }[];
  priceChanged: { name: string; oldPrice: number; newPrice: number }[];
  slug: string;
}

export async function reorderFromHistory(order: HistoryOrder): Promise<ReorderResult> {
  if (!order.establishment?.slug) {
    throw new Error("Loja indisponível para repetir o pedido.");
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const productIds = Array.from(
    new Set(items.map((i: any) => i.product_id).filter(Boolean))
  ) as string[];

  // Fetch current product state.
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, promotional_price, image, options, removable, is_active, is_available, menu_category_id")
    .in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);

  const productsById = new Map<string, any>();
  (products ?? []).forEach((p: any) => productsById.set(p.id, p));

  // Collect all option ids referenced by snapshot items and fetch current state.
  const optionIds = Array.from(
    new Set(
      items.flatMap((i: any) =>
        (i?.selected_options_snapshot_json?.options ?? [])
          .map((o: any) => o?.id)
          .filter(Boolean)
      )
    )
  ) as string[];
  const optionById = new Map<string, any>();
  if (optionIds.length) {
    const { data: opts } = await supabase
      .from("product_options")
      .select("id, name, price, is_available")
      .in("id", optionIds);
    (opts ?? []).forEach((o: any) => optionById.set(o.id, o));
  }

  // Reset cart to the order's establishment (this clears any other-store cart).
  cart.setEstablishment(order.establishment.id, order.establishment.slug);

  const skipped: ReorderResult["skipped"] = [];
  const priceChanged: ReorderResult["priceChanged"] = [];
  let added = 0;

  for (const raw of items) {
    const it = raw as any;
    const product = productsById.get(it.product_id);
    const name = it.product_name_snapshot || product?.name || "Item";
    if (!product) {
      skipped.push({ name, reason: "Produto não está mais disponível" });
      continue;
    }
    if (product.is_active === false || product.is_available === false) {
      skipped.push({ name, reason: "Produto está indisponível agora" });
      continue;
    }

    const snapshotOptions = it?.selected_options_snapshot_json?.options ?? [];
    const validOptions: any[] = [];
    let optionsDropped = false;
    for (const so of snapshotOptions) {
      const current = so?.id ? optionById.get(so.id) : null;
      if (current && current.is_available !== false) {
        validOptions.push({
          id: current.id,
          name: current.name,
          price: Number(current.price ?? so.price ?? 0),
          quantity: so.quantity ?? 1,
          group_name: so.group_name,
        });
      } else if (so?.id) {
        // Drop missing/inactive option but keep item.
        optionsDropped = true;
      } else if (so?.name) {
        // Legacy options without ids — keep as-is using snapshot price.
        validOptions.push({ ...so });
      }
    }

    const removed: string[] = Array.isArray(it?.selected_options_snapshot_json?.removed)
      ? it.selected_options_snapshot_json.removed
      : [];

    const oldUnit = Number(it.unit_price_snapshot ?? 0);
    const productForCart = {
      ...product,
      price: Number(product.price ?? 0),
      promotional_price: product.promotional_price != null ? Number(product.promotional_price) : undefined,
    };

    cart.add({
      product: productForCart as any,
      quantity: Math.max(1, Number(it.quantity || 1)),
      options: validOptions,
      removed,
      note: it.item_note ?? "",
    });

    // Compare new unit price to snapshot.
    const currentItem = cart.get().items[cart.get().items.length - 1];
    if (currentItem && oldUnit > 0 && Math.abs(currentItem.unitPrice - oldUnit) > 0.01) {
      priceChanged.push({ name, oldPrice: oldUnit, newPrice: currentItem.unitPrice });
    }
    if (optionsDropped) {
      // Inform user that some adicionais were removed silently
      skipped.push({ name: `${name} (adicionais)`, reason: "Alguns adicionais não estão mais disponíveis" });
    }
    added++;
  }

  const prefill: ReorderPrefill = {
    address_id: order.address_id,
    payment: order.payment_method,
    change_for: (order as any).change_for ?? null,
    note: order.notes,
  };
  sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));

  return { added, skipped, priceChanged, slug: order.establishment.slug };
}

export function consumeReorderPrefill(): ReorderPrefill | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    return JSON.parse(raw) as ReorderPrefill;
  } catch {
    return null;
  }
}