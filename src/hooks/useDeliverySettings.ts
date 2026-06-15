import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DeliveryModel =
  | "to_confirm"
  | "fixed"
  | "by_region"
  | "by_region_manual"
  | "free"
  | "no_delivery"
  | "pickup_only"
  | "dine_in_only";

export type RegionStatus = "ativo" | "inativo" | "nao_atendida";

export interface DeliverySettings {
  id: string;
  establishment_id: string;
  delivery_model: DeliveryModel;
  delivery_available: boolean;
  pickup_available: boolean;
  dine_in_available: boolean;
  default_delivery_message: string | null;
  outside_area_message: string | null;
  always_confirm_by_whatsapp: boolean;
  delivery_v2_enabled: boolean;
}

export interface DeliveryRegion {
  id: string;
  establishment_id: string;
  name: string;
  fee: number;
  estimated_time: number | null;
  status: RegionStatus;
  requires_manual_confirmation: boolean;
  public_note: string | null;
  internal_note: string | null;
  display_order: number;
  min_order_value: number;
}

export type PlanTier = "presenca" | "essencial" | "exclusivo" | "gestao";

export function planTier(planName?: string | null): PlanTier {
  const n = (planName ?? "").toLowerCase();
  if (n.includes("gest") || n.includes("pro")) return "gestao";
  if (n.includes("exclus")) return "exclusivo";
  if (n.includes("essen")) return "essencial";
  return "presenca";
}

const RANK: Record<PlanTier, number> = { presenca: 0, essencial: 1, exclusivo: 2, gestao: 3 };
export const tierAtLeast = (t: PlanTier, min: PlanTier) => RANK[t] >= RANK[min];

export function allowedModels(tier: PlanTier): DeliveryModel[] {
  const base: DeliveryModel[] = ["to_confirm", "no_delivery", "pickup_only", "dine_in_only"];
  if (tierAtLeast(tier, "essencial")) base.push("fixed", "by_region");
  if (tierAtLeast(tier, "exclusivo")) base.push("by_region_manual");
  return base;
}

export const MODEL_LABEL: Record<DeliveryModel, string> = {
  to_confirm: "Taxa de entrega a confirmar",
  fixed: "Taxa fixa",
  by_region: "Taxa por região",
  by_region_manual: "Taxa por região com confirmação manual",
  free: "Entrega grátis",
  no_delivery: "Sem entrega",
  pickup_only: "Somente retirada",
  dine_in_only: "Somente consumo no local",
};

export function useDeliverySettings(establishmentId?: string) {
  return useQuery({
    queryKey: ["delivery-settings", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("establishment_delivery_settings")
        .select("*")
        .eq("establishment_id", establishmentId!)
        .maybeSingle();
      return (data ?? null) as DeliverySettings | null;
    },
  });
}

export function useDeliveryRegions(establishmentId?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["delivery-regions", establishmentId, includeInactive],
    enabled: !!establishmentId,
    queryFn: async () => {
      let q = supabase
        .from("delivery_regions")
        .select("*")
        .eq("establishment_id", establishmentId!)
        .order("display_order");
      if (!includeInactive) q = q.neq("status", "inativo");
      const { data } = await q;
      return (data ?? []) as DeliveryRegion[];
    },
  });
}

export function useDeliveryMutations(establishmentId?: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["delivery-settings", establishmentId] });
    qc.invalidateQueries({ queryKey: ["delivery-regions", establishmentId, true] });
    qc.invalidateQueries({ queryKey: ["delivery-regions", establishmentId, false] });
  };

  return {
    async saveSettings(values: Partial<DeliverySettings>) {
      if (!establishmentId) return;
      const payload = { establishment_id: establishmentId, ...values } as any;
      const { error } = await supabase
        .from("establishment_delivery_settings")
        .upsert(payload, { onConflict: "establishment_id" });
      if (error) return toast.error(error.message);
      toast.success("Configurações salvas");
      invalidate();
    },
    async saveRegion(region: Partial<DeliveryRegion> & { name: string }) {
      if (!establishmentId) return;
      if (region.id) {
        const { error } = await supabase.from("delivery_regions").update(region as any).eq("id", region.id);
        if (error) return toast.error(error.message);
      } else {
        const { error } = await supabase
          .from("delivery_regions")
          .insert({ establishment_id: establishmentId, ...region } as any);
        if (error) return toast.error(error.message);
      }
      toast.success("Região salva");
      invalidate();
    },
    async removeRegion(id: string) {
      const { error } = await supabase.from("delivery_regions").delete().eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Região removida");
      invalidate();
    },
  };
}
