import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
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

function effectiveDay(iso: string, weekdayKey: string, week: WeeklyHours, special: SpecialDay[]): { cfg: DayConfig; special?: SpecialDay } {
  const sp = matchSpecialForDate(iso, special);
  if (sp) return { cfg: { closed: sp.closed, slots: sp.slots }, special: sp };
  return { cfg: week[weekdayKey] ?? { closed: true, slots: [] } };
}

function dayHasAnyOpen(cfg: DayConfig): boolean {
  return !cfg.closed && cfg.slots.length > 0;
}

function dayLabel(cfg: DayConfig): string {
  if (cfg.closed || cfg.slots.length === 0) return "Fechado";
  return cfg.slots.map((s) => `${s.open}-${s.close}`).join(", ");
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HoursCalendar({
  week,
  channelHours,
  special,
}: {
  week: WeeklyHours;
  channelHours: ChannelHours;
  special: SpecialDay[];
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const leading = first.getDay(); // 0=Sun
    const out: { iso: string | null; day: number | null; wd: string }[] = [];
    for (let i = 0; i < leading; i++) out.push({ iso: null, day: null, wd: String(i) });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      out.push({ iso: formatISO(date), day: d, wd: String(date.getDay()) });
    }
    // pad tail to complete rows of 7
    while (out.length % 7 !== 0) out.push({ iso: null, day: null, wd: "0" });
    return out;
  }, [cursor]);

  const todayIso = formatISO(new Date());

  const detail = selected
    ? (() => {
        const wd = String(new Date(selected + "T00:00:00").getDay());
        return CHANNELS.map((ch) => {
          const w = weekForChannel(week, channelHours, ch);
          const { cfg, special: sp } = effectiveDay(selected, wd, w, special);
          return { channel: ch, cfg, special: sp };
        });
      })()
    : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="font-medium capitalize">{monthLabel}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCursor(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })}>
              Hoje
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => <div key={d.key} className="py-1">{d.short}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c.iso) return <div key={i} className="h-16 rounded-md bg-muted/30" />;
            const statuses = CHANNELS.map((ch) => {
              const w = weekForChannel(week, channelHours, ch);
              const { cfg, special: sp } = effectiveDay(c.iso!, c.wd, w, special);
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
                    <span
                      key={s.channel}
                      className={`h-1.5 w-1.5 rounded-full ${s.open ? "bg-emerald-500" : "bg-rose-400"}`}
                      title={`${CHANNEL_LABELS[s.channel]}: ${s.open ? "Aberto" : "Fechado"}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-muted-foreground border-t">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Aberto</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Fechado</span>
          <span className="flex items-center gap-1"><span className="text-amber-600 font-bold">★</span> Exceção/feriado</span>
          <span>Bolinhas nesta ordem: Entrega · Retirada · Local</span>
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