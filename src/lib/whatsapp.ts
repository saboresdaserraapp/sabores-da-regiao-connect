import type { CartItem } from "@/store/cart";
import type { Establishment } from "@/data/catalogTypes";
import { brl } from "./format";
import { isPromoActive } from "./pricing";

export type OrderType = "entrega" | "retirada" | "local";

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export interface CheckoutData {
  type: OrderType;
  name: string;
  phone?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  reference?: string;
  payment?: string;
  pickupTime?: string;
  people?: string;
  visitTime?: string;
  note?: string;
  zip?: string;
  popular_location_name?: string;
  delivery_instructions?: string;
}

export interface V2DeliveryMessageInfo {
  regionName?: string | null;
  fee?: number | null;
  feeToConfirm?: boolean;
  deliveryInstructions?: string | null;
  visualReferenceLink?: string | null;
  popularLocationName?: string | null;
  pontoReferencia?: string | null;
  visualReferenceData?: {
    mediaCount: number;
    hasVideo: boolean;
    hasInstructions: boolean;
    hasPins: boolean;
  } | null;
}

const typeLabel = (t: OrderType) =>
  t === "entrega" ? "Entrega" : t === "retirada" ? "Retirada" : "Comer no local";

export function buildWhatsappMessage(
  est: Establishment,
  items: CartItem[],
  data: CheckoutData,
  trackingCode?: string,
  v2?: V2DeliveryMessageInfo
) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const feeToConfirm = data.type === "entrega" && (v2?.feeToConfirm ?? (est.deliveryFee == null));
  const taxa = data.type === "entrega"
    ? (v2 ? (v2.fee ?? null) : (est.deliveryFee ?? null))
    : 0;
  const total = subtotal + (taxa ?? 0);

  const itemsTxt = items.map(i => {
    const itemLines: string[] = [];

    const productName = i.product?.name || "Produto";
    const product: any = i.product || {};
    const promoActive = isPromoActive({
      price: product.price ?? i.unitPrice,
      promo: product.promo,
      promotional_price: product.promotional_price,
      promotion_starts_at: product.promotion_starts_at,
      promotion_ends_at: product.promotion_ends_at,
    });

    if (promoActive) {
      // Mostra promoção ativa: preço original riscado + preço promocional
      const basePrice = Number(product.price) || i.unitPrice;
      const promoPrice = Number(product.promotional_price) || i.unitPrice;
      const pct = basePrice > 0 ? Math.round((1 - promoPrice / basePrice) * 100) : 0;
      itemLines.push(`${i.quantity}x ${productName} — ~${brl(basePrice)}~ ${brl(promoPrice)} 🏷️ -${pct}%`);
    } else {
      itemLines.push(`${i.quantity}x ${productName} — ${brl(i.unitPrice)}`);
    }

    const optionsByGroup: Record<string, any[]> = {};
    // Marca adicionais obrigatórios com um símbolo no WhatsApp
    const requiredGroups = new Set<string>(
      Array.isArray(i.options)
        ? i.options.filter((o: any) => o?.is_required || o?.group_required).map((o: any) => o?.group_name || "Adicionais")
        : []
    );
    if (Array.isArray(i.options)) {
      i.options.forEach((o: any) => {
        if (!o || !o.name) return;
        const group = o.group_name || (Number(o.price || 0) > 0 ? "Adicionais" : "Opções");
        if (!optionsByGroup[group]) optionsByGroup[group] = [];
        optionsByGroup[group].push(o);
      });
    }

    Object.entries(optionsByGroup).forEach(([groupName, groupOptions]) => {
      const marker = requiredGroups.has(groupName) ? " *(obrigatório)*" : "";
      itemLines.push(`${groupName}${marker}:`);
      groupOptions.forEach(o => {
        const qty = o.quantity && o.quantity > 1 ? `${o.quantity}x ` : "";
        const obs = o.observation ? ` (${o.observation})` : "";
        const price = Number(o.price || 0) > 0 ? ` + ${brl(Number(o.price) * (o.quantity || 1))}` : "";
        itemLines.push(`- ${qty}${o.name}${obs}${price}`);
      });
    });

    if (Array.isArray(i.removed) && i.removed.length > 0) {
      itemLines.push(`Remover:`);
      i.removed.forEach(r => {
        if (r) itemLines.push(`- ${r}`);
      });
    }

    if (i.note) {
      itemLines.push(`Observação:`);
      itemLines.push(i.note);
    }

    itemLines.push(`Total do item: ${brl(i.unitPrice * i.quantity)}`);
    if (promoActive) {
      const basePrice = Number(product.price) || i.unitPrice;
      const saved = (basePrice - i.unitPrice) * i.quantity;
      if (saved > 0) itemLines.push(`(economia com promoção: ${brl(saved)})`);
    }
    
    return itemLines.join("\n");
  }).join("\n\n");

  const taxaTxt = data.type !== "entrega"
    ? "-"
    : feeToConfirm || taxa == null
      ? "a confirmar pelo WhatsApp"
      : brl(taxa);

  const lines: string[] = [];
  lines.push(`Olá, quero fazer um pedido pelo Sabores da Serra.`);
  lines.push(``);
  lines.push(`Estabelecimento: ${est.name}`);
  lines.push(`Cliente: ${data.name}`);
  lines.push(`WhatsApp: ${data.phone || "-"}`);
  lines.push(`Tipo de pedido: ${typeLabel(data.type)}`);
  lines.push(``);

  if (data.type === "entrega") {
    const enderecoCompleto = `${data.street || ""}, ${data.number || ""}${data.complement ? " - " + data.complement : ""}`.trim();
    lines.push(`Endereço:`);
    lines.push(enderecoCompleto || "-");
    if (data.neighborhood) lines.push(`Bairro: ${data.neighborhood}`);
    if (data.city) lines.push(`Cidade: ${data.city}`);
    if (data.zip) lines.push(`CEP: ${data.zip}`);

    if (v2?.popularLocationName || data.popular_location_name) {
      lines.push(``);
      lines.push(`Nome popular da localidade:`);
      lines.push(v2?.popularLocationName || data.popular_location_name || "");
    }

    if (v2?.regionName) {
      lines.push(``);
      lines.push(`Região selecionada:`);
      lines.push(v2.regionName);
    }

    if (v2?.pontoReferencia || data.reference) {
      lines.push(``);
      lines.push(`Ponto de referência:`);
      lines.push(v2?.pontoReferencia || data.reference || "");
    }

    if (v2?.deliveryInstructions || data.delivery_instructions) {
      lines.push(``);
      lines.push(`Instruções para o entregador:`);
      lines.push(v2?.deliveryInstructions || data.delivery_instructions || "");
    }

    if (v2?.visualReferenceLink) {
      lines.push(``);
      lines.push(`📸 Referência visual da residência:`);
      lines.push(v2.visualReferenceLink);
      
      const details: string[] = [];
      if (v2.visualReferenceData) {
        const { mediaCount, hasVideo, hasInstructions, hasPins } = v2.visualReferenceData;
        if (mediaCount > 0) details.push(`📸 ${mediaCount} Foto${mediaCount > 1 ? "s" : ""}`);
        if (hasVideo) details.push(`🎥 Vídeo da fachada`);
        if (hasInstructions) details.push(`📝 Instruções detalhadas`);
        if (hasPins) details.push(`📍 Pins de referência`);
      }
      
      if (details.length > 0) {
        lines.push(``);
        lines.push(`Conteúdo disponível:`);
        details.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
      }
      
      lines.push(``);
      lines.push(`💡 *Dica:* Abra o link acima para ver as fotos e orientações que ajudam a encontrar o local exato.`);
    } else {
      lines.push(``);
      lines.push(`⚠️ Nenhuma referência visual cadastrada para este endereço.`);
      lines.push(`💡 Cadastre fotos e vídeos do seu local no seu perfil para facilitar as próximas entregas.`);
    }
  } else if (data.type === "retirada") {
    lines.push(`Retirada no local${data.pickupTime ? " às " + data.pickupTime : ""}`);
  } else {
    lines.push(`Comer no local${data.people ? " - " + data.people + " pessoa(s)" : ""}${data.visitTime ? " às " + data.visitTime : ""}`);
  }

  lines.push(``);
  lines.push(`Pedido:`);
  lines.push(itemsTxt);
  lines.push(``);
  lines.push(`Subtotal: ${brl(subtotal)}`);
  if (data.type === "entrega") {
    lines.push(feeToConfirm || taxa == null
      ? `Taxa de entrega: a confirmar pelo WhatsApp.`
      : `Taxa estimada de entrega: ${taxaTxt}`);
  }
  lines.push(`Total estimado: ${brl(total)}`);
  lines.push(``);
  lines.push(`Forma de pagamento pretendida:`);
  lines.push(data.payment || "a combinar");

  if (data.note) {
    lines.push(``);
    lines.push(`Observação:`);
    lines.push(data.note);
  }

  lines.push(``);
  lines.push(`Por favor, confirme disponibilidade, prazo, taxa de entrega e valor final antes do preparo.`);

  if (trackingCode) {
    lines.push(``);
    lines.push(`Acompanhe o pedido em tempo real: ${typeof window !== "undefined" ? window.location.origin : ""}/pedido/${trackingCode}`);
  }

  return lines.join("\n");
}

export function whatsappLink(phone: string, msg: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}
