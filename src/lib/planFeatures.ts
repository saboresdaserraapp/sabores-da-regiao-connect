// Catálogo central de feature flags por plano
export type FeatureKey =
  | "edit_basic_info" | "edit_opening_hours" | "manage_menu" | "menu_limit"
  | "menu_categories" | "product_photos" | "product_addons" | "advanced_addons"
  | "promotions" | "coupons" | "custom_branding" | "gallery" | "videos"
  | "featured_products" | "premium_layout" | "review_replies" | "basic_reviews"
  | "basic_metrics" | "advanced_metrics" | "commercial_insights" | "benchmark"
  | "pdf_reports" | "receive_whatsapp_orders";

export type PlanSlug = "presenca" | "essencial" | "exclusivo" | "gestao";
export const PLAN_LABEL: Record<PlanSlug, string> = {
  presenca: "Presença", essencial: "Essencial", exclusivo: "Exclusivo", gestao: "Gestão",
};

// Plano mínimo que libera cada feature (para mostrar "Disponível no plano X")
export const FEATURE_MIN_PLAN: Partial<Record<FeatureKey, PlanSlug>> = {
  edit_basic_info: "presenca",
  edit_opening_hours: "presenca",
  manage_menu: "presenca",
  basic_reviews: "presenca",
  receive_whatsapp_orders: "presenca",
  product_photos: "essencial",
  product_addons: "essencial",
  menu_categories: "essencial",
  promotions: "essencial",
  basic_metrics: "essencial",
  custom_branding: "exclusivo",
  gallery: "exclusivo",
  videos: "exclusivo",
  featured_products: "exclusivo",
  premium_layout: "exclusivo",
  advanced_addons: "exclusivo",
  review_replies: "exclusivo",
  advanced_metrics: "gestao",
  commercial_insights: "gestao",
  benchmark: "gestao",
  pdf_reports: "gestao",
  coupons: "gestao",
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  edit_basic_info: "Editar dados básicos",
  edit_opening_hours: "Editar horários",
  manage_menu: "Gerenciar cardápio",
  menu_limit: "Limite de produtos",
  menu_categories: "Categorias de cardápio",
  product_photos: "Fotos de produtos",
  product_addons: "Adicionais",
  advanced_addons: "Adicionais avançados",
  promotions: "Promoções",
  coupons: "Cupons",
  custom_branding: "Cores personalizadas e slogan",
  gallery: "Galeria de fotos",
  videos: "Vídeos da loja",
  featured_products: "Pratos em destaque",
  premium_layout: "Cardápio premium",
  review_replies: "Resposta a avaliações",
  basic_reviews: "Avaliações simples",
  basic_metrics: "Métricas básicas",
  advanced_metrics: "Métricas avançadas",
  commercial_insights: "Inteligência comercial",
  benchmark: "Benchmark de mercado",
  pdf_reports: "Relatórios em PDF",
  receive_whatsapp_orders: "Receber pedidos pelo WhatsApp",
};
