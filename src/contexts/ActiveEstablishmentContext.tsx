import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ActiveEstablishment, EstablishmentRole, PlanSlug } from "@/lib/permissions";

const Ctx = createContext<{ ctx: ActiveEstablishment | null; loading: boolean }>({ ctx: null, loading: true });

export function ActiveEstablishmentProvider({ children }: { children: ReactNode }) {
  const { establishmentId } = useParams<{ establishmentId: string }>();
  const { user, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["active-estab", establishmentId, user?.id, isAdmin],
    enabled: !!establishmentId,
    queryFn: async (): Promise<ActiveEstablishment | null> => {
      const id = establishmentId!;
      const { data: est } = await supabase
        .from("establishments")
        .select("id,name,slug,status,approval_status,owner_id,plan_id,plans(id,name,slug)")
        .eq("id", id).maybeSingle();
      if (!est) return null;

      let role: EstablishmentRole | null = null;
      if (isAdmin) role = "admin";
      else if (user?.id === est.owner_id) role = "owner";
      else if (user) {
        const { data: m } = await supabase
          .from("establishment_owners")
          .select("role").eq("user_id", user.id).eq("establishment_id", id).maybeSingle();
        role = (m?.role as EstablishmentRole) ?? null;
      }

      const { data: planInfo } = await supabase.rpc("get_establishment_plan_info", { _estab_id: id });
      const info: any = planInfo ?? {};
      const planId: string | null = info.plan_id ?? null;
      const planName: string | null = info.plan_name ?? null;
      const planSlug: PlanSlug | null = (info.plan_slug as PlanSlug) ?? null;
      const features: Record<string, any> = info.features_json ?? {};
      const subscriptionStatus: string | null = info.subscription_status ?? null;

      return {
        establishmentId: est.id,
        establishmentName: est.name,
        establishmentSlug: est.slug,
        establishmentStatus: est.status,
        approvalStatus: (est as any).approval_status ?? null,
        userRoleInEstablishment: role,
        isPlatformAdmin: !!isAdmin,
        activePlan: { id: planId, name: planName, slug: planSlug },
        activeFeatures: features,
        subscriptionStatus,
      };
    },
  });

  return <Ctx.Provider value={{ ctx: data ?? null, loading: isLoading }}>{children}</Ctx.Provider>;
}

export function useActiveEstablishment() {
  return useContext(Ctx);
}
