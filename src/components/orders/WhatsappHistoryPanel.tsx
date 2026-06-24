import { useEffect, useMemo, useState } from "react";
import { Smartphone, Loader2, ArrowUpRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type LogRow = {
  id: string;
  kind: "initial" | "resend";
  sent_at: string;
  tracking_code: string | null;
  whatsapp_message: string | null;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function WhatsappHistoryPanel({ orderId }: { orderId: string }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [codeFilter, setCodeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("whatsapp_send_logs" as never)
        .select("id,kind,sent_at,tracking_code,whatsapp_message")
        .eq("order_id", orderId)
        .order("sent_at", { ascending: false });
      if (!active) return;
      setRows((data as unknown as LogRow[]) ?? []);
      setLoading(false);
    })();
    const ch = supabase
      .channel(`wa-logs-${orderId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "whatsapp_send_logs",
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const row = payload.new as LogRow;
        setRows((prev) => [row, ...prev]);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [orderId]);

  const filtered = useMemo(() => {
    const code = codeFilter.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    // include the entire end-day
    const to = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    return rows.filter((r) => {
      if (code && !(r.tracking_code ?? "").toLowerCase().includes(code)) return false;
      const ts = new Date(r.sent_at).getTime();
      if (from != null && ts < from) return false;
      if (to != null && ts > to) return false;
      return true;
    });
  }, [rows, codeFilter, fromDate, toDate]);

  const hasFilter = codeFilter || fromDate || toDate;
  const clearFilters = () => { setCodeFilter(""); setFromDate(""); setToDate(""); };

  return (
    <section className="rounded-xl border p-5 bg-card">
      <h3 className="font-bold flex items-center gap-2 mb-3">
        <Smartphone className="size-4" /> Histórico de envios pelo WhatsApp
      </h3>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr,auto,auto,auto]">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tracking code
          </Label>
          <Input
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            placeholder="SDS-..."
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">De</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Até</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs" />
        </div>
        {hasFilter && (
          <div className="flex items-end">
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
              <X className="mr-1 size-3" /> Limpar
            </Button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasFilter
            ? "Nenhum envio corresponde aos filtros."
            : "Nenhum envio registrado para este pedido ainda."}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {filtered.map((r) => (
            <li key={r.id} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={
                    r.kind === "initial"
                      ? "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary"
                      : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground"
                  }>
                    {r.kind === "initial" ? "Envio inicial" : "Reenvio"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.tracking_code}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{fmt(r.sent_at)}</span>
              </div>
              {r.whatsapp_message && (
                <button
                  type="button"
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ArrowUpRight className="size-3" />
                  {openId === r.id ? "Ocultar mensagem" : "Ver mensagem enviada"}
                </button>
              )}
              {openId === r.id && r.whatsapp_message && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-2 text-[11px] leading-relaxed text-foreground/80">
                  {r.whatsapp_message}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Reenviar pelo WhatsApp não duplica eventos da linha do tempo pública —
        apenas registra um novo envio aqui.
      </p>
    </section>
  );
}