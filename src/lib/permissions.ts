// Catálogo de features e regras centralizadas de permissão por loja
export type PlanSlug = "presenca" | "essencial" | "profissional" | "gestao_premium";

export const PLAN_LABEL: Record<PlanSlug, string> = {
  presenca: "Presença",
  essencial: "Essencial",
  profissional: "Profissional",
  gestao_premium: "Gestão Premium",
};

export const PLAN_ORDER: PlanSlug[] = ["presenca", "essencial", "profissional", "gestao_premium"];

// Todas as features citadas no briefing
export type FeatureKey =
  | "basic_info" | "opening_hours" | "social_links"
  | "basic_menu" | "product_management_basic"
  | "delivery_to_confirm" | "pickup_enabled" | "dine_in_enabled"
  | "receive_whatsapp_orders" | "basic_orders_panel" | "basic_reviews"
  | "product_photos" | "simple_addons" | "simple_promotions"
  | "delivery_fixed_fee" | "delivery_regions"
  | "basic_metrics" | "whatsapp_clicks" | "product_views"
  | "advanced_addons" | "product_variations" | "combos"
  | "advanced_promotions" | "category_ordering" | "product_ordering"
  | "featured_products" | "photo_reviews" | "review_replies"
  | "intermediate_metrics" | "cart_abandonment" | "peak_hours"
  | "delivery_region_rules" | "visual_reference_on_order" | "gallery"
  | "visual_customization" | "custom_colors" | "custom_fonts"
  | "custom_background" | "custom_cover" | "custom_logo" | "custom_layout"
  | "premium_gallery" | "video_section" | "theme_preview" | "publish_theme" | "restore_theme"
  | "advanced_metrics" | "commercial_insights" | "benchmark" | "pdf_reports"
  | "delivery_reports" | "market_trends" | "consultive_reports" | "action_plan"
  // Novos módulos do painel da loja
  | "financial_basic" | "financial_advanced"
  | "stock_basic" | "stock_advanced"
  | "media_gallery" | "media_video"
  | "team_basic" | "team_permissions"
  | "delivery_drivers" | "send_order_references";

export const FEATURE_MIN_PLAN: Partial<Record<FeatureKey, PlanSlug>> = {
  basic_info: "presenca", opening_hours: "presenca", social_links: "presenca",
  basic_menu: "presenca", product_management_basic: "presenca",
  delivery_to_confirm: "presenca", pickup_enabled: "presenca", dine_in_enabled: "presenca",
  receive_whatsapp_orders: "presenca", basic_orders_panel: "presenca", basic_reviews: "presenca",
  product_photos: "essencial", simple_addons: "essencial", simple_promotions: "essencial",
  delivery_fixed_fee: "essencial", delivery_regions: "essencial",
  basic_metrics: "essencial", whatsapp_clicks: "essencial", product_views: "essencial",
  advanced_addons: "profissional", product_variations: "profissional", combos: "profissional",
  advanced_promotions: "profissional", category_ordering: "profissional", product_ordering: "profissional",
  featured_products: "profissional", photo_reviews: "profissional", review_replies: "profissional",
  intermediate_metrics: "profissional", cart_abandonment: "profissional", peak_hours: "profissional",
  delivery_region_rules: "profissional", visual_reference_on_order: "profissional",
  gallery: "profissional",
  visual_customization: "gestao_premium", custom_colors: "gestao_premium", custom_fonts: "gestao_premium",
  custom_background: "gestao_premium", custom_cover: "gestao_premium", custom_logo: "gestao_premium",
  custom_layout: "gestao_premium", premium_gallery: "gestao_premium", video_section: "gestao_premium",
  theme_preview: "gestao_premium", publish_theme: "gestao_premium", restore_theme: "gestao_premium",
  advanced_metrics: "gestao_premium", commercial_insights: "gestao_premium", benchmark: "gestao_premium",
  pdf_reports: "gestao_premium", delivery_reports: "gestao_premium", market_trends: "gestao_premium",
  consultive_reports: "gestao_premium", action_plan: "gestao_premium",
  // Novos módulos
  financial_basic: "essencial", financial_advanced: "gestao_premium",
  stock_basic: "essencial", stock_advanced: "profissional",
  media_gallery: "profissional", media_video: "gestao_premium",
  team_basic: "profissional", team_permissions: "gestao_premium",
  delivery_drivers: "essencial", send_order_references: "profissional",
};

