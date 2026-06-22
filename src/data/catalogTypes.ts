export type ServiceType = "entrega" | "retirada" | "local";
export type CategoryKey =
  | "pizzarias" | "lanches" | "restaurantes" | "marmitas" | "acai"
  | "cafes" | "bares" | "doces" | "sorvetes" | "caseira" | "japonesa" | "petiscos";

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promotional_price?: number;
  promotion_label?: string;
  image: string;
  category: string;
  featured?: boolean;
  promo?: boolean;
  popular?: boolean;
  options?: ProductOption[];
  removable?: string[];
}
export interface MenuCategory { id: string; name: string; }
export interface Review {
  id: string; author: string; rating: number; text: string; date: string;
  photo?: string; reply?: string;
}
export interface Establishment {
  id: string; slug: string; name: string; tagline?: string; description: string;
  story?: string;
  category: CategoryKey; categoryLabel: string;
  cover: string; logo: string; gallery?: string[];
  address: string; neighborhood: string; distanceKm: number;
  openNow: boolean; hours: string; etaMin: number; rating: number; reviewsCount: number;
  whatsapp: string;
  services: ServiceType[];
  payments: string[];
  deliveryFee?: number | null;
  badges: ("verificado" | "recomendado" | "turistas" | "promocao")[];
  menuType: "essencial" | "exclusivo";
  brandColor?: string;
  menuCategories: MenuCategory[];
  products: Product[];
  reviews: Review[];
}

export interface ProductWithEstablishment extends Product {
  establishment: Establishment;
}

export const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: "pizzarias", label: "Pizzarias", emoji: "🍕" },
  { key: "lanches", label: "Lanches", emoji: "🍔" },
  { key: "restaurantes", label: "Restaurantes", emoji: "🍽️" },
  { key: "marmitas", label: "Marmitas", emoji: "🍱" },
  { key: "acai", label: "Açaí", emoji: "🍇" },
  { key: "cafes", label: "Cafés", emoji: "☕" },
  { key: "bares", label: "Bares", emoji: "🍻" },
  { key: "doces", label: "Doces", emoji: "🧁" },
  { key: "sorvetes", label: "Sorvetes", emoji: "🍦" },
  { key: "caseira", label: "Comida caseira", emoji: "🥘" },
  { key: "japonesa", label: "Japonesa", emoji: "🍣" },
  { key: "petiscos", label: "Petiscos", emoji: "🍤" },
];