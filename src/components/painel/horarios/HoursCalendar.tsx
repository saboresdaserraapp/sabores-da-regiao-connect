import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, Download, FileText } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  WEEKDAYS,
  weekForChannel,
  matchSpecialForDate,
  CHANNEL_LABELS,
  type WeeklyHours,
  type ChannelHours,
  type ChannelKey,
  type SpecialDay,
  type DayConfig,
} from "@/lib/businessHours";

const CHANNELS: ChannelKey[] = ["delivery", "pickup", "dine_in"];

function effectiveDay(
  iso: string,
  weekdayKey: string,
  week: WeeklyHours,
  special: SpecialDay[],
): { cfg: DayConfig; special?: SpecialDay } {
  const sp = matchSpecialForDate(iso, special);
  if (sp) return { cfg: { closed: sp.closed, slots: sp.slots }, special: sp };
  return { cfg: week[weekdayKey] ?? { closed: true, slots: [] } };
}

const dayHasAnyOpen = (cfg: DayConfig) => !cfg.closed && cfg.slots.length > 0;
const dayLabel = (cfg: DayConfig) =>
  cfg.closed || cfg.slots.length === 0 ? "Fechado" : cfg.slots.map((s) => `${s.open}-${s.close}`).join(", ");

function formatISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Weekday (0=Sun) of an ISO date, computed in a specific timezone via Intl.
function weekdayInTz(iso: string, tz: string): string {
  const d = new Date(iso + "T12:00:00");
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
  const map: Record<string, string> = { Sun: "0", Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6" };
  return map[wd] ?? "0";
}

export function HoursCalendar({
  week,
  channelHours,
  special,
  timezone,
  timezones,
  onTimezoneChange,
  establishmentName,
}: {
  week: WeeklyHours;
  channelHours: ChannelHours;
  special: SpecialDay[];
  timezone: string;
  timezones: string[];
  onTimezoneChange: (tz: string) => void;
  establishmentName?: string;
}) {
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const leading = first.getDay();
    const out: { iso: string | null; day: number | null }[] = [];
    for (let i = 0; i < leading; i++) out.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      out.push({ iso: formatISO(date), day: d });
    }
    while (out.length % 7 !== 0) out.push({ iso: null, day: null });
    return out;
  }, [cursor]);

  const todayIso = formatISO(new Date());

  const detail = selected
    ? (() => {
        const wd = weekdayInTz(selected, timezone);
        return CHANNELS.map((ch) => {
          const w = weekForChannel(week, channelHours, ch);
          const { cfg, special: sp } = effectiveDay(selected, wd, w, special);
          return { channel: ch, cfg, special: sp };
        });
      })()
    : null;

  const filename = `horarios-${establishmentName?.toLowerCase().replace(/\s+/g, "-") || "loja"}-${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

  const exportPng = async () => {
    if (!captureRef.current) return;
    try {
      const dataUrl = await toPng(captureRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${filename}.png`;
      a.click();
      toast.success("Imagem exportada");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + (e?.message ?? "desconhecido"));
    }
  };

  const exportPdf = async () => {
    if (!captureRef.current) return;
    try {
      const dataUrl = await toPng(captureRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => (img.onload = res));
      const ratio = Math.min((pageW - 40) / img.width, (pageH - 60) / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      pdf.setFontSize(12);
      pdf.text(`Calendário de horários — ${monthLabel} (${timezone})`, 20, 24);
      pdf.addImage(dataUrl, "PNG", (pageW - w) / 2, 40, w, h);
      pdf.save(`${filename}.pdf`);
      toast.success("PDF exportado");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + (e?.message ?? "desconhecido"));
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="font-medium capitalize">{monthLabel}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Select value={timezone} onValueChange={onTimezoneChange}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{timezones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
              Hoje
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportPng}><Download className="h-3.5 w-3.5 mr-1" />PNG</Button>
            <Button size="sm" variant="outline" onClick={exportPdf}><FileText className="h-3.5 w-3.5 mr-1" />PDF</Button>
          </div>
        </div>

        <div ref={captureRef} className="bg-background p-3 rounded-md">
          <div className="mb-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>{establishmentName ? `${establishmentName} · ` : ""}{monthLabel} · Fuso {timezone}</span>
            <span>Entrega · Retirada · Local</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((d) => <div key={d.key} className="py-1">{d.short}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c.iso) return <div key={i} className="h-16 rounded-md bg-muted/30" />;
              const wd = weekdayInTz(c.iso, timezone);
              const statuses = CHANNELS.map((ch) => {
                const w = weekForChannel(week, channelHours, ch);
                const { cfg, special: sp } = effectiveDay(c.iso!, wd, w, special);
                return { channel: ch, open: dayHasAnyOpen(cfg), special: !!sp };
              });
              const anySpecial = statuses.some((s) => s.special);
              const isToday = c.iso === todayIso;
              const isSelected = c.iso === selected;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(c.iso)}
                  className={`h-16 rounded-md border text-left p-1.5 transition hover:border-primary/60 ${
                    isSelected ? "border-primary ring-1 ring-primary" : "border-border"
                  } ${isToday ? "bg-primary/5" : ""}`}
                  title={statuses.map((s) => `${CHANNEL_LABELS[s.channel]}: ${s.open ? "Aberto" : "Fechado"}`).join(" · ")}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{c.day}</span>
                    {anySpecial && <span className="text-[10px] text-amber-600 font-bold">★</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {statuses.map((s) => (
                      <span key={s.channel} className={`h-1.5 w-1.5 rounded-full ${s.open ? "bg-emerald-500" : "bg-rose-400"}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Aberto</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Fechado</span>
            <span className="flex items-center gap-1"><span className="text-amber-600 font-bold">★</span> Exceção/feriado</span>
          </div>
        </div>

        {selected && detail && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Detalhes de {new Date(selected + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
              {detail.some((d) => d.special) && (
                <Badge variant="outline" className="border-amber-500 text-amber-700">
                  {detail.find((d) => d.special)?.special?.label || "Data especial"}
                  {detail.find((d) => d.special)?.special?.recurrence && detail.find((d) => d.special)!.special!.recurrence !== "none" && (
                    <span className="ml-1 text-[10px]">
                      ({detail.find((d) => d.special)!.special!.recurrence === "yearly" ? "anual" : "mensal"})
                    </span>
                  )}
                </Badge>
              )}
            </div>
            <div className="grid gap-1 sm:grid-cols-3">
              {detail.map((d) => (
                <div key={d.channel} className="text-xs">
                  <span className="font-medium">{CHANNEL_LABELS[d.channel]}: </span>
                  <span className={dayHasAnyOpen(d.cfg) ? "text-emerald-600" : "text-rose-500"}>{dayLabel(d.cfg)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}