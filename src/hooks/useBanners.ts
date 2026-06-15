import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BannerPlacement =
  | "home_top"
  | "home_mid"
  | "category_top"
  | "category_mid"
  | "establishment_menu"
  | "loja_top";

export interface Banner {
  id: string;
  title: string | null;
  image: string;
  link: string | null;
  cta_label: string | null;
  placement: BannerPlacement;
  category_key: string | null;
  establishment_id: string | null;
  media_type: string;
  priority: number;
  impressions: number;
  clicks: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  paid_by_establishment_id: string | null;
}

interface Opts {
  categoryKey?: string | null;
  establishmentId?: string | null;
  enabled?: boolean;
}

export function useBanners(placement: BannerPlacement, opts: Opts = {}) {
  return useQuery({
    queryKey: ["banners", placement, opts.categoryKey ?? null, opts.establishmentId ?? null],
    enabled: opts.enabled !== false,
    queryFn: async () => {
      let q = supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .eq("placement", placement)
        .order("priority", { ascending: false });
      if (opts.categoryKey) q = q.eq("category_key", opts.categoryKey);
      if (opts.establishmentId) q = q.eq("establishment_id", opts.establishmentId);
      const { data } = await q;
      const now = new Date();
      return ((data as unknown as Banner[]) || []).filter((b) => {
        if (b.starts_at && new Date(b.starts_at) > now) return false;
        if (b.ends_at && new Date(b.ends_at) < now) return false;
        return true;
      });
    },
  });
}
