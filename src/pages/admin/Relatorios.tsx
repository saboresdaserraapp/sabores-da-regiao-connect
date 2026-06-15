import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileDown, Share2, Info, FileText, TrendingUp, AlertTriangle, Target, CheckCircle2 } from "lucide-react";
import { useEstablishmentAnalytics, generateInsights, weekdayLabel } from "@/hooks/useInsights";
import { toast } from "sonner";

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pct(v: number) { return (v * 100).toFixed(1) + "%"; }

function ListReports() {
  const { data: ests } = useQuery({
    queryKey: ["rel-ests"],
    queryFn: async () => (await supabase.from("establishments").select("id,name,category_label,neighborhood,rating").order("name")).data || [],
  });
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><FileText className="size-6 text-primary" /> Relatórios Consultivos</h1>
        <p className="text-sm text-muted-foreground">Selecione um estabelecimento para gerar o relatório do período.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(ests || []).map(e => (
          <Card key={e.id} className="hover:shadow-md transition">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{e.name}</CardTitle>
              <CardDescription className="text-xs">{e.category_label} · {e.neighborhood}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="w-full"><Link to={`/admin/relatorios/${e.id}`}>Gerar relatório</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportDetail({ id }: { id: string }) {
  const { data: est } = useQuery({
    queryKey: ["rel-est", id],
    queryFn: async () => (await supabase.from("establishments").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: products } = useQuery({
    queryKey: ["rel-prod", id],
    queryFn: async () => (await supabase.from("products").select("id,name,image,description").eq("establishment_id", id)).data || [],
  });
  const { data: categoryAvg } = useQuery({
    queryKey: ["rel-catavg", est?.category],
    enabled: !!est?.category,
    queryFn: async () => {
      const { data } = await supabase.from("establishments").select("rating").eq("category", est!.category);
      const arr = (data || []).map(d => Number(d.rating)).filter(n => n > 0);
      return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    },
  });
  const { data: a } = useEstablishmentAnalytics(id, 30);
  const { data: prevA } = useEstablishmentAnalytics(id, 60);

  if (!est || !a) return <div className="p-6 text-sm text-muted-foreground">Carregando relatório…</div>;

  const lastUpdate = est.last_menu_update_at ? Math.floor((Date.now() - new Date(est.last_menu_update_at).getTime()) / 86400000) : null;
  const insights = generateInsights(a, { lastMenuUpdateDays: lastUpdate, rating: Number(est.rating), categoryAvgRating: categoryAvg ?? undefined, products });

  // Trend: compare last 30 days with previous 30
  const prevVisits = (prevA?.visits || 0) - a.visits;
  const trend = prevVisits > 0 ? (a.visits - prevVisits) / prevVisits : 0;
  const trendLabel = trend > 0.1 ? "cresceu" : trend < -0.1 ? "caiu" : "ficou estável";
  const trendIcon = trend > 0.1 ? "📈" : trend < -0.1 ? "📉" : "→";

  const topProduct = a.topProductId ? products?.find(p => p.id === a.topProductId) : null;
  const topWaProduct = a.topWaProductId ? products?.find(p => p.id === a.topWaProductId) : null;

  const handleExport = () => window.print();
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link do relatório copiado");
    } catch { toast.error("Não foi possível copiar"); }
  };

  return (
    <div className="p-6 space-y-6 print:p-0">
      <header className="flex items-start justify-between gap-3 flex-wrap print:hidden">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/admin/relatorios"><ArrowLeft className="size-4 mr-1" /> Voltar</Link></Button>
          <h1 className="text-2xl font-display font-bold">Relatório Consultivo</h1>
          <p className="text-sm text-muted-foreground">{est.name} · últimos 30 dias</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleShare} variant="outline" size="sm"><Share2 className="size-4 mr-1" /> Compartilhar</Button>
          <Button onClick={handleExport} size="sm"><FileDown className="size-4 mr-1" /> Exportar PDF</Button>
        </div>
      </header>

      <Alert>
        <Info className="size-4" />
        <AlertDescription className="text-xs">
          Os pedidos enviados ao WhatsApp são estimativas baseadas em cliques. Os valores precisam ser confirmados pelo estabelecimento.
          Comparativos com outras lojas usam médias anônimas por categoria.
        </AlertDescription>
      </Alert>

      {/* 1. Resumo executivo */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Resumo Executivo</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Nos últimos 30 dias, <strong>{est.name}</strong> {trendLabel} {trendIcon} em relação ao período anterior.
            Foram <strong>{a.visits}</strong> visitas ao perfil, gerando <strong>{a.whatsappClicks}</strong> pedidos estimados via WhatsApp,
            com valor estimado total de <strong>{fmtBRL(a.estimatedValue)}</strong>.
          </p>
          <p className="text-muted-foreground">
            A taxa de conversão de visita para pedido é de <strong>{pct(a.conversionRate)}</strong>.
          </p>
        </CardContent>
      </Card>

      {/* 2. Indicadores */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Indicadores Principais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Metric label="Visitas" value={a.visits} />
            <Metric label="Cliques WhatsApp" value={a.whatsappClicks} />
            <Metric label="Pedidos estimados" value={a.whatsappClicks} />
            <Metric label="Valor estimado" value={fmtBRL(a.estimatedValue)} />
            <Metric label="Ticket médio" value={fmtBRL(a.avgTicket)} />
            <Metric label="Conversão" value={pct(a.conversionRate)} />
            <Metric label="Carrinho → WhatsApp" value={pct(a.cartToWaRate)} />
            <Metric label="Adicionados ao carrinho" value={a.cartAdds} />
          </div>
          <Separator className="my-4" />
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Produto mais visto</div>
              <div className="font-medium">{topProduct?.name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Produto mais enviado</div>
              <div className="font-medium">{topWaProduct?.name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Horário de pico</div>
              <div className="font-medium">{a.peakHour != null ? `${a.peakHour}h` : "—"} · {weekdayLabel(a.peakWeekday)}</div>
            </div>
          </div>
          {a.byNeighborhood.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="text-sm">
                <div className="text-xs text-muted-foreground mb-2">Regiões com maior interesse</div>
                <div className="flex flex-wrap gap-2">
                  {a.byNeighborhood.slice(0, 5).map(n => (
                    <Badge key={n.neighborhood} variant="secondary">{n.neighborhood} · {n.count}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 3. Diagnóstico */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4" /> 3. Diagnóstico</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Section title="✓ O que está funcionando">
            {a.conversionRate > 0.1 && <li>Taxa de conversão saudável ({pct(a.conversionRate)}).</li>}
            {Number(est.rating) >= 4.5 && <li>Avaliação acima da média ({Number(est.rating).toFixed(1)} ★).</li>}
            {a.peakHour != null && <li>Horário de pico bem definido às {a.peakHour}h — público fiel.</li>}
            {a.visits === 0 && <li className="text-muted-foreground">Sem dados suficientes ainda.</li>}
          </Section>
          <Section title="⚠ O que pode estar atrapalhando">
            {insights.filter(i => i.severity === "critical" || i.severity === "warning").map((i, k) => (
              <li key={k}><strong>{i.title}:</strong> {i.description}</li>
            ))}
            {insights.filter(i => i.severity === "critical" || i.severity === "warning").length === 0 && (
              <li className="text-muted-foreground">Nenhum problema crítico detectado.</li>
            )}
          </Section>
          <Section title="💡 Oportunidades">
            {insights.filter(i => i.severity === "opportunity").map((i, k) => (
              <li key={k}>{i.description}</li>
            ))}
          </Section>
        </CardContent>
      </Card>

      {/* 4. Recomendações */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4" /> 4. Recomendações</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {insights.map((i, k) => (
              <li key={k} className="flex gap-2"><CheckCircle2 className="size-4 mt-0.5 shrink-0 text-primary" /><span>{i.recommendation}</span></li>
            ))}
            {insights.length === 0 && <li className="text-muted-foreground">Mantenha o ritmo atual e continue atualizando o cardápio.</li>}
          </ul>
        </CardContent>
      </Card>

      {/* 5. Comparativo anônimo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Comparativo Anônimo</CardTitle>
          <CardDescription className="text-xs">Médias da categoria — nenhum concorrente é identificado.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {categoryAvg != null ? (
            <p>
              Sua avaliação está em <strong>{Number(est.rating).toFixed(1)} ★</strong>.
              A média da categoria <strong>{est.category_label}</strong> é de <strong>{categoryAvg.toFixed(1)} ★</strong>.
              {Number(est.rating) >= categoryAvg ? " Você está no nível ou acima da média." : " Há espaço para subir até a média da categoria."}
            </p>
          ) : <p className="text-muted-foreground">Dados insuficientes para comparativo.</p>}
        </CardContent>
      </Card>

      {/* 6. Plano de ação */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="size-4" /> 6. Plano de Ação</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2">Esta semana</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Adicionar fotos aos 3 produtos mais vistos.</li>
              <li>Responder avaliações pendentes.</li>
              <li>Atualizar horário de funcionamento.</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Próximo mês</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Criar combos com o produto mais buscado.</li>
              <li>Revisar descrições de todo o cardápio.</li>
              <li>Avaliar taxa de entrega por bairro.</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Campanha sugerida</div>
            <p>{a.peakHour != null
              ? `"Hora feliz" entre ${a.peakHour}h e ${a.peakHour + 2}h com 10% de desconto no produto mais procurado.`
              : `Campanha de retomada destacando o cardápio em redes sociais por 7 dias.`}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <ul className="space-y-1 list-disc list-inside text-muted-foreground">{children}</ul>
    </div>
  );
}

export default function Relatorios() {
  const { id } = useParams();
  return id ? <ReportDetail id={id} /> : <ListReports />;
}
