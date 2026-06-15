import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { periodRange, type Period } from "@/components/admin/PeriodFilter";

export function useDashboardKpis(period: Period) {
  return useQuery({
    queryKey: ["dashboard-kpis", period],
    queryFn: async () => {
      const { start, end } = periodRange(period);
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const [estabs, products, events, reviews] = await Promise.all([
        supabase.from("establishments").select("id,status,category,name,rating"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase
          .from("events")
          .select("type,value_cents,hour,weekday,created_at,establishment_id")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .limit(10000),
        supabase.from("reviews").select("rating,status"),
      ]);

      const evs = events.data ?? [];
      const all = estabs.data ?? [];
      const byStatus = all.reduce<Record<string, number>>((acc, e) => {
        acc[e.status] = (acc[e.status] ?? 0) + 1;
        return acc;
      }, {});

      const pageviews = evs.filter((e) => e.type === "pageview").length;
      const wpps = evs.filter((e) => e.type === "whatsapp_send");
      const valueCents = wpps.reduce((a, b) => a + (b.value_cents ?? 0), 0);
      const ticket = wpps.length ? valueCents / wpps.length : 0;
      const productViews = evs.filter((e) => e.type === "product_view").length;
      const cartAdds = evs.filter((e) => e.type === "cart_add").length;
      const estabClicks = evs.filter((e) => e.type === "establishment_view").length;

      // Day series
      const days: Record<string, { date: string; visitas: number; whatsapp: number }> = {};
      for (const ev of evs) {
        const d = new Date(ev.created_at).toISOString().slice(0, 10);
        days[d] ??= { date: d, visitas: 0, whatsapp: 0 };
        if (ev.type === "pageview") days[d].visitas++;
        if (ev.type === "whatsapp_send") days[d].whatsapp++;
      }
      const series = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));

      // By hour
      const byHour = Array.from({ length: 24 }, (_, h) => ({
        hour: `${h}h`,
        cliques: evs.filter((e) => e.hour === h && e.type === "whatsapp_send").length,
      }));
      // By weekday
      const wkLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const byWeekday = wkLabels.map((label, i) => ({
        label,
        cliques: evs.filter((e) => e.weekday === i && e.type === "whatsapp_send").length,
      }));

      // Top categories (by whatsapp clicks)
      const catCount: Record<string, number> = {};
      for (const ev of wpps) {
        if (!ev.establishment_id) continue;
        const est = all.find((e) => e.id === ev.establishment_id);
        if (est?.category) catCount[est.category] = (catCount[est.category] ?? 0) + 1;
      }
      const topCategories = Object.entries(catCount)
        .map(([category, value]) => ({ category, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Top establishments
      const estCount: Record<string, number> = {};
      for (const ev of wpps) {
        if (ev.establishment_id) estCount[ev.establishment_id] = (estCount[ev.establishment_id] ?? 0) + 1;
      }
      const topEstabs = Object.entries(estCount)
        .map(([id, v]) => ({ id, value: v, name: all.find((e) => e.id === id)?.name ?? "—" }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const avgRating = all.length
        ? (all.reduce((a, b) => a + Number(b.rating ?? 0), 0) / all.length).toFixed(1)
        : "—";

      return {
        estabTotal: all.length,
        estabAtivos: byStatus["ativo"] ?? 0,
        estabPendentes: byStatus["pendente"] ?? 0,
        estabInativos: (byStatus["inativo"] ?? 0) + (byStatus["suspenso"] ?? 0),
        productCount: products.count ?? 0,
        reviewsCount: reviews.data?.length ?? 0,
        pageviews,
        whatsappSends: wpps.length,
        productViews,
        cartAdds,
        estabClicks,
        valueCents,
        ticketCents: Math.round(ticket),
        avgRating,
        series,
        byHour,
        byWeekday,
        topCategories,
        topEstabs,
      };
    },
  });
}
