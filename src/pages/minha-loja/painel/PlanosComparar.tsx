import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import {
  PLAN_LABEL, PLAN_ORDER, FEATURE_MIN_PLAN, planLabelForFeature,
  type FeatureKey, type PlanSlug,
} from "@/lib/permissions";
import { PainelSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FEATURE_GROUPS: { title: string; items: { key: FeatureKey; label: string }[] }[] = [
  {
    title: "Presença e cardápio",
    items: [
      { key: "basic_info", label: "Dados básicos" },
      { key: "opening_hours", label: "Horários" },
      { key: "basic_menu", label: "Cardápio essencial" },
      { key: "product_photos", label: "Fotos de produto" },
      { key: "social_links", label: "Links sociais" },
    ],
  },
  {
    title: "Pedidos e atendimento",
    items: [
      { key: "receive_whatsapp_orders", label: "Pedidos via WhatsApp" },
      { key: "basic_orders_panel", label: "Painel de pedidos" },
      { key: "pickup_enabled", label: "Retirada no local" },
      { key: "dine_in_enabled", label: "Consumo no salão" },
      { key: "delivery_fixed_fee", label: "Taxa fixa de entrega" },
      { key: "delivery_regions", label: "Regiões de entrega" },
      { key: "delivery_region_rules", label: "Regras avançadas por região" },
    ],
  },
  {
    title: "Produtos e promoções",
    items: [
      { key: "simple_addons", label: "Adicionais simples" },
      { key: "advanced_addons", label: "Adicionais avançados" },
      { key: "product_variations", label: "Variações de produto" },
      { key: "combos", label: "Combos" },
      { key: "simple_promotions", label: "Promoções simples" },
      { key: "advanced_promotions", label: "Campanhas avançadas" },
      { key: "featured_products", label: "Produtos em destaque" },
      { key: "category_ordering", label: "Ordenação de categorias" },
    ],
  },
  {
    title: "Avaliações",
    items: [
      { key: "basic_reviews", label: "Receber avaliações" },
      { key: "review_replies", label: "Responder avaliações" },
      { key: "photo_reviews", label: "Fotos em avaliações" },
    ],
  },
  {
    title: "Métricas e inteligência",
    items: [
      { key: "basic_metrics", label: "Métricas básicas" },
      { key: "intermediate_metrics", label: "Métricas intermediárias" },
      { key: "advanced_metrics", label: "Métricas avançadas" },
      { key: "commercial_insights", label: "Inteligência comercial" },
      { key: "benchmark", label: "Benchmark de mercado" },
      { key: "pdf_reports", label: "Relatórios em PDF" },
      { key: "action_plan", label: "Plano de ação semanal" },
    ],
  },
  {
    title: "Personalização visual",
    items: [
      { key: "visual_customization", label: "Editor de tema" },
      { key: "custom_colors", label: "Cores personalizadas" },
      { key: "custom_fonts", label: "Fontes personalizadas" },
      { key: "premium_gallery", label: "Galeria premium" },
      { key: "video_section", label: "Seção de vídeo" },
    ],
  },
];

function planRank(slug?: PlanSlug | null) {
  return slug ? PLAN_ORDER.indexOf(slug) : -1;
}

export default function PlanosComparar() {
  const { ctx } = useActiveEstablishment();
  const [search] = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const fromFeature = search.get("from") as FeatureKey | null;

  useEffect(() => {
    supabase.from("plans")
      .select("id,name,slug,price_cents,benefits,features_json,position,description")
      .eq("is_active", true).order("position")
      .then(({ data }) => setPlans(data ?? []));
  }, []);

  if (!ctx) return null;

  const currentRank = planRank(ctx.activePlan.slug);
  const requiredSlug = fromFeature ? FEATURE_MIN_PLAN[fromFeature] : null;
  const requiredRank = planRank(requiredSlug);

  const requestUpgrade = async (targetSlug: PlanSlug) => {
    const target = plans.find((p) => p.slug === targetSlug);
    await supabase.from("business_insights").insert({
      establishment_id: ctx.establishmentId,
      insight_type: "upgrade_request",
      title: `Upgrade para ${target?.name ?? targetSlug}`,
      description: `Loja ${ctx.establishmentName} solicitou upgrade${fromFeature ? ` para liberar “${planLabelForFeature(fromFeature)}”` : ""}.`,
      recommendation: "Entre em contato com a loja para concluir o upgrade.",
      severity: "info", status: "open",
    } as any);
    toast.success("Solicitação de upgrade enviada");
  };

  return (
    <PainelSection
      title="Comparar planos"
      subtitle="Veja exatamente o que cada plano libera para esta loja"
    >
      {fromFeature && requiredSlug && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <Sparkles className="size-5 text-primary mt-0.5" />
          <div className="text-sm">
            Para usar <strong>{planLabelForFeature(fromFeature)}</strong>, esta loja precisa do plano{" "}
            <strong>{PLAN_LABEL[requiredSlug]}</strong> ou superior.
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((slug) => {
          const p = plans.find((x) => x.slug === slug);
          if (!p) return null;
          const isCurrent = ctx.activePlan.slug === slug;
          const rank = planRank(slug);
          const isUpgrade = rank > currentRank;
          const isMinRequired = requiredSlug && slug === requiredSlug;
          return (
            <div
              key={slug}
              className={cn(
                "relative rounded-2xl border bg-card p-4 flex flex-col",
                isCurrent ? "border-primary shadow-soft" : "border-border",
                isMinRequired && !isCurrent && "ring-2 ring-primary/50",
              )}
            >
              {isMinRequired && !isCurrent && (
                <Badge className="absolute -top-2 left-3 text-[10px]">Mínimo necessário</Badge>
              )}
              {isCurrent && (
                <Badge variant="secondary" className="absolute -top-2 right-3 text-[10px]">Plano atual</Badge>
              )}
              <div className="font-display text-lg font-bold">{p.name}</div>
              <div className="text-sm text-muted-foreground">R$ {(p.price_cents / 100).toFixed(2)}/mês</div>
              {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
              <ul className="mt-3 space-y-1 text-xs">
                {(p.benefits ?? []).slice(0, 6).map((b: string, i: number) => (
                  <li key={i} className="flex gap-1.5"><Check className="size-3.5 text-primary mt-0.5 shrink-0" />{b}</li>
                ))}
              </ul>
              <div className="mt-auto pt-3">
                {isCurrent ? (
                  <Button disabled variant="outline" size="sm" className="w-full">Plano atual</Button>
                ) : isUpgrade ? (
                  <Button onClick={() => requestUpgrade(slug)} size="sm" className="w-full">
                    Solicitar upgrade
                  </Button>
                ) : (
                  <Button disabled variant="ghost" size="sm" className="w-full">Plano inferior</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-5">
        <h3 className="text-sm font-semibold">Comparativo detalhado</h3>
        {FEATURE_GROUPS.map((g) => (
          <div key={g.title} className="overflow-hidden rounded-xl border border-border">
            <div className="bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide">{g.title}</div>
            <div className="divide-y divide-border">
              {g.items.map((f) => {
                const needed = FEATURE_MIN_PLAN[f.key];
                const neededRank = planRank(needed);
                return (
                  <div key={f.key} className="grid grid-cols-5 items-center gap-2 px-3 py-2 text-xs">
                    <div className={cn("col-span-1", fromFeature === f.key && "font-semibold text-primary")}>{f.label}</div>
                    {PLAN_ORDER.map((slug, idx) => {
                      const included = idx >= neededRank;
                      const isCurrent = ctx.activePlan.slug === slug;
                      return (
                        <div key={slug} className={cn("col-span-1 text-center", isCurrent && "bg-primary/5 rounded")}>
                          {included
                            ? <Check className="inline size-3.5 text-primary" />
                            : <X className="inline size-3.5 text-muted-foreground/40" />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-5 gap-2 px-3 text-[10px] uppercase tracking-wide text-muted-foreground">
          <div></div>
          {PLAN_ORDER.map((s) => <div key={s} className="text-center">{PLAN_LABEL[s]}</div>)}
        </div>
      </div>
    </PainelSection>
  );
}
