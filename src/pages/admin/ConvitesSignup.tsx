import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
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
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
} from "lucide-react";

const PAGE_SIZE = 200;
const EXPORT_HARD_CAP = 50_000;
const EXPORT_BATCH = 500;

type Row = {
  id: string;
  tracking_code: string;
  dismissed_at: string;
  source: string | null;
  campaign: string;
};

type SortKey = "dismissed_at" | "tracking_code" | "source" | "campaign";
type SortDir = "asc" | "desc";

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
  const [params, setParams] = useSearchParams();

  // ---- URL-persisted filters ----------------------------------------------
  const start = params.get("start") || defaultStart();
  const end = params.get("end") || defaultEnd();
  const campaign = params.get("campaign") || "all";
  const q = params.get("q") || "";
  const sort = (params.get("sort") as SortKey) || "dismissed_at";
  const dir = (params.get("dir") as SortDir) || "desc";

  const updateParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Keep a debounced copy of the quick-search string so typing isn't laggy.
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (qLocal !== q) updateParams({ q: qLocal || null });
    }, 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

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
      let qb = supabase
        .from("signup_invite_dismissals")
        .select("id, tracking_code, dismissed_at, source, campaign")
        .gte("dismissed_at", isoDayStart(filters.start))
        .lte("dismissed_at", isoDayEnd(filters.end))
        .order("dismissed_at", { ascending: false })
        .range(from, to);
      if (filters.campaign !== "all") qb = qb.eq("campaign", filters.campaign);
      const { data, error } = await qb;
      if (error) throw error;
      return { rows: (data ?? []) as Row[], page: pageParam as number };
    },
    getNextPageParam: (last) => (last.rows.length < PAGE_SIZE ? undefined : last.page + 1),
  });

  const rawRows = useMemo(() => (data?.pages ?? []).flatMap((p) => p.rows), [data]);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rawRows;
    return rawRows.filter((r) =>
      [r.tracking_code, r.source ?? "", r.campaign]
        .some((s) => s.toLowerCase().includes(needle)),
    );
  }, [rawRows, q]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      const av = (a[sort] ?? "") as string;
      const bv = (b[sort] ?? "") as string;
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredRows, sort, dir]);

  const totals = useMemo(() => {
    const codes = new Set<string>();
    let shown = 0;
    let cta = 0;
    let dismiss = 0;
    for (const r of filteredRows) {
      codes.add(r.tracking_code);
      if (r.source === "shown") shown += 1;
      else if (r.source === "cta") cta += 1;
      else if (r.source === "dismiss") dismiss += 1;
    }
    const ctr = shown ? (cta / shown) * 100 : 0;
    const dismissRate = shown ? (dismiss / shown) * 100 : 0;
    return { uniqueCodes: codes.size, shown, cta, dismiss, ctr, dismissRate };
  }, [filteredRows]);

  function toggleSort(key: SortKey) {
    if (sort === key) {
      updateParams({ sort: key, dir: dir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, dir: key === "dismissed_at" ? "desc" : "asc" });
    }
  }

  // ---- Background CSV export with progress bar ----------------------------
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
  const [exportDone, setExportDone] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const exportToastId = useRef<string | number | null>(null);
  const cancelRef = useRef(false);

  function renderProgressToast() {
    const id = exportToastId.current;
    if (id == null) return;
    toast.custom(
      () => (
        <div className="w-[320px] rounded-lg border border-border/60 bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin text-primary" />
              Exportando CSV…
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              Cancelar
            </Button>
          </div>
          <Progress value={exportPct} className="h-2" />
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {exportDone.toLocaleString("pt-BR")}
              {exportTotal > 0 ? ` / ${exportTotal.toLocaleString("pt-BR")}` : ""}
            </span>
            <span>{exportPct}%</span>
          </div>
        </div>
      ),
      { id, duration: Infinity },
    );
  }

  // Re-render the progress toast whenever its inputs change.
  useEffect(() => {
    if (exporting) renderProgressToast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exporting, exportPct, exportDone, exportTotal]);

  async function exportCsv() {
    if (exporting) return;
    cancelRef.current = false;
    setExporting(true);
    setExportPct(0);
    setExportDone(0);
    setExportTotal(0);
    exportToastId.current = `csv-export-${Date.now()}`;
    renderProgressToast();

    try {
      // 1) Cheap count to drive the progress bar.
      let countQ = supabase
        .from("signup_invite_dismissals")
        .select("id", { count: "exact", head: true })
        .gte("dismissed_at", isoDayStart(filters.start))
        .lte("dismissed_at", isoDayEnd(filters.end));
      if (filters.campaign !== "all") countQ = countQ.eq("campaign", filters.campaign);
      const { count, error: countErr } = await countQ;
      if (countErr) throw countErr;
      const total = Math.min(count ?? 0, EXPORT_HARD_CAP);
      setExportTotal(total);

      if (total === 0) {
        toast.dismiss(exportToastId.current);
        toast.info("Nenhum evento para exportar com os filtros atuais.");
        return;
      }

      // 2) Stream rows in batches, yielding to the UI between requests.
      const all: Row[] = [];
      let page = 0;
      while (all.length < total) {
        if (cancelRef.current) {
          toast.dismiss(exportToastId.current);
          toast.info("Exportação cancelada.");
          return;
        }
        const from = page * EXPORT_BATCH;
        const to = Math.min(from + EXPORT_BATCH - 1, total - 1);
        let qb = supabase
          .from("signup_invite_dismissals")
          .select("id, tracking_code, dismissed_at, source, campaign")
          .gte("dismissed_at", isoDayStart(filters.start))
          .lte("dismissed_at", isoDayEnd(filters.end))
          .order("dismissed_at", { ascending: false })
          .range(from, to);
        if (filters.campaign !== "all") qb = qb.eq("campaign", filters.campaign);
        const { data, error } = await qb;
        if (error) throw error;
        const batch = (data ?? []) as Row[];
        all.push(...batch);
        page += 1;
        const done = all.length;
        setExportDone(done);
        setExportPct(Math.min(100, Math.round((done / total) * 100)));
        // Yield to the event loop so the UI stays responsive.
        await new Promise((r) => setTimeout(r, 0));
        if (batch.length < EXPORT_BATCH) break;
      }

      // 3) Build CSV and trigger download.
      const header = ["tracking_code", "source", "campaign", "dismissed_at"];
      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const body = all
        .map((r) =>
          [r.tracking_code, r.source ?? "", r.campaign, r.dismissed_at].map(escape).join(","),
        )
        .join("\n");
      const csv = `${header.join(",")}\n${body}\n`;
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const fname = `convites-cadastro_${filters.start}_a_${filters.end}${filters.campaign !== "all" ? `_${filters.campaign}` : ""}.csv`;

      // Auto-download.
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Replace progress toast with a "ready" notification including manual link.
      toast.dismiss(exportToastId.current);
      toast.success(`CSV pronto — ${all.length.toLocaleString("pt-BR")} eventos.`, {
        description: fname,
        duration: 8000,
        action: {
          label: "Baixar de novo",
          onClick: () => {
            const a2 = document.createElement("a");
            a2.href = url;
            a2.download = fname;
            document.body.appendChild(a2);
            a2.click();
            a2.remove();
          },
        },
      });
      // Revoke after a delay to keep the "Baixar de novo" link usable.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (exportToastId.current != null) toast.dismiss(exportToastId.current);
      toast.error("Falha ao exportar CSV. Tente novamente.");
      console.error(e);
    } finally {
      setExporting(false);
      exportToastId.current = null;
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
            <Input
              id="start"
              type="date"
              value={start}
              max={end}
              onChange={(e) => updateParams({ start: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end">Até</Label>
            <Input
              id="end"
              type="date"
              value={end}
              min={start}
              onChange={(e) => updateParams({ end: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Fonte</Label>
            <Select value={campaign} onValueChange={(v) => updateParams({ campaign: v === "all" ? null : v })}>
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
        <CardHeader className="gap-3 pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span>
              Eventos recentes ({sortedRows.length.toLocaleString("pt-BR")}
              {q && rawRows.length !== sortedRows.length
                ? ` de ${rawRows.length.toLocaleString("pt-BR")}`
                : ""}
              )
            </span>
            {isFetching && !isFetchingNextPage && !isLoading && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> atualizando…
              </span>
            )}
          </CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Buscar por tracking_code, e-mail ou telefone…"
              className="pl-9 pr-9"
              aria-label="Busca rápida"
            />
            {qLocal && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setQLocal("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
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
          ) : sortedRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Inbox}
                title={q ? "Nenhum resultado para a busca" : "Nenhum evento no período selecionado"}
                description={q ? "Ajuste os termos ou limpe a busca." : "Ajuste o intervalo de datas ou a fonte para ver mais resultados."}
                action={q ? <Button size="sm" variant="outline" onClick={() => setQLocal("")}>Limpar busca</Button> : undefined}
              />
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Pedido" col="tracking_code" sort={sort} dir={dir} onSort={toggleSort} />
                  <SortableHead label="Ação" col="source" sort={sort} dir={dir} onSort={toggleSort} />
                  <SortableHead label="Campanha" col="campaign" sort={sort} dir={dir} onSort={toggleSort} />
                  <SortableHead label="Quando" col="dismissed_at" sort={sort} dir={dir} onSort={toggleSort} align="right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((r) => {
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

function SortableHead({
  label,
  col,
  sort,
  dir,
  onSort,
  align,
}: {
  label: string;
  col: SortKey;
  sort: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "right";
}) {
  const active = sort === col;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
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
