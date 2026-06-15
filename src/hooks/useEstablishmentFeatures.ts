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
      const { data } = await supabase.rpc("get_establishment_plan_info", { _estab_id: establishmentId! });
      const info: any = data ?? {};
      return {
        planId: info.plan_id ?? null,
        planName: info.plan_name ?? null,
        planSlug: (info.plan_slug as PlanSlug) ?? null,
        features: info.features_json ?? {},
      };
    },
  });
}

export function hasFeature(features: Record<string, any>, key: FeatureKey): boolean {
  const v = features?.[key];
  return v === true || (typeof v === "number" && v > 0);
}
