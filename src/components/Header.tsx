import { Link, NavLink, useNavigate } from "react-router-dom";
import { UtensilsCrossed, MapPin, Menu, Store, Flame, Award, Tag, Home, User as UserIcon, LogOut, Heart, Receipt, Building2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/catalogTypes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationCenter } from "./NotificationCenter";

const NAV = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/loja", label: "Loja", icon: Store },
  { to: "/loja?ord=vendidos", label: "Mais vendidos", icon: Flame },
  { to: "/loja?ord=avaliados", label: "Bem avaliados", icon: Award },
  { to: "/loja?ord=promo", label: "Promoções", icon: Tag },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut, isOfficialAdmin } = useAuth();
  const nav = useNavigate();
  const initial = (user?.email || "?").slice(0, 1).toUpperCase();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl transition-shadow duration-200",
        scrolled ? "border-border/60 shadow-sm" : "border-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-warm shadow-glow">
            <UtensilsCrossed className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">Sabores da Região</div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">A gastronomia da sua cidade, num só lugar</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" /> {item.label}
            </NavLink>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Menu className="size-4" /> Categorias
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Categorias</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CATEGORIES.map(c => (
                <DropdownMenuItem key={c.key} asChild>
                  <Link to={`/loja?cat=${c.key}`} className="cursor-pointer">
                    <span className="mr-2">{c.emoji}</span> {c.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationCenter />}
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/minha-loja"><Building2 className="mr-1.5 size-4" /> Minha Loja</Link>
          </Button>
          <button className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:flex">
            <MapPin className="size-3.5 text-primary" /> Centro
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="grid size-9 place-items-center rounded-full bg-gradient-warm font-semibold text-primary-foreground shadow-glow">
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/minha-conta"><UserIcon className="mr-2 size-4" /> Minha conta</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/minha-conta?tab=favoritos"><Heart className="mr-2 size-4" /> Favoritos</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/minha-conta?tab=pedidos"><Receipt className="mr-2 size-4" /> Pedidos</Link></DropdownMenuItem>
                {isOfficialAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck className="mr-2 size-4" /> Painel Admin</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); nav("/"); }}>
                  <LogOut className="mr-2 size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
              <Button asChild size="sm"><Link to="/cadastro">Criar conta</Link></Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground lg:hidden">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <div className="mt-4 flex flex-col gap-1">
                {NAV.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
                    className={({ isActive }) => cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="size-4" /> {item.label}
                  </NavLink>
                ))}
                <NavLink to="/minha-loja" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">
                  <Building2 className="size-4" /> Minha Loja
                </NavLink>
                {user ? (
                  <NavLink to="/minha-conta" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">
                    <UserIcon className="size-4" /> Minha conta
                  </NavLink>
                ) : (
                  <>
                    <NavLink to="/login" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">
                      <UserIcon className="size-4" /> Entrar
                    </NavLink>
                    <NavLink to="/cadastro" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                      Criar conta
                    </NavLink>
                  </>
                )}
              </div>
              <div className="mt-6">
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categorias</div>
                <div className="grid grid-cols-2 gap-1">
                  {CATEGORIES.map(c => (
                    <Link key={c.key} to={`/loja?cat=${c.key}`} onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                      <span>{c.emoji}</span> {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
