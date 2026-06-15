import { NavLink, Navigate, Outlet, useParams, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { ActiveEstablishmentProvider, useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, FEATURE_MIN_PLAN, PLAN_LABEL, type FeatureKey } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Brain, Calendar, ChefHat, Crown, DollarSign, Image as ImageIcon, LayoutDashboard,
  MessageSquare, Package, Palette, Receipt, Settings, Store, Tag, Truck, Users, Warehouse, Loader2,
  Smartphone
} from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";


type Item = { to: string; label: string; icon: any; feature?: FeatureKey };

const ITEMS: Item[] = [
  { to: "",                  label: "Visão geral",            icon: LayoutDashboard },
  { to: "dados",             label: "Dados da loja",          icon: Store,        feature: "basic_info" },
  { to: "horarios",          label: "Horários e atendimento", icon: Calendar,     feature: "opening_hours" },
  { to: "cardapio",          label: "Cardápio",               icon: ChefHat,      feature: "basic_menu" },
  { to: "produtos",          label: "Produtos",               icon: Package,      feature: "product_management_basic" },
  { to: "adicionais",        label: "Adicionais e variações", icon: Package,      feature: "simple_addons" },
  { to: "promocoes",         label: "Promoções",              icon: Tag,          feature: "simple_promotions" },
  { to: "estoque",           label: "Estoque",                icon: Warehouse,    feature: "stock_basic" },
  { to: "entrega",           label: "Entrega e frete",        icon: Truck,        feature: "delivery_to_confirm" },
  { to: "pedidos",           label: "Pedidos pelo WhatsApp",  icon: Receipt,      feature: "basic_orders_panel" },
  { to: "financeiro",        label: "Vendas e financeiro",    icon: DollarSign,   feature: "financial_basic" },
  { to: "midia",             label: "Mídia da loja",          icon: ImageIcon },
  { to: "avaliacoes",        label: "Avaliações",             icon: MessageSquare,feature: "basic_reviews" },
  { to: "metricas",          label: "Métricas",               icon: BarChart3,    feature: "basic_metrics" },
  { to: "inteligencia",      label: "Inteligência comercial", icon: Brain,        feature: "commercial_insights" },
  { to: "personalizacao",    label: "Personalização visual",  icon: Palette,      feature: "visual_customization" },
  { to: "equipe",            label: "Equipe e permissões",    icon: Users,        feature: "team_basic" },
  { to: "motoboys",          label: "Motoboys",               icon: Smartphone,   feature: "delivery_drivers" },
  { to: "plano",             label: "Plano e assinatura",     icon: Crown },
  { to: "configuracoes",     label: "Configurações",          icon: Settings },
];

function STATUS_LABEL(s: string) {
  return ({ ativo: "Ativa", pendente: "Em análise", suspenso: "Suspensa", inativo: "Inativa" } as any)[s] ?? s;
}

function Inner() {
  const { ctx, loading } = useActiveEstablishment();
  const { establishmentId } = useParams();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Abrindo painel…</div>
      </div>
    );
  }
  if (!ctx) return <Navigate to="/minha-loja" replace />;
  if (!ctx.userRoleInEstablishment) return <Navigate to="/minha-loja" replace />;

  const limited = ctx.establishmentStatus !== "ativo";
  const suspended = ctx.establishmentStatus === "suspenso";

  return (
    <div className="min-h-screen bg-gradient-cream">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Header />
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {ctx?.establishmentName?.charAt(0) || "L"}
            </div>
          </div>
        </div>
      </header>
      <div className="container py-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur p-3 h-fit lg:sticky lg:top-20 shadow-sm">
          <div className="px-2 pb-3 border-b border-border/70">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Minha Loja</div>
            <div className="truncate font-display font-semibold">{ctx.establishmentName}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant={ctx.establishmentStatus === "ativo" ? "secondary" : "outline"} className="text-[10px]">
                {STATUS_LABEL(ctx.establishmentStatus)}
              </Badge>
              {ctx.activePlan.name && <Badge variant="outline" className="text-[10px]">{ctx.activePlan.name}</Badge>}
            </div>
          </div>
          <nav className="mt-2 grid gap-0.5">
            {ITEMS.map((item) => {
              const allowed = !item.feature || canUseFeature(ctx, item.feature);
              const minPlan = item.feature ? FEATURE_MIN_PLAN[item.feature] : undefined;
              const to = item.to ? `/minha-loja/${establishmentId}/${item.to}` : `/minha-loja/${establishmentId}`;
              const isActive = location.pathname === to || (item.to === "" && location.pathname === `/minha-loja/${establishmentId}`);
              return (
                <NavLink
                  key={item.to}
                  to={to}
                  end={item.to === ""}
                  className={() =>
                    `group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:bg-muted hover:text-foreground"}`
                  }
                  title={!allowed && minPlan ? `Disponível no plano ${PLAN_LABEL[minPlan]}` : undefined}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} /> {item.label}
                  </span>
                  {!allowed && <span className="text-[10px] text-muted-foreground">🔒</span>}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-6">
          {limited && (
            <div className={`rounded-2xl border p-4 text-sm ${suspended ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}>
              {suspended ? (
                <>
                  <strong>Loja suspensa.</strong> Painel operacional bloqueado. Entre em contato com o suporte.
                </>
              ) : (
                <>Sua loja está em <strong>análise</strong>. Algumas funções ficam disponíveis após aprovação.</>
              )}
            </div>
          )}
          <Outlet context={ctx} />
        </main>
      </div>
      
    </div>
  );
}

export default function MinhaLojaPainelLayout() {
  return (
    <ActiveEstablishmentProvider>
      <Inner />
    </ActiveEstablishmentProvider>
  );
}
