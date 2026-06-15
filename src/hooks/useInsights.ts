import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Insight = {
  type: string;
  title: string;
  description: string;
  recommendation: string;
  severity: "info" | "warning" | "critical" | "opportunity";
};

export type EstablishmentAnalytics = {
  visits: number;
  whatsappClicks: number;
  cartAdds: number;
  productViews: number;
  estimatedValue: number;
  avgTicket: number;
  conversionRate: number;
  cartToWaRate: number;
  peakHour: number | null;
  peakWeekday: number | null;
  topProductId: string | null;
  topCartProductId: string | null;
  topWaProductId: string | null;
  topAbandonedProductId: string | null;
  hourly: { hour: number; count: number }[];
  weekly: { weekday: number; count: number }[];
  byNeighborhood: { neighborhood: string; count: number }[];
  productStats: Map<string, { views: number; carts: number; wa: number }>;
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function weekdayLabel(d: number | null) {
  return d == null ? "—" : WEEKDAYS[d];
}

export function useEstablishmentAnalytics(establishmentId?: string, days = 30) {
  return useQuery({
    queryKey: ["est-analytics", establishmentId, days],
    enabled: !!establishmentId,
    queryFn: async (): Promise<EstablishmentAnalytics> => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("type, product_id, hour, weekday, value_cents, neighborhood")
        .eq("establishment_id", establishmentId!)
        .gte("created_at", since);
      if (error) throw error;

      const ev = data || [];
      const counts: Record<string, number> = {};
      const hourly: Record<number, number> = {};
      const weekly: Record<number, number> = {};
      const hood: Record<string, number> = {};
      const productStats = new Map<string, { views: number; carts: number; wa: number }>();
      let estimatedValue = 0;
      let waCount = 0;

      for (const e of ev) {
        counts[e.type] = (counts[e.type] || 0) + 1;
        if (e.hour != null) hourly[e.hour] = (hourly[e.hour] || 0) + 1;
        if (e.weekday != null) weekly[e.weekday] = (weekly[e.weekday] || 0) + 1;
        if (e.neighborhood) hood[e.neighborhood] = (hood[e.neighborhood] || 0) + 1;
        if (e.product_id) {
          const s = productStats.get(e.product_id) || { views: 0, carts: 0, wa: 0 };
          if (e.type === "product_view") s.views++;
          if (e.type === "cart_add") s.carts++;
          if (e.type === "whatsapp_send") s.wa++;
          productStats.set(e.product_id, s);
        }
        if (e.type === "whatsapp_send") {
          waCount++;
          if (e.value_cents) estimatedValue += e.value_cents;
        }
      }

      const pickTop = (key: "views" | "carts" | "wa") => {
        let best: string | null = null; let bestN = 0;
        productStats.forEach((s, id) => { if (s[key] > bestN) { bestN = s[key]; best = id; } });
        return best;
      };
      let topAbandoned: string | null = null; let worst = 0;
      productStats.forEach((s, id) => {
        const ab = s.carts - s.wa;
        if (s.carts >= 3 && ab > worst) { worst = ab; topAbandoned = id; }
      });

      const visits = counts["pageview"] || counts["establishment_view"] || 0;
      const cartAdds = counts["cart_add"] || 0;
      const productViews = counts["product_view"] || 0;
      const whatsappClicks = waCount;

      const peakHour = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0]?.[0];
      const peakWeekday = Object.entries(weekly).sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        visits,
        whatsappClicks,
        cartAdds,
        productViews,
        estimatedValue: estimatedValue / 100,
        avgTicket: whatsappClicks ? estimatedValue / whatsappClicks / 100 : 0,
        conversionRate: visits ? whatsappClicks / visits : 0,
        cartToWaRate: cartAdds ? whatsappClicks / cartAdds : 0,
        peakHour: peakHour != null ? Number(peakHour) : null,
        peakWeekday: peakWeekday != null ? Number(peakWeekday) : null,
        topProductId: pickTop("views"),
        topCartProductId: pickTop("carts"),
        topWaProductId: pickTop("wa"),
        topAbandonedProductId: topAbandoned,
        hourly: Object.entries(hourly).map(([h, c]) => ({ hour: Number(h), count: c })).sort((a, b) => a.hour - b.hour),
        weekly: Object.entries(weekly).map(([w, c]) => ({ weekday: Number(w), count: c })).sort((a, b) => a.weekday - b.weekday),
        byNeighborhood: Object.entries(hood).map(([neighborhood, count]) => ({ neighborhood, count })).sort((a, b) => b.count - a.count),
        productStats,
      };
    },
  });
}

