import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MyEstablishment = {
  id: string;
  name: string;
  slug: string;
  status: string;
  approval_status: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  logo: string | null;
  cover: string | null;
  city: string | null;
  neighborhood: string | null;
  role: string;
  suspended_reason: string | null;
};

export function useMyEstablishments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-estabs", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyEstablishment[]> => {
      // Lojas onde sou owner direto
      const { data: own, error } = await supabase
        .from("establishments")
        .select("id,name,slug,status,approval_status,plan_id,logo,cover,city,neighborhood,suspended_reason,plans(name,slug)")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Lojas onde sou membro
      const { data: memberships } = await supabase
        .from("establishment_owners")
        .select("role, establishment_id, establishments(id,name,slug,status,approval_status,plan_id,logo,cover,city,neighborhood,suspended_reason,plans(name,slug))")
        .eq("user_id", user!.id);

      const ownedIds = new Set((own ?? []).map((e: any) => e.id));
      const merged: MyEstablishment[] = (own ?? []).map((e: any) => ({
        id: e.id, name: e.name, slug: e.slug, status: e.status,
        approval_status: e.approval_status, plan_id: e.plan_id,
        plan_name: e.plans?.name ?? null, plan_slug: e.plans?.slug ?? null,
        logo: e.logo, cover: e.cover, city: e.city, neighborhood: e.neighborhood,
        suspended_reason: e.suspended_reason, role: "owner",
      }));
      for (const m of memberships ?? []) {
        const e: any = (m as any).establishments;
        if (!e || ownedIds.has(e.id)) continue;
        merged.push({
          id: e.id, name: e.name, slug: e.slug, status: e.status,
          approval_status: e.approval_status, plan_id: e.plan_id,
          plan_name: e.plans?.name ?? null, plan_slug: e.plans?.slug ?? null,
          logo: e.logo, cover: e.cover, city: e.city, neighborhood: e.neighborhood,
          suspended_reason: e.suspended_reason, role: (m as any).role ?? "manager",
        });
      }
      return merged;
    },
  });
}

export function deriveStatus(e: Pick<MyEstablishment, "status" | "approval_status">) {
  return (e.approval_status ?? (e.status === "ativo" ? "approved" : e.status === "pendente" ? "pending_approval" : e.status)) as string;
}