export type EstablishmentRole = "admin" | "owner" | "manager" | "attendant" | "menu_editor" | "finance";

export const ROLE_LABEL: Record<EstablishmentRole, string> = {
  admin: "Admin geral", owner: "Dono", manager: "Gerente",
  attendant: "Atendente", menu_editor: "Editor de cardápio", finance: "Financeiro",
};

// "*" = qualquer feature
const ROLE_FEATURES: Record<EstablishmentRole, Set<FeatureKey | "*">> = {
  admin: new Set(["*"]),
  owner: new Set(["*"]),
  manager: new Set<FeatureKey>([
    "basic_info","opening_hours","social_links","basic_menu","product_management_basic",
    "product_photos","simple_addons","advanced_addons","product_variations","combos",
    "simple_promotions","advanced_promotions","category_ordering","product_ordering",
    "featured_products",
    "delivery_to_confirm","delivery_fixed_fee","delivery_regions","delivery_region_rules",
    "pickup_enabled","dine_in_enabled","visual_reference_on_order",
    "receive_whatsapp_orders","basic_orders_panel",
    "basic_reviews","photo_reviews","review_replies",
    "stock_basic","stock_advanced","media_gallery","media_video",
    "financial_basic",
    "delivery_drivers", "send_order_references",
  ]),
  attendant: new Set<FeatureKey>([
    "receive_whatsapp_orders","basic_orders_panel",
    "send_order_references",
  ]),
  menu_editor: new Set<FeatureKey>([
    "basic_menu","product_management_basic","product_photos",
    "simple_addons","advanced_addons","product_variations","combos",
    "simple_promotions","advanced_promotions",
    "category_ordering","product_ordering","featured_products",
    "stock_basic","stock_advanced",
  ]),
  finance: new Set<FeatureKey>([
    "basic_metrics","intermediate_metrics","advanced_metrics","pdf_reports","delivery_reports",
    "financial_basic","financial_advanced",
  ]),
};

export type ActiveEstablishment = {
  establishmentId: string;
  establishmentName: string;
  establishmentSlug: string;
  establishmentStatus: string;             // ativo | pendente | suspenso | inativo
  approvalStatus: string | null;           // pending_approval | correction_requested | approved | rejected
  userRoleInEstablishment: EstablishmentRole | null;
  isPlatformAdmin: boolean;
  activePlan: { id: string | null; name: string | null; slug: PlanSlug | null };
  activeFeatures: Record<string, boolean | number | null>;
  subscriptionStatus: string | null;       // active | trial | expired | canceled | null
};

export function canUseFeature(ctx: ActiveEstablishment | null | undefined, feature: FeatureKey): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformAdmin) return true;
  // role precisa permitir
  const role = ctx.userRoleInEstablishment;
  if (!role) return false;
  const allowed = ROLE_FEATURES[role];
  if (!allowed.has("*") && !allowed.has(feature)) return false;
  // status da loja precisa ser ativo (ou loja em análise para features básicas)
  if (ctx.establishmentStatus !== "ativo" && !["basic_info","opening_hours","social_links"].includes(feature)) {
    return false;
  }
  // assinatura ativa
  if (ctx.subscriptionStatus && !["active","trial"].includes(ctx.subscriptionStatus)) return false;
  // plano libera feature
  const v = ctx.activeFeatures?.[feature];
  return v === true || (typeof v === "number" && v > 0);
}

export function planLabelForFeature(feature: FeatureKey): string {
  const slug = FEATURE_MIN_PLAN[feature];
  return slug ? PLAN_LABEL[slug] : "Exclusivo";
}
