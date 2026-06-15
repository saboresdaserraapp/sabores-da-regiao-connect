import { Link } from "react-router-dom";
import { BarChart3, Eye, MousePointerClick, ShoppingBag, MessageCircle, Star, Settings, Power, Pause, Plus } from "lucide-react";
import { ESTABLISHMENTS } from "@/data/mockData";

const Dashboard = () => {
  const e = ESTABLISHMENTS[0]; // demo: dono da Forno da Vila
  const stats = [
    { label: "Visitas no cardápio", value: "1.284", icon: Eye, color: "text-primary" },
    { label: "Cliques em produtos", value: "612", icon: MousePointerClick, color: "text-accent-foreground" },
    { label: "Adicionados ao carrinho", value: "248", icon: ShoppingBag, color: "text-secondary" },
    { label: "Pedidos via WhatsApp", value: "163", icon: MessageCircle, color: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-gradient-cream pb-20">
      <header className="border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold">Sabores da Região</Link>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">Painel do estabelecimento</span>
        </div>
      </header>

      <div className="container space-y-6 py-8">
        <div className="flex flex-wrap items-center gap-4">
          <img src={e.logo} alt="" className="size-16 rounded-2xl object-cover shadow-card" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold">{e.name}</h1>
            <p className="text-sm text-muted-foreground">{e.categoryLabel} · {e.neighborhood}</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"><Power className="size-4 text-success" /> Aberto</button>
            <button className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"><Pause className="size-4 text-warning" /> Pausar pedidos</button>
            <button className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Settings className="size-4" /> Editar perfil</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl bg-card p-4 shadow-card">
              <s.icon className={`size-5 ${s.color}`} />
              <div className="mt-3 font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Produtos mais adicionados</h2>
              <BarChart3 className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {e.products.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <img src={p.image} alt="" className="size-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-warm" style={{ width: `${100 - i * 15}%` }} />
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{120 - i * 18}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-xl font-semibold">Horários com mais movimento</h2>
            <div className="flex items-end gap-1.5">
              {[20, 30, 25, 40, 55, 70, 90, 100, 85, 60, 45, 30].map((h, i) => (
                <div key={i} className="flex-1">
                  <div className="rounded-t-md bg-gradient-warm" style={{ height: `${h}px` }} />
                  <div className="mt-1 text-center text-[10px] text-muted-foreground">{18 + i}h</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Avaliações recentes</h2>
              <Star className="size-5 text-accent" />
            </div>
            <div className="space-y-3">
              {e.reviews.map(r => (
                <div key={r.id} className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.author}</span>
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                  </div>
                  <p className="text-xs text-foreground/80">{r.text}</p>
                  {!r.reply && <button className="mt-2 text-xs font-medium text-primary hover:underline">Responder</button>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Cardápio</h2>
              <button className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Plus className="size-3" /> Novo produto</button>
            </div>
            <div className="space-y-2">
              {e.products.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-2">
                  <div className="flex items-center gap-2">
                    <img src={p.image} alt="" className="size-10 rounded-lg object-cover" />
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">R$ {p.price.toFixed(2)}</div>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-primary hover:underline">Editar</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
