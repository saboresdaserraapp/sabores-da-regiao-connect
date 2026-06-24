import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  Eye,
  MousePointerClick,
  XCircle,
  Mail,
  Download,
  Inbox,
  AlertTriangle,
  Loader2,
} from "lucide-react";
const PAGE_SIZE = 200;
const EXPORT_HARD_CAP = 10_000;


type Row = {
  id: string;
  tracking_code: string;
  dismissed_at: string;
  source: string | null;
  campaign: string;
};

const SOURCE_LABEL: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  shown: { label: "Exibido", icon: Eye, tone: "bg-muted text-foreground" },
  cta: { label: "Clicou no CTA", icon: MousePointerClick, tone: "bg-primary/10 text-primary" },
  dismiss: { label: "Dispensou", icon: XCircle, tone: "bg-destructive/10 text-destructive" },
};

const CAMPAIGNS = [
  { value: "all", label: "Todas as campanhas" },
  { value: "post_delivery_invite", label: "Pós-entrega" },
  { value: "direct", label: "Acesso direto" },
];

function isoDayStart(d: string) {
  return new Date(`${d}T00:00:00`).toISOString();
}
function isoDayEnd(d: string) {
  return new Date(`${d}T23:59:59.999`).toISOString();
}
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
function defaultEnd() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminConvitesSignup() {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [campaign, setCampaign] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(() => ({ start, end, campaign }), [start, end, campaign]);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["admin", "signup-invites", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("signup_invite_dismissals")
        .select("id, tracking_code, dismissed_at, source, campaign")
        .gte("dismissed_at", isoDayStart(filters.start))
        .lte("dismissed_at", isoDayEnd(filters.end))
        .order("dismissed_at", { ascending: false })
        .range(from, to);
      if (filters.campaign !== "all") q = q.eq("campaign", filters.campaign);
      const { data, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Row[], page: pageParam as number };
    },
    getNextPageParam: (last) => (last.rows.length < PAGE_SIZE ? undefined : last.page + 1),
  });

  const rows = useMemo(() => (data?.pages ?? []).flatMap((p) => p.rows), [data]);
  const totals = useMemo(() => {
    const codes = new Set<string>();
    let shown = 0;
    let cta = 0;
    let dismiss = 0;
    for (const r of rows) {
      codes.add(r.tracking_code);
      if (r.source === "shown") shown += 1;
      else if (r.source === "cta") cta += 1;
      else if (r.source === "dismiss") dismiss += 1;
    }
    const ctr = shown ? (cta / shown) * 100 : 0;
    const dismissRate = shown ? (dismiss / shown) * 100 : 0;
    return { uniqueCodes: codes.size, shown, cta, dismiss, ctr, dismissRate };
  }, [rows]);

  async function fetchAllForExport(): Promise<Row[]> {
    const all: Row[] = [];
    let page = 0;
    // Stream pages until exhausted or we hit the hard cap.
    while (all.length < EXPORT_HARD_CAP) {
      const from = page * PAGE_SIZE;
      const to = Math.min(from + PAGE_SIZE - 1, EXPORT_HARD_CAP - 1);
      let q = supabase
        .from("signup_invite_dismissals")
        .select("id, tracking_code, dismissed_at, source, campaign")
        .gte("dismissed_at", isoDayStart(filters.start))
        .lte("dismissed_at", isoDayEnd(filters.end))
        .order("dismissed_at", { ascending: false })
        .range(from, to);
      if (filters.campaign !== "all") q = q.eq("campaign", filters.campaign);
      const { data, error } = await q;
      if (error) throw error;
      const batch = (data ?? []) as Row[];
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      page += 1;
    }
    return all;
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const all = await fetchAllForExport();
      if (all.length === 0) {
        toast.info("Nenhum evento para exportar com os filtros atuais.");
        return;
      }
      const header = ["tracking_code", "source", "campaign", "dismissed_at"];
      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const body = all
        .map((r) =>
          [r.tracking_code, r.source ?? "", r.campaign, r.dismissed_at].map(escape).join(","),
        )
        .join("\n");
      const csv = `${header.join(",")}\n${body}\n`;
      // BOM for Excel-friendly UTF-8.
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `convites-cadastro_${filters.start}_a_${filters.end}${filters.campaign !== "all" ? `_${filters.campaign}` : ""}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exportados ${all.length.toLocaleString("pt-BR")} eventos.`);
    } catch (e) {
      toast.error("Falha ao exportar CSV. Tente novamente.");
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="container space-y-6 py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Convites de cadastro</h1>
          <p className="text-sm text-muted-foreground">
            Eventos do popup pós-entrega: exibições, cliques no CTA e dispensas, por código de pedido.
          </p>
        </div>
        <Button onClick={exportCsv} disabled={exporting || isLoading} variant="outline" className="gap-2">
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar CSV
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="start">Desde</Label>
            <Input id="start" type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end">Até</Label>
            <Input id="end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Fonte</Label>
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAMPAIGNS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Mail} label="Pedidos únicos" value={totals.uniqueCodes} />
        <Stat icon={Eye} label="Exibições" value={totals.shown} />
        <Stat icon={MousePointerClick} label="Cliques no CTA" value={totals.cta} hint={`CTR ${totals.ctr.toFixed(1)}%`} />
        <Stat icon={XCircle} label="Dispensas" value={totals.dismiss} hint={`${totals.dismissRate.toFixed(1)}% das exibições`} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span>Eventos recentes ({rows.length.toLocaleString("pt-BR")})</span>
            {isFetching && !isFetchingNextPage && !isLoading && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> atualizando…
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState label="Buscando eventos…" className="py-12" />
          ) : error ? (
            <div className="p-6">
              <EmptyState
                icon={AlertTriangle}
                title="Não foi possível carregar os eventos"
                description={(error as Error)?.message ?? "Verifique sua conexão e tente novamente."}
                action={<Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>}
              />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Inbox}
                title="Nenhum evento no período selecionado"
                description="Ajuste o intervalo de datas ou a fonte para ver mais resultados."
              />
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const meta = SOURCE_LABEL[r.source ?? ""] ?? {
                    label: r.source ?? "—",
                    icon: Eye,
                    tone: "bg-muted text-foreground",
                  };
                  const Icon = meta.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.tracking_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 border-transparent ${meta.tone}`}>
                          <Icon className="size-3" /> {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.campaign}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(r.dismissed_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-center gap-3 border-t border-border/60 p-4">
              {hasNextPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="gap-2"
                >
                  {isFetchingNextPage && <Loader2 className="size-3 animate-spin" />}
                  Carregar mais {PAGE_SIZE}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Todos os eventos do período carregados.
                </span>
              )}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="font-display text-2xl font-bold leading-tight">{value.toLocaleString("pt-BR")}</div>
          {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}