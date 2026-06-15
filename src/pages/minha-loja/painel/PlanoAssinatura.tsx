import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, FEATURE_MIN_PLAN, PLAN_LABEL, type FeatureKey } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FEATURES_DISPLAY: { key: FeatureKey; label: string }[] = [
  { key: "basic_info", label: "Dados básicos" },
  { key: "opening_hours", label: "Horários" },
  { key: "basic_menu", label: "Cardápio básico" },
  { key: "product_photos", label: "Fotos de produto" },
  { key: "simple_promotions", label: "Promoções simples" },
  { key: "advanced_promotions", label: "Promoções avançadas" },
  { key: "delivery_regions", label: "Regiões de entrega" },
  { key: "delivery_region_rules", label: "Regras de entrega" },
  { key: "featured_products", label: "Produtos em destaque" },
  { key: "review_replies", label: "Responder avaliações" },
  { key: "basic_metrics", label: "Métricas básicas" },
  { key: "intermediate_metrics", label: "Métricas intermediárias" },
  { key: "advanced_metrics", label: "Métricas avançadas" },
  { key: "commercial_insights", label: "Inteligência comercial" },
  { key: "benchmark", label: "Benchmark" },
  { key: "visual_customization", label: "Personalização visual" },
  { key: "premium_gallery", label: "Galeria premium" },
  { key: "video_section", label: "Vídeos da loja" },
];

export default function PlanoAssinatura() {
  const { ctx } = useActiveEstablishment();
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("plans").select("id,name,slug,price_cents,benefits,features_json,position").eq("is_active", true).order("position").then(({ data }) => setPlans(data ?? []));
    if (ctx) {
      supabase.from("subscription_audit_logs").select("created_at,old_plan_id,new_plan_id,reason")
        .eq("establishment_id", ctx.establishmentId).order("created_at", { ascending: false }).limit(20)
        .then(({ data }) => setHistory(data ?? []));
    }
  }, [ctx?.establishmentId]);

  if (!ctx) return null;

  const requestUpgrade = async () => {
    await supabase.from("business_insights").insert({
      establishment_id: ctx.establishmentId, insight_type: "upgrade_request",
      title: "Solicitação de upgrade de plano",
      description: `Loja ${ctx.establishmentName} solicitou upgrade de plano.`,
      recommendation: "Entre em contato com a loja.",
      severity: "info", status: "open",
    } as any);
    toast.success("Solicitação enviada");
  };

  const planName = (id?: string | null) => plans.find((p) => p.id === id)?.name ?? "—";

  return (
    <PainelSection title="Plano e assinatura" subtitle="Recursos disponíveis dependem do plano ativo desta loja">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="text-xs text-muted-foreground">Plano atual</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <strong className="text-lg">{ctx.activePlan.name ?? "—"}</strong>
            <Badge variant="outline" className="text-[10px]">{ctx.subscriptionStatus ?? "—"}</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Recursos liberados</h3>
            <ul className="space-y-1 text-xs">
              {FEATURES_DISPLAY.filter((f) => canUseFeature(ctx, f.key)).map((f) => (
                <li key={f.key}>✓ {f.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Recursos bloqueados</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {FEATURES_DISPLAY.filter((f) => !canUseFeature(ctx, f.key)).map((f) => (
                <li key={f.key}>🔒 {f.label} <span className="text-[10px]">— plano {PLAN_LABEL[FEATURE_MIN_PLAN[f.key]!]}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Comparativo de planos</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-xl border p-3 text-xs ${p.id === ctx.activePlan.id ? "border-primary" : "border-border"}`}>
                <div className="font-semibold">{p.name}</div>
                <div className="text-muted-foreground">R$ {(p.price_cents/100).toFixed(2)}/mês</div>
                <ul className="mt-2 space-y-0.5">
                  {(p.benefits ?? []).slice(0,5).map((b: string, i: number) => <li key={i}>• {b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={requestUpgrade}>Solicitar upgrade</Button>
          <Button asChild variant="outline">
            <a href={`/minha-loja/${ctx.establishmentId}/planos`}>Comparar planos em detalhe</a>
          </Button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Histórico de alterações</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem alterações registradas.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {history.map((h, i) => (
                <li key={i}>{new Date(h.created_at).toLocaleString()} — {planName(h.old_plan_id)} → {planName(h.new_plan_id)} ({h.reason})</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PainelSection>
  );
}
