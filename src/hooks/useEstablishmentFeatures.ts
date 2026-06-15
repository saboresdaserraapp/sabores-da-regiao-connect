import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeatureKey, PlanSlug } from "@/lib/planFeatures";

export type EstablishmentPlanInfo = {
  planId: string | null;
  planName: string | null;
  planSlug: PlanSlug | null;
  features: Record<string, boolean | number | null>;
};

export function useEstablishmentFeatures(establishmentId?: string) {
  return useQuery({
    queryKey: ["estab-features", establishmentId],
    enabled: !!establishmentId,
    queryFn: async (): Promise<EstablishmentPlanInfo> => {
      // tenta assinatura ativa primeiro
      const { data: sub } = await supabase
        .from("establishment_subscriptions")
        .select("plan_id, plans(name,slug,features_json)")
        .eq("establishment_id", establishmentId!)
        .in("status", ["active", "trial"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub?.plans) {
        const p: any = sub.plans;
        return { planId: sub.plan_id, planName: p.name, planSlug: p.slug, features: p.features_json ?? {} };
      }
      // fallback: plan_id direto
      const { data: estab } = await supabase
        .from("establishments")
        .select("plan_id, plans(name,slug,features_json)")
        .eq("id", establishmentId!)
        .maybeSingle();
      const p: any = (estab as any)?.plans;
      return {
        planId: estab?.plan_id ?? null,
        planName: p?.name ?? null,
        planSlug: p?.slug ?? null,
        features: p?.features_json ?? {},
      };
    },
  });
}

export function hasFeature(features: Record<string, any>, key: FeatureKey): boolean {
  const v = features?.[key];
  return v === true || (typeof v === "number" && v > 0);
}
