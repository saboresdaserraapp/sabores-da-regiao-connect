import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, ROLE_LABEL } from "@/hooks/useAuth";
import {
  LayoutDashboard, Store, MessageSquare, Flag, Megaphone, Settings2, ShieldCheck,
  Users, FileClock, LogOut, Brain, FileText, BarChart3, Lock, Truck, ClipboardCheck,
  LifeBuoy, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, SidebarInset, useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { to: string; label: string; icon: any; end?: boolean; manageOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { to: "/admin", label: "Visão geral", icon: LayoutDashboard, end: true },
      { to: "/admin/estabelecimentos", label: "Estabelecimentos", icon: Store },
      { to: "/admin/aprovacao-estabelecimentos", label: "Aprovações", icon: ClipboardCheck },
    ],
  },
  {
    label: "Moderação",
    items: [
      { to: "/admin/avaliacoes", label: "Avaliações", icon: MessageSquare },
      { to: "/admin/denuncias", label: "Denúncias", icon: Flag },
    ],
  },
  {
    label: "Suporte",
    items: [
      { to: "/admin/suporte/tickets", label: "Tickets", icon: LifeBuoy },
      { to: "/admin/suporte/chats", label: "Chat ao vivo", icon: MessageSquare },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/admin/inteligencia", label: "Inteligência comercial", icon: Brain },
      { to: "/admin/relatorios", label: "Relatórios", icon: FileText },
      { to: "/admin/benchmark", label: "Benchmark", icon: BarChart3 },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { to: "/admin/comunicados", label: "Comunicados", icon: Megaphone },
      { to: "/admin/site", label: "Gestão do site", icon: Settings2 },
    ],
  },
  {
    label: "Configuração",
    items: [
      { to: "/admin/usuarios", label: "Usuários & papéis", icon: Users, manageOnly: true },
      { to: "/admin/auditoria", label: "Auditoria", icon: FileClock },
      { to: "/admin/politicas-entrega", label: "Políticas de entrega", icon: Truck },
      { to: "/admin/politica-dados", label: "Política de dados", icon: Lock },
    ],
  },
];

function AdminSidebar() {
  const { canManage } = useAuth();
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const groups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(n => !n.manageOnly || canManage) }))
    .filter(g => g.items.length > 0);

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
            <ShieldAlert className="size-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Console Admin</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sabores da Região</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => {
                  const active = isActive(item.to, item.end);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <NavLink to={item.to} end={item.end}>
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <AdminSidebarFooter />
    </Sidebar>
  );
}

function AdminSidebarFooter() {
  const { roles, signOut, user } = useAuth();
  const nav = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const primaryRole = roles[0];

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      {!collapsed && (
        <div className="px-2 pb-2 text-xs">
          <div className="truncate font-medium">{user?.email}</div>
          <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3" />{primaryRole ? ROLE_LABEL[primaryRole] : "Sem papel"}
          </div>
        </div>
      )}
      <Button
        variant="outline"
        size={collapsed ? "icon" : "sm"}
        className={collapsed ? "mx-auto size-8" : "w-full"}
        onClick={async () => { await signOut(); nav("/admin/login"); }}
      >
        <LogOut className={collapsed ? "size-4" : "mr-2 size-4"} />
        {!collapsed && "Sair"}
      </Button>
    </SidebarFooter>
  );
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const groups = NAV_GROUPS.flatMap(g => g.items);
  const current = groups.find(i => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(i.to + "/")));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AdminSidebar />
        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <div className="text-sm font-medium text-muted-foreground">
              <span className="text-foreground">Admin</span>
              {current && <><span className="mx-1.5 text-muted-foreground/50">/</span>{current.label}</>}
            </div>
          </header>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
