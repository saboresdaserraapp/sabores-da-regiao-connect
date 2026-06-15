import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, Info, TrendingUp, TrendingDown, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EventRow = {
  type: string; establishment_id: string | null; hour: number | null; weekday: number | null;
  value_cents: number | null; neighborhood: string | null; created_at: string;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Benchmark() {
  const { data: ests } = useQuery({
    queryKey: ["bench-ests"],
    queryFn: async () => (await supabase.from("establishments").select("id,category,category_label,neighborhood,rating")).data || [],
  });

  const { data: events } = useQuery({
    queryKey: ["bench-events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data } = await supabase.from("events").select("type,establishment_id,hour,weekday,value_cents,neighborhood,created_at").gte("created_at", since);
      return (data as EventRow[]) || [];
    },
  });

  const isLoading = !ests || !events;

  // Aggregate by category
  const byCategory = new Map<string, {
    label: string; ests: Set<string>; visits: number; wa: number;
    valueCents: number; hours: number[]; weekdays: number[]; neighborhoods: Map<string, number>;
    visitsRecent: number; visitsPrev: number;
  }>();

  const HALFWAY = Date.now() - 30 * 86400000;

  for (const e of ests || []) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, {
      label: e.category_label, ests: new Set(), visits: 0, wa: 0, valueCents: 0,
      hours: [], weekdays: [], neighborhoods: new Map(), visitsRecent: 0, visitsPrev: 0,
    });
    byCategory.get(e.category)!.ests.add(e.id);
  }
  const estCat = new Map((ests || []).map(e => [e.id, e.category]));

  for (const ev of events || []) {
    const cat = ev.establishment_id ? estCat.get(ev.establishment_id) : null;
    if (!cat) continue;
    const g = byCategory.get(cat);
    if (!g) continue;
    const isRecent = new Date(ev.created_at).getTime() >= HALFWAY;
    if (ev.type === "pageview" || ev.type === "establishment_view") {
      g.visits++;
      if (isRecent) g.visitsRecent++; else g.visitsPrev++;
    }
    if (ev.type === "whatsapp_send") { g.wa++; if (ev.value_cents) g.valueCents += ev.value_cents; }
    if (ev.hour != null) g.hours.push(ev.hour);
    if (ev.weekday != null) g.weekdays.push(ev.weekday);
    if (ev.neighborhood) g.neighborhoods.set(ev.neighborhood, (g.neighborhoods.get(ev.neighborhood) || 0) + 1);
  }

  const rows = Array.from(byCategory.entries()).map(([key, g]) => {
    const n = g.ests.size || 1;
    const peakHour = mode(g.hours);
    const peakWeekday = mode(g.weekdays);
    const topHood = Array.from(g.neighborhoods.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    const trend = g.visitsPrev > 0 ? (g.visitsRecent - g.visitsPrev) / g.visitsPrev : 0;
    return {
      key, label: g.label, n,
      avgVisits: Math.round(g.visits / n),
      avgWa: Math.round(g.wa / n),
      avgTicket: g.wa ? g.valueCents / g.wa / 100 : 0,
      conv: g.visits ? g.wa / g.visits : 0,
      peakHour, peakWeekday, topHood, trend,
    };
  }).sort((a, b) => b.avgVisits - a.avgVisits);

  const growing = rows.filter(r => r.trend > 0.1).slice(0, 3);
  const falling = rows.filter(r => r.trend < -0.1).slice(0, 3);
  const allHoods = new Map<string, number>();
  byCategory.forEach(g => g.neighborhoods.forEach((v, k) => allHoods.set(k, (allHoods.get(k) || 0) + v)));
  const topHoods = Array.from(allHoods.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2"><BarChart3 className="size-6 text-primary" /> Benchmark de Mercado</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Médias anônimas por categoria e região. Nunca exibimos dados individuais de estabelecimentos.
        </p>
      </header>

      <Alert>
        <Info className="size-4" />
        <AlertDescription className="text-xs">
          Apenas valores agregados são exibidos. Todos os comparativos respeitam a privacidade dos estabelecimentos e dos clientes.
        </AlertDescription>
      </Alert>

      {isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4 text-emerald-600" /> Categorias em crescimento</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {growing.length === 0 && <div className="text-muted-foreground text-xs">Sem variação significativa.</div>}
                {growing.map(g => <div key={g.key} className="flex justify-between"><span>{g.label}</span><Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">+{(g.trend * 100).toFixed(0)}%</Badge></div>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="size-4 text-red-600" /> Categorias com queda</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {falling.length === 0 && <div className="text-muted-foreground text-xs">Sem variação significativa.</div>}
                {falling.map(g => <div key={g.key} className="flex justify-between"><span>{g.label}</span><Badge variant="secondary" className="bg-red-500/10 text-red-700">{(g.trend * 100).toFixed(0)}%</Badge></div>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MapPin className="size-4 text-primary" /> Regiões com maior demanda</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {topHoods.length === 0 && <div className="text-muted-foreground text-xs">Sem dados ainda.</div>}
                {topHoods.map(([h, c]) => <div key={h} className="flex justify-between"><span>{h}</span><span className="text-muted-foreground">{c} eventos</span></div>)}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Médias por categoria</CardTitle>
              <CardDescription className="text-xs">Período: últimos 60 dias</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Lojas</TableHead>
                    <TableHead className="text-right">Visitas / loja</TableHead>
                    <TableHead className="text-right">Pedidos WA / loja</TableHead>
                    <TableHead className="text-right">Conversão</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                    <TableHead>Horário forte</TableHead>
                    <TableHead>Dia forte</TableHead>
                    <TableHead>Região líder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="text-right">{r.n}</TableCell>
                      <TableCell className="text-right">{r.avgVisits}</TableCell>
                      <TableCell className="text-right">{r.avgWa}</TableCell>
                      <TableCell className="text-right">{(r.conv * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{r.avgTicket ? r.avgTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</TableCell>
                      <TableCell>{r.peakHour != null ? `${r.peakHour}h` : "—"}</TableCell>
                      <TableCell>{r.peakWeekday != null ? WEEKDAYS[r.peakWeekday] : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.topHood || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function mode(arr: number[]): number | null {
  if (!arr.length) return null;
  const c: Record<number, number> = {};
  arr.forEach(v => c[v] = (c[v] || 0) + 1);
  return Number(Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]);
}