export function generateInsights(
  a: EstablishmentAnalytics,
  ctx: { lastMenuUpdateDays?: number | null; rating?: number; categoryAvgRating?: number; products?: { id: string; name: string; image?: string | null; description?: string | null }[] }
): Insight[] {
  const out: Insight[] = [];
  const productById = new Map(ctx.products?.map(p => [p.id, p]) || []);

  if (a.peakHour != null) {
    const h = a.peakHour;
    out.push({
      type: "peak_hour",
      severity: "opportunity",
      title: "Horário com maior procura",
      description: `O pico de interesse acontece por volta das ${h}h.`,
      recommendation: `Considere criar uma promoção entre ${h}h e ${h + 2}h para aproveitar a alta demanda.`,
    });
  }
  if (a.peakWeekday != null) {
    out.push({
      type: "peak_weekday",
      severity: "info",
      title: "Dia da semana mais forte",
      description: `${weekdayLabel(a.peakWeekday)} concentra o maior interesse.`,
      recommendation: `Garanta equipe reforçada e cardápio atualizado nesse dia.`,
    });
  }

  if (a.topProductId) {
    const p = productById.get(a.topProductId);
    if (p) {
      out.push({
        type: "top_product",
        severity: "info",
        title: "Produto mais visto",
        description: `"${p.name}" é o produto que mais chama atenção.`,
        recommendation: `Destaque-o no topo do cardápio e considere criar combos com ele.`,
      });
      if (!p.image) out.push({
        type: "missing_photo",
        severity: "warning",
        title: "Foto ausente no produto mais visto",
        description: `"${p.name}" recebe muitas visualizações mas não tem foto.`,
        recommendation: `Adicionar foto ao produto mais visto pode melhorar a decisão do cliente.`,
      });
      if (!p.description) out.push({
        type: "missing_description",
        severity: "warning",
        title: "Produto sem descrição",
        description: `"${p.name}" não tem descrição.`,
        recommendation: `Adicione uma descrição mais atrativa para melhorar a conversão.`,
      });
    }
  }

  if (a.topAbandonedProductId) {
    const p = productById.get(a.topAbandonedProductId);
    if (p) out.push({
      type: "abandonment",
      severity: "warning",
      title: "Produto com alto abandono",
      description: `"${p.name}" é adicionado ao carrinho mas pouco enviado ao WhatsApp.`,
      recommendation: `Revise preço, descrição e taxa de entrega desse produto.`,
    });
  }

  if (a.visits > 30 && a.conversionRate < 0.05) {
    out.push({
      type: "low_conversion_visits",
      severity: "critical",
      title: "Muitas visitas, poucos pedidos",
      description: `Sua loja recebe visitas mas a conversão para WhatsApp está baixa (${(a.conversionRate * 100).toFixed(1)}%).`,
      recommendation: `Revise fotos, descrições e informações de contato. Verifique se o WhatsApp está ativo.`,
    });
  }

  if (a.cartAdds > 10 && a.cartToWaRate < 0.4) {
    out.push({
      type: "low_cart_to_wa",
      severity: "warning",
      title: "Bom carrinho, baixa finalização",
      description: `Muitos usuários adicionam ao carrinho, mas poucos enviam ao WhatsApp.`,
      recommendation: `Revise preços, taxa de entrega ou clareza das informações de pedido.`,
    });
  }

  if (ctx.rating != null && ctx.categoryAvgRating != null && ctx.rating < ctx.categoryAvgRating - 0.3) {
    out.push({
      type: "low_rating",
      severity: "warning",
      title: "Avaliação abaixo da média da categoria",
      description: `Sua nota (${ctx.rating.toFixed(1)}) está abaixo da média da categoria (${ctx.categoryAvgRating.toFixed(1)}).`,
      recommendation: `Responda as avaliações recentes e acompanhe os pontos críticos mencionados.`,
    });
  }

  if (ctx.lastMenuUpdateDays != null && ctx.lastMenuUpdateDays > 30) {
    out.push({
      type: "stale_menu",
      severity: "warning",
      title: "Cardápio desatualizado",
      description: `O cardápio não é atualizado há ${ctx.lastMenuUpdateDays} dias.`,
      recommendation: `Atualize preços, retire produtos indisponíveis e adicione novidades.`,
    });
  }

  if (a.byNeighborhood[0] && a.byNeighborhood[0].count > 5) {
    out.push({
      type: "top_neighborhood",
      severity: "opportunity",
      title: "Bairro com maior interesse",
      description: `Clientes da região "${a.byNeighborhood[0].neighborhood}" demonstram maior interesse.`,
      recommendation: `Considere destacar entrega para esse bairro ou criar promoção regional.`,
    });
  }

  return out;
}
