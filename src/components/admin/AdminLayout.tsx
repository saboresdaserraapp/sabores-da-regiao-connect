import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, ROLE_LABEL } from "@/hooks/useAuth";
import { LayoutDashboard, Store, MessageSquare, Flag, Megaphone, Settings2, ShieldCheck, Users, FileClock, LogOut, UtensilsCrossed, Brain, FileText, BarChart3, Lock, Truck, ClipboardCheck, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/admin/estabelecimentos", label: "Estabelecimentos", icon: Store },
  { to: "/admin/aprovacao-estabelecimentos", label: "Aprovação de Estabelecimentos", icon: ClipboardCheck },
  { to: "/admin/inteligencia", label: "Inteligência Comercial", icon: Brain },
  { to: "/admin/relatorios", label: "Relatórios Consultivos", icon: FileText },
  { to: "/admin/benchmark", label: "Benchmark de Mercado", icon: BarChart3 },
  { to: "/admin/avaliacoes", label: "Avaliações", icon: MessageSquare },
  { to: "/admin/denuncias", label: "Denúncias", icon: Flag },
  { to: "/admin/comunicados", label: "Comunicados", icon: Megaphone },
  { to: "/admin/site", label: "Gestão do site", icon: Settings2 },
  { to: "/admin/usuarios", label: "Usuários & papéis", icon: Users, manageOnly: true },
  { to: "/admin/auditoria", label: "Auditoria", icon: FileClock },
  { to: "/admin/politicas-entrega", label: "Políticas de Entrega", icon: Truck },
  { to: "/admin/politica-dados", label: "Política de Dados", icon: Lock },
];

export default function AdminLayout() {
  const { roles, signOut, user, canManage } = useAuth();
  const nav = useNavigate();
  const primaryRole = roles[0];
  const [open, setOpen] = useState(false);

  const items = NAV.filter(n => !n.manageOnly || canManage);
  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {items.map(item => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) =>
          cn("group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")
        }>
          {({ isActive }: any) => (
            <>
              <item.icon className={cn("size-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <Link to="/admin" className="flex items-center gap-2 border-b border-border/70 px-5 py-4 transition-colors hover:bg-muted/40">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-warm shadow-glow">
        <UtensilsCrossed className="size-5 text-primary-foreground" />
      </div>
      <div className="leading-tight">
        <div className="font-display font-bold">Admin</div>
        <div className="text-[11px] text-muted-foreground">Sabores da Região</div>
      </div>
    </Link>
  );

  const footer = (
    <div className="border-t border-border/70 p-3">
      <div className="mb-2 truncate text-xs">
        <div className="truncate font-medium">{user?.email}</div>
        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3 text-primary" />{primaryRole ? ROLE_LABEL[primaryRole] : "Sem papel"}
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={async () => { await signOut(); nav("/admin/login"); }}>
        <LogOut className="mr-2 size-4" /> Sair
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-gradient-cream">
      <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-card/80 backdrop-blur lg:flex lg:flex-col">
        {brand}
        {renderNav()}
        {footer}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border/70 bg-card/80 px-4 py-2 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium">
              <Menu className="size-4" /> Admin
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[88vw] max-w-sm flex-col p-0">
              <SheetHeader><SheetTitle className="sr-only">Menu admin</SheetTitle></SheetHeader>
              {brand}
              {renderNav(() => setOpen(false))}
              {footer}
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-gradient-warm">
              <UtensilsCrossed className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-bold">Admin</span>
          </Link>
        </div>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
