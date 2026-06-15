import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Brain, Lightbulb, AlertTriangle, TrendingUp, Search, ArrowRight, Info } from "lucide-react";
import { useEstablishmentAnalytics, generateInsights, type Insight } from "@/hooks/useInsights";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SEVERITY: Record<Insight["severity"], { color: string; icon: any }> = {
  info: { color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Info },
  opportunity: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: TrendingUp },
  warning: { color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: AlertTriangle },
  critical: { color: "bg-red-500/10 text-red-700 border-red-200", icon: AlertTriangle },
};

function EstablishmentCard({ est }: { est: any }) {
  const { data: a } = useEstablishmentAnalytics(est.id, 30);
  const { data: products } = useQuery({
    queryKey: ["est-products-min", est.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,image,description").eq("establishment_id", est.id);
      return data || [];
    },
  });

  const lastUpdate = est.last_menu_update_at ? Math.floor((Date.now() - new Date(est.last_menu_update_at).getTime()) / 86400000) : null;
  const insights = a ? generateInsights(a, { lastMenuUpdateDays: lastUpdate, rating: Number(est.rating), products: products || [] }) : [];
  const critical = insights.filter(i => i.severity === "critical" || i.severity === "warning").length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{est.name}</CardTitle>
            <CardDescription className="text-xs">{est.category_label} · {est.neighborhood}</CardDescription>
          </div>
          <Badge variant={critical > 0 ? "destructive" : "secondary"}>{insights.length} insights</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!a ? <div className="text-xs text-muted-foreground">Calculando…</div> :
          insights.slice(0, 3).map((i, idx) => {
            const S = SEVERITY[i.severity];
            return (
              <div key={idx} className={`rounded-lg border px-3 py-2 ${S.color}`}>
                <div className="flex items-start gap-2">
                  <S.icon className="size-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{i.title}</div>
                    <div className="text-xs opacity-80 line-clamp-2">{i.recommendation}</div>
                  </div>
                </div>
              </div>
            );
          })}
        {a && insights.length === 0 && <div className="text-xs text-muted-foreground">Nenhum insight relevante no período.</div>}
        <Button asChild variant="ghost" size="sm" className="w-full justify-between mt-2">
          <Link to={`/admin/relatorios/${est.id}`}>Ver relatório consultivo <ArrowRight className="size-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Inteligencia() {
  const [search, setSearch] = useState("");
  const { data: ests, isLoading } = useQuery({
    queryKey: ["all-ests-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("establishments")
        .select("id,name,category,category_label,neighborhood,rating,last_menu_update_at,status")
        .eq("status", "ativo")
        .order("name");
      return data || [];
    },
  });

  const filtered = (ests || []).filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.neighborhood?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Brain className="size-6 text-primary" /> Inteligência Comercial
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Insights automáticos para orientar os estabelecimentos sobre oportunidades de melhoria.
            Dados agregados, anônimos e baseados apenas em comportamento dentro da plataforma.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin/benchmark">Benchmark de mercado</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/admin/politica-dados">Política de dados</Link></Button>
        </div>
      </header>

      <Alert>
        <Lightbulb className="size-4" />
        <AlertDescription className="text-sm">
          Métricas de "pedidos enviados ao WhatsApp" são <strong>estimativas</strong> baseadas em cliques.
          O pedido real precisa ser confirmado pelo estabelecimento.
        </AlertDescription>
      </Alert>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar estabelecimento ou bairro…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(e => <EstablishmentCard key={e.id} est={e} />)}
        </div>
      )}
    </div>
  );
}
