import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { PeriodFilter, type Period } from "@/components/admin/PeriodFilter";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import {
  Store, MessageCircle, Eye, ShoppingBag, Star, TrendingUp, Wallet, Receipt, AlertTriangle, Loader2,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis, Legend,
} from "recharts";
import { brl } from "@/lib/format";

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const { data, isLoading } = useDashboardKpis(period);

  return (
    <>
      <AdminHeader
        title="Visão geral"
        subtitle="Indicadores da plataforma — atualizado em tempo real."
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      />
      <div className="space-y-6 p-6">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Estabelecimentos ativos" value={data.estabAtivos} hint={`${data.estabTotal} cadastrados`} icon={Store} />
              <KpiCard label="Pendentes" value={data.estabPendentes} hint="aguardando aprovação" icon={AlertTriangle} />
              <KpiCard label="Produtos no catálogo" value={data.productCount} icon={ShoppingBag} />
              <KpiCard label="Avaliação média" value={data.avgRating} hint={`${data.reviewsCount} avaliações`} icon={Star} />
              <KpiCard label="Visitas (pageviews)" value={data.pageviews.toLocaleString("pt-BR")} icon={Eye}
                tooltip="Carregamentos de páginas do app por visitantes únicos da sessão." />
              <KpiCard label="Pedidos enviados ao WhatsApp" value={data.whatsappSends.toLocaleString("pt-BR")} icon={MessageCircle}
                tooltip="Cliques no botão de envio do pedido pelo WhatsApp. Não significa venda confirmada — a conversão final acontece no WhatsApp do estabelecimento." />
              <KpiCard label="Valor estimado dos pedidos" value={brl(data.valueCents / 100)} icon={Wallet}
                tooltip="Soma do valor dos carrinhos enviados ao WhatsApp. Valor não confirmado." />
              <KpiCard label="Ticket médio estimado" value={brl(data.ticketCents / 100)} icon={Receipt}
                tooltip="Valor estimado dividido pela quantidade de pedidos enviados." />
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">Visitas vs Pedidos no WhatsApp</h2>
              <p className="text-xs text-muted-foreground">Comparação diária no período selecionado.</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer>
                  <LineChart data={data.series}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <RTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="visitas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="whatsapp" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-base font-semibold">Pedidos por hora do dia</h2>
                <div className="mt-3 h-56">
                  <ResponsiveContainer>
                    <BarChart data={data.byHour}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="hour" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RTooltip />
                      <Bar dataKey="cliques" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-base font-semibold">Pedidos por dia da semana</h2>
                <div className="mt-3 h-56">
                  <ResponsiveContainer>
                    <BarChart data={data.byWeekday}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RTooltip />
                      <Bar dataKey="cliques" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-base font-semibold">Top categorias</h2>
                <ul className="mt-3 space-y-2">
                  {data.topCategories.length === 0 && <li className="text-sm text-muted-foreground">Sem dados no período.</li>}
                  {data.topCategories.map((c) => (
                    <li key={c.category} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-sm font-medium capitalize">{c.category}</span>
                      <span className="text-sm">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-base font-semibold inline-flex items-center gap-2"><TrendingUp className="size-4" /> Top estabelecimentos</h2>
                <ul className="mt-3 space-y-2">
                  {data.topEstabs.length === 0 && <li className="text-sm text-muted-foreground">Sem dados no período.</li>}
                  {data.topEstabs.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-sm">{c.value} pedidos</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
