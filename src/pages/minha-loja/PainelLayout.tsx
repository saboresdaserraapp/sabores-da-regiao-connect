import { NavLink, Navigate, Outlet, useParams, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { ActiveEstablishmentProvider, useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, FEATURE_MIN_PLAN, PLAN_LABEL, type FeatureKey } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Brain, Calendar, ChefHat, Crown, DollarSign, Image as ImageIcon, LayoutDashboard,
  MessageSquare, Package, Palette, Receipt, Settings, Store, Tag, Truck, Users, Warehouse, Loader2,
  Smartphone, Menu, LifeBuoy
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";


type Item = { to: string; label: string; icon: any; feature?: FeatureKey };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "Operação",
    items: [
      { to: "",          label: "Visão geral",           icon: LayoutDashboard },
      { to: "pedidos",   label: "Pedidos",               icon: Receipt,    feature: "basic_orders_panel" },
      { to: "estoque",   label: "Estoque",               icon: Warehouse,  feature: "stock_basic" },
      { to: "motoboys",  label: "Motoboys",              icon: Smartphone, feature: "delivery_drivers" },
    ],
  },
  {
    label: "Cardápio",
    items: [
      { to: "cardapio",   label: "Cardápio",             icon: ChefHat,  feature: "basic_menu" },
      { to: "produtos",   label: "Produtos",             icon: Package,  feature: "product_management_basic" },
      { to: "adicionais", label: "Adicionais",           icon: Package,  feature: "simple_addons" },
      { to: "promocoes",  label: "Promoções",            icon: Tag,      feature: "simple_promotions" },
    ],
  },
  {
    label: "Loja",
    items: [
      { to: "dados",          label: "Dados da loja",     icon: Store,     feature: "basic_info" },
      { to: "horarios",       label: "Horários",          icon: Calendar,  feature: "opening_hours" },
      { to: "entrega",        label: "Entrega e frete",   icon: Truck,     feature: "delivery_to_confirm" },
      { to: "midia",          label: "Mídia",             icon: ImageIcon },
      { to: "personalizacao", label: "Personalização",    icon: Palette,   feature: "visual_customization" },
    ],
  },
  {
    label: "Análise",
    items: [
      { to: "metricas",     label: "Métricas",             icon: BarChart3,    feature: "basic_metrics" },
      { to: "inteligencia", label: "Inteligência",         icon: Brain,        feature: "commercial_insights" },
      { to: "avaliacoes",   label: "Avaliações",           icon: MessageSquare,feature: "basic_reviews" },
      { to: "financeiro",   label: "Vendas e financeiro",  icon: DollarSign,   feature: "financial_basic" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "equipe",  label: "Equipe e permissões", icon: Users,   feature: "team_basic" },
      { to: "suporte", label: "Suporte",             icon: LifeBuoy },
      { to: "plano",   label: "Plano e assinatura",  icon: Crown },
    ],
  },
];

function STATUS_LABEL(s: string) {
  return ({ ativo: "Ativa", pendente: "Em análise", suspenso: "Suspensa", inativo: "Inativa" } as any)[s] ?? s;
}

function Inner() {
  const { ctx, loading } = useActiveEstablishment();
  const { establishmentId } = useParams();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

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

  const renderNav = (onNavigate?: () => void) => (
    <nav className="grid gap-4">
      {GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </div>
          <div className="grid gap-0.5">
            {group.items.map((item) => {
              const allowed = !item.feature || canUseFeature(ctx, item.feature);
              const minPlan = item.feature ? FEATURE_MIN_PLAN[item.feature] : undefined;
              const to = item.to ? `/minha-loja/${establishmentId}/${item.to}` : `/minha-loja/${establishmentId}`;
              const isActive = location.pathname === to || (item.to === "" && location.pathname === `/minha-loja/${establishmentId}`);
              return (
                <NavLink
                  key={item.to}
                  to={to}
                  end={item.to === ""}
                  onClick={onNavigate}
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
          </div>
        </div>
      ))}
    </nav>
  );

  const storeHeader = (
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
  );

  return (
    <div className="min-h-screen bg-gradient-cream">
      <Header />
      <div className="container py-4 sm:py-6 grid gap-4 sm:gap-6 lg:grid-cols-[260px_1fr]">
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium">
              <Menu className="size-4" /> Menu da loja
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-4">
              <SheetHeader><SheetTitle className="sr-only">Menu da loja</SheetTitle></SheetHeader>
              {storeHeader}
              <div className="mt-3">{renderNav(() => setNavOpen(false))}</div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 truncate text-right text-sm font-medium">{ctx.establishmentName}</div>
        </div>
        <aside className="hidden lg:block rounded-2xl border border-border/70 bg-card/80 backdrop-blur p-3 h-fit lg:sticky lg:top-20 shadow-sm">
          {storeHeader}
          <div className="mt-2">{renderNav()}</div>
        </aside>

        <main className="min-w-0 space-y-6">
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
