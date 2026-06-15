import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Establishment, Product, ProductWithEstablishment, CategoryKey, ServiceType } from "@/data/mockData";

function mapEstab(row: any): Establishment {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? undefined,
    description: row.description ?? "",
    story: row.story ?? undefined,
    category: (row.category ?? "restaurantes") as CategoryKey,
    categoryLabel: row.category_label ?? "",
    cover: row.cover ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=70",
    logo: row.logo ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=70",
    gallery: row.gallery ?? [],
    address: row.address ?? "",
    neighborhood: row.neighborhood ?? "",
    distanceKm: Number(row.distance_km ?? 0),
    openNow: !!row.open_now,
    hours: row.hours ?? "",
    etaMin: row.eta_min ?? 30,
    rating: Number(row.rating ?? 0),
    reviewsCount: row.reviews_count ?? 0,
    whatsapp: row.whatsapp ?? "",
    services: (row.services ?? []) as ServiceType[],
    payments: row.payments ?? [],
    deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : null,
    badges: (row.badges ?? []) as Establishment["badges"],
    menuType: (row.menu_type ?? "essencial") as "essencial" | "exclusivo",
    brandColor: row.brand_color ?? undefined,
    menuCategories: [],
    products: [],
    reviews: [],
  };
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    image: row.image ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=70",
    category: row.menu_category_id ?? "",
    featured: !!row.featured,
    promo: !!row.promo,
    popular: !!row.popular,
  };
}

export function usePublicEstablishments() {
  return useQuery({
    queryKey: ["public-estabs"],
    queryFn: async (): Promise<Establishment[]> => {
      const { data, error } = await supabase
        .from("establishments")
        .select("*")
        .eq("status", "ativo")
        .eq("approval_status", "approved")
        .eq("is_public", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapEstab);
    },
    staleTime: 30_000,
  });
}

export function usePublicProducts() {
  return useQuery({
    queryKey: ["public-products"],
    queryFn: async (): Promise<ProductWithEstablishment[]> => {
      const { data: estabs, error: e1 } = await supabase
        .from("establishments")
        .select("*")
        .eq("status", "ativo")
        .eq("approval_status", "approved")
        .eq("is_public", true);
      if (e1) throw e1;
      const ids = (estabs ?? []).map((e) => e.id);
      if (!ids.length) return [];
      const { data: prods, error: e2 } = await supabase
        .from("products")
        .select("*")
        .in("establishment_id", ids);
      if (e2) throw e2;
      const byId = new Map(estabs!.map((e) => [e.id, mapEstab(e)]));
      return (prods ?? []).map((p) => ({ ...mapProduct(p), establishment: byId.get(p.establishment_id)! }));
    },
    staleTime: 5_000,
  });
}

