import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EstablishmentTheme {
  establishment_id: string;
  background_color: string | null;
  background_image: string | null;
  background_opacity: number;
  background_blur: number;
  accent_color: string | null;
  header_style: "solid" | "gradient" | "image";
  font_pair: "modern" | "rustic" | "elegant" | "playful";
  card_style: "flat" | "elevated" | "outlined";
  show_story: boolean;
  show_gallery: boolean;
  show_reviews_inline: boolean;
  menu_banners: { image: string; link?: string; position?: number }[];
}

export function useEstablishmentTheme(slug?: string) {
  return useQuery({
    queryKey: ["establishment-theme", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: est } = await supabase
        .from("establishments")
        .select("id, menu_type, slug")
        .eq("slug", slug!)
        .maybeSingle();
      if (!est) return { establishmentId: null, menuType: "essencial" as const, theme: null };
      const { data: theme } = await supabase
        .from("establishment_themes")
        .select("*")
        .eq("establishment_id", est.id)
        .maybeSingle();
      return {
        establishmentId: est.id as string,
        menuType: est.menu_type as "essencial" | "exclusivo",
        theme: (theme as unknown as EstablishmentTheme | null) ?? null,
      };
    },
  });
}

export function useEstablishmentThemeById(establishmentId?: string) {
  return useQuery({
    queryKey: ["establishment-theme-by-id", establishmentId],
    enabled: !!establishmentId,
    queryFn: async () => {
      const { data: theme } = await supabase
        .from("establishment_themes")
        .select("*")
        .eq("establishment_id", establishmentId!)
        .maybeSingle();
      return (theme as unknown as EstablishmentTheme | null) ?? null;
    },
  });
}
