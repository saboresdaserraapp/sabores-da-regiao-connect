import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Image as ImageIcon, FileText, MapPin, Video, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  event_type: string | null;
  created_at: string;
  has_media: boolean | null;
  media_count: number | null;
  has_video: boolean | null;
  has_instructions: boolean | null;
  has_pins: boolean | null;
  instructions_length: number | null;
  pins_count: number | null;
  whatsapp_number: string | null;
  tracking_code: string | null;
  visual_reference_source: string | null;
};

const EVENT_LABEL: Record<string, string> = {
  initial_send: "Enviado ao WhatsApp",
  resend: "Reenviado ao WhatsApp",
  business_confirmation: "Confirmação do estabelecimento",
  reference_share: "Referências compartilhadas",
  driver_share: "Enviado ao motoboy",
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function WhatsappOrderEventsTimeline({ orderId }: { orderId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("whatsapp_order_events" as never)
      .select("id,event_type,created_at,has_media,media_count,has_video,has_instructions,has_pins,instructions_length,pins_count,whatsapp_number,tracking_code,visual_reference_source")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) {
      setError(error.message);
      setRows(null);
    } else {
      setRows((data ?? []) as unknown as Row[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    (async () => {
      await load();
      if (!active) return;
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground" data-testid="wa-events-loading">
        <Loader2 className="size-4 animate-spin" /> Carregando linha do tempo…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm" data-testid="wa-events-error">
        <div className="flex items-center gap-2 text-destructive font-medium">
          <AlertCircle className="size-4" /> Não foi possível carregar a linha do tempo.
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <button
          type="button"
          className="mt-2 inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1 text-xs hover:bg-muted"
          onClick={() => load()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground" data-testid="wa-events-empty">
        Ainda não há eventos do WhatsApp registrados para este pedido.
      </div>
    );
  }

  return (
    <ol className="relative ml-2 space-y-3 border-l pl-4" data-testid="wa-events-timeline">
      {rows.map((r) => (
        <li key={r.id} className="relative">
          <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary ring-2 ring-background" />
          <div className="text-xs text-muted-foreground">{fmt(r.created_at)}</div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="size-3.5 text-primary" />
            {EVENT_LABEL[r.event_type ?? ""] ?? r.event_type ?? "Evento"}
            {r.tracking_code && (
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{r.tracking_code}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {r.has_media && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <ImageIcon className="size-3" /> {r.media_count ?? 1} imagem(ns)
              </span>
            )}
            {r.has_video && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <Video className="size-3" /> vídeo
              </span>
            )}
            {r.has_instructions && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <FileText className="size-3" /> instruções ({r.instructions_length ?? 0} caract.)
              </span>
            )}
            {r.has_pins && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <MapPin className="size-3" /> {r.pins_count ?? 0} pin(s)
              </span>
            )}
            {r.whatsapp_number && (
              <span className="rounded-full bg-muted px-2 py-0.5">→ {r.whatsapp_number}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}