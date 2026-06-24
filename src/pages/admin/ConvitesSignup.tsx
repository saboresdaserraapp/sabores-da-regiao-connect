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
import { logAdminConviteEvent } from "@/lib/adminAudit";
import {
  cancelExportJob,
  startExportJob,
  useExportJob,
  type ExportJob,
} from "@/hooks/useExportJob";

const PAGE_SIZE = 200;
const ACTIVE_JOB_LS_KEY = "sdr_convite_csv_job_id";

type Row = {
  id: string;
  tracking_code: string;
  dismissed_at: string;
  source: string | null;
  campaign: string;
  total_count?: number;
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

  // Debounced quick search so typing doesn't slam the URL or server.
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (qLocal !== q) updateParams({ q: qLocal || null });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  const filters = useMemo(
    () => ({ start, end, campaign, q, sort, dir }),
    [start, end, campaign, q, sort, dir],
  );

  // ---- Server-side search via RPC -----------------------------------------
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
      const offset = pageParam as number;
      const { data, error } = await supabase.rpc("search_signup_invites" as never, {
        _start: isoDayStart(filters.start),
        _end: isoDayEnd(filters.end),
        _campaign: filters.campaign === "all" ? null : filters.campaign,
        _q: filters.q ? filters.q : null,
        _sort: filters.sort,
        _dir: filters.dir,
        _limit: PAGE_SIZE,
        _offset: offset,
      } as never);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const total = rows[0]?.total_count ?? 0;
      return { rows, offset, total: Number(total) };
    },
    getNextPageParam: (last) => {
      const loaded = last.offset + last.rows.length;
      return loaded >= last.total ? undefined : loaded;
    },
  });

  const rows = useMemo(() => (data?.pages ?? []).flatMap((p) => p.rows), [data]);
  const serverTotal = data?.pages?.[0]?.total ?? 0;

  // Aggregates use the loaded slice; backed by total_count for "unique" hint.
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

  function toggleSort(key: SortKey) {
    if (sort === key) {
      updateParams({ sort: key, dir: dir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, dir: key === "dismissed_at" ? "desc" : "asc" });
    }
  }

  // ---- Audit logging ------------------------------------------------------
  const loggedViewRef = useRef(false);
  useEffect(() => {
    if (loggedViewRef.current) return;
    loggedViewRef.current = true;
    void logAdminConviteEvent("view", filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Skip the very first effect tick (covered by the view log).
    if (!loggedViewRef.current) return;
    const id = setTimeout(() => {
      void logAdminConviteEvent("filter", filters);
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, campaign, q, sort, dir]);

  // ---- Persistent CSV export job ------------------------------------------
  const initialJobId =
    params.get("export_job") ||
    (typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_JOB_LS_KEY) : null);
  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [starting, setStarting] = useState(false);
  const { data: job } = useExportJob(jobId);
  const downloadedRef = useRef<string | null>(null);

  // Sync jobId to URL + localStorage.
  useEffect(() => {
    if (jobId) {
      try { window.localStorage.setItem(ACTIVE_JOB_LS_KEY, jobId); } catch { /* noop */ }
      if (params.get("export_job") !== jobId) updateParams({ export_job: jobId });
    } else {
      try { window.localStorage.removeItem(ACTIVE_JOB_LS_KEY); } catch { /* noop */ }
      if (params.get("export_job")) updateParams({ export_job: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Render or update the progress toast as the job advances.
  useEffect(() => {
    if (!jobId) return;
    const toastId = `csv-export-${jobId}`;
    if (!job) {
      toast.loading("Preparando exportação…", { id: toastId, duration: Infinity });
      return;
    }
    if (job.status === "queued" || job.status === "running") {
      renderProgressToast(toastId, job, async () => {
        try { await cancelExportJob(jobId); } catch { /* noop */ }
      });
      return;
    }
    // Terminal states
    toast.dismiss(toastId);
    if (job.status === "done" && job.download_url && downloadedRef.current !== jobId) {
      downloadedRef.current = jobId;
      const fname = `convites-cadastro_${filters.start}_a_${filters.end}${
        filters.campaign !== "all" ? `_${filters.campaign}` : ""
      }.csv`;
      triggerDownload(job.download_url, fname);
      toast.success(`CSV pronto — ${job.done.toLocaleString("pt-BR")} eventos.`, {
        description: fname,
        duration: 10_000,
        action: {
          label: "Baixar de novo",
          onClick: () => triggerDownload(job.download_url!, fname),
        },
      });
      setJobId(null);
    } else if (job.status === "canceled") {
      toast.info("Exportação cancelada.");
      setJobId(null);
    } else if (job.status === "error") {
      toast.error(job.error ?? "Falha na exportação CSV.");
      setJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, jobId]);

  async function exportCsv() {
    if (starting || jobId) return;
    setStarting(true);
    try {
      const { job_id } = await startExportJob(filters);
      setJobId(job_id);
      toast.loading("Exportação iniciada — você pode continuar usando a tela.", {
        id: `csv-export-${job_id}`,
        duration: Infinity,
      });
    } catch (e) {
      console.error("[exportCsv]", e);
      toast.error("Não conseguimos iniciar a exportação.");
      void logAdminConviteEvent("export_error", filters, {
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setStarting(false);
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
        <Button
          onClick={exportCsv}
          disabled={starting || Boolean(jobId) || isLoading}
          variant="outline"
          className="gap-2"
          aria-busy={starting || Boolean(jobId)}
        >
          {starting || jobId ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {jobId ? "Exportando…" : "Exportar CSV"}
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="start">Desde</Label>
            <Input id="start" type="date" value={start} max={end} onChange={(e) => updateParams({ start: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end">Até</Label>
            <Input id="end" type="date" value={end} min={start} onChange={(e) => updateParams({ end: e.target.value })} />
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
        <Stat icon={Mail} label="Pedidos únicos (página)" value={totals.uniqueCodes} />
        <Stat icon={Eye} label="Exibições" value={totals.shown} />
        <Stat icon={MousePointerClick} label="Cliques no CTA" value={totals.cta} hint={`CTR ${totals.ctr.toFixed(1)}%`} />
        <Stat icon={XCircle} label="Dispensas" value={totals.dismiss} hint={`${totals.dismissRate.toFixed(1)}% das exibições`} />
      </div>

      <Card>
        <CardHeader className="gap-3 pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span>
              Eventos ({rows.length.toLocaleString("pt-BR")}
              {serverTotal > rows.length ? ` de ${serverTotal.toLocaleString("pt-BR")}` : ""})
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
          ) : rows.length === 0 ? (
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

function renderProgressToast(
  toastId: string,
  job: ExportJob,
  onCancel: () => void | Promise<void>,
) {
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
            onClick={() => { void onCancel(); }}
          >
            Cancelar
          </Button>
        </div>
        <Progress value={job.progress_pct ?? 0} className="h-2" />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {(job.done ?? 0).toLocaleString("pt-BR")}
            {job.total ? ` / ${job.total.toLocaleString("pt-BR")}` : ""}
          </span>
          <span>{job.progress_pct ?? 0}%</span>
        </div>
      </div>
    ),
    { id: toastId, duration: Infinity },
  );
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function SortableHead({
  label, col, sort, dir, onSort, align,
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
  icon: Icon, label, value, hint,
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
