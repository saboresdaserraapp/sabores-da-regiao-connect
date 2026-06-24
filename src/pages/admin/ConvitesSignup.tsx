import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Eye, MousePointerClick, XCircle, Mail } from "lucide-react";

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

  const filters = useMemo(() => ({ start, end, campaign }), [start, end, campaign]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "signup-invites", filters],
    queryFn: async () => {
      let q = supabase
        .from("signup_invite_dismissals")
        .select("id, tracking_code, dismissed_at, source, campaign")
        .gte("dismissed_at", isoDayStart(filters.start))
        .lte("dismissed_at", isoDayEnd(filters.end))
        .order("dismissed_at", { ascending: false })
        .limit(500);
      if (filters.campaign !== "all") q = q.eq("campaign", filters.campaign);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = data ?? [];
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

  return (
    <div className="container space-y-6 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Convites de cadastro</h1>
        <p className="text-sm text-muted-foreground">
          Eventos do popup pós-entrega: exibições, cliques no CTA e dispensas, por código de pedido.
        </p>
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
          <CardTitle className="text-sm font-semibold">Eventos recentes ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">Erro ao carregar dados.</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhum evento no período selecionado.</div>
          ) : (
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