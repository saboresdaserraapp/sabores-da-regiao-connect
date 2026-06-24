import { useEffect, useState } from "react";
import { Smartphone, Loader2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <section className="rounded-xl border p-5 bg-card">
      <h3 className="font-bold flex items-center gap-2 mb-3">
        <Smartphone className="size-4" /> Histórico de envios pelo WhatsApp
      </h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum envio registrado para este pedido ainda.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((r) => (
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