// Structured business hours helpers.
// Weekly schedule: { "0": DayConfig, ..., "6": DayConfig } where 0 = Sunday.
// Special day: { date: "YYYY-MM-DD", label?: string, closed: boolean, slots: TimeSlot[] }

export type TimeSlot = { open: string; close: string }; // "HH:mm"
export type DayConfig = { closed: boolean; slots: TimeSlot[] };
export type WeeklyHours = Record<string, DayConfig>;
export type SpecialDay = { date: string; label?: string; closed: boolean; slots: TimeSlot[] };

export const WEEKDAYS = [
  { key: "0", short: "Dom", long: "Domingo" },
  { key: "1", short: "Seg", long: "Segunda-feira" },
  { key: "2", short: "Ter", long: "Terça-feira" },
  { key: "3", short: "Qua", long: "Quarta-feira" },
  { key: "4", short: "Qui", long: "Quinta-feira" },
  { key: "5", short: "Sex", long: "Sexta-feira" },
  { key: "6", short: "Sáb", long: "Sábado" },
] as const;

export const emptyWeek = (): WeeklyHours => {
  const w: WeeklyHours = {};
  for (const d of WEEKDAYS) w[d.key] = { closed: true, slots: [] };
  return w;
};

export function normalizeWeek(input: unknown): WeeklyHours {
  const base = emptyWeek();
  if (!input || typeof input !== "object") return base;
  for (const d of WEEKDAYS) {
    const raw = (input as any)[d.key];
    if (!raw) continue;
    const slots: TimeSlot[] = Array.isArray(raw.slots)
      ? raw.slots
          .filter((s: any) => s && typeof s.open === "string" && typeof s.close === "string")
          .map((s: any) => ({ open: s.open, close: s.close }))
      : [];
    base[d.key] = { closed: !!raw.closed || slots.length === 0, slots };
  }
  return base;
}

export function normalizeSpecial(input: unknown): SpecialDay[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s: any) => s && typeof s.date === "string")
    .map((s: any) => ({
      date: s.date,
      label: typeof s.label === "string" ? s.label : undefined,
      closed: !!s.closed,
      slots: Array.isArray(s.slots)
        ? s.slots
            .filter((x: any) => x && typeof x.open === "string" && typeof x.close === "string")
            .map((x: any) => ({ open: x.open, close: x.close }))
        : [],
    }));
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

export type SlotError = { day: string; index: number; message: string };

export function validateWeek(week: WeeklyHours): SlotError[] {
  const errors: SlotError[] = [];
  for (const d of WEEKDAYS) {
    const cfg = week[d.key];
    if (!cfg || cfg.closed) continue;
    const sorted = [...cfg.slots].map((s, i) => ({ ...s, i }));
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const o = toMinutes(s.open);
      const c = toMinutes(s.close);
      if (Number.isNaN(o) || Number.isNaN(c)) {
        errors.push({ day: d.key, index: s.i, message: "Horário inválido" });
        continue;
      }
      // allow close < open when crossing midnight; but if equal, error
      if (o === c) errors.push({ day: d.key, index: s.i, message: "Abre e fecha no mesmo horário" });
    }
    // overlap check (non-overnight)
    const ranges = cfg.slots
      .map((s, i) => ({ o: toMinutes(s.open), c: toMinutes(s.close), i }))
      .filter((r) => !Number.isNaN(r.o) && !Number.isNaN(r.c) && r.c > r.o)
      .sort((a, b) => a.o - b.o);
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].o < ranges[i - 1].c) {
        errors.push({ day: d.key, index: ranges[i].i, message: "Faixa de horário sobreposta" });
      }
    }
  }
  return errors;
}

// Compose readable summary like "Seg-Sex 11h-15h, 18h-22h · Sáb 18h-23h"
export function summarizeWeek(week: WeeklyHours): string {
  const parts: string[] = [];
  const groups: { keys: string[]; text: string }[] = [];
  const dayText = (cfg: DayConfig) =>
    cfg.closed || cfg.slots.length === 0
      ? "Fechado"
      : cfg.slots.map((s) => `${s.open.replace(":00", "h").replace(":", "h")}-${s.close.replace(":00", "h").replace(":", "h")}`).join(", ");
  let current: { keys: string[]; text: string } | null = null;
  for (const d of WEEKDAYS) {
    const text = dayText(week[d.key]);
    if (current && current.text === text) current.keys.push(d.key);
    else {
      if (current) groups.push(current);
      current = { keys: [d.key], text };
    }
  }
  if (current) groups.push(current);
  for (const g of groups) {
    if (g.text === "Fechado") continue;
    const first = WEEKDAYS.find((w) => w.key === g.keys[0])!.short;
    const last = WEEKDAYS.find((w) => w.key === g.keys[g.keys.length - 1])!.short;
    parts.push(`${g.keys.length > 1 ? `${first}-${last}` : first} ${g.text}`);
  }
  return parts.join(" · ") || "Fechado";
}

// Compute whether the store is open at a given Date, given the schedule and special hours.
export function isOpenAt(
  when: Date,
  week: WeeklyHours,
  special: SpecialDay[] = [],
  timezone = "America/Sao_Paulo",
): boolean {
  // Get date/time components in the configured timezone using Intl.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(when).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const isoDate = `${parts.year}-${parts.month}-${parts.day}`;
  const wdMap: Record<string, string> = { Sun: "0", Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6" };
  const wd = wdMap[parts.weekday] ?? "0";
  const nowMin = Number(parts.hour) * 60 + Number(parts.minute);

  const sp = special.find((s) => s.date === isoDate);
  const cfg: DayConfig | undefined = sp
    ? { closed: sp.closed, slots: sp.slots }
    : week[wd];
  if (!cfg || cfg.closed) return false;
  for (const s of cfg.slots) {
    const o = toMinutes(s.open);
    const c = toMinutes(s.close);
    if (Number.isNaN(o) || Number.isNaN(c)) continue;
    if (c > o) {
      if (nowMin >= o && nowMin < c) return true;
    } else {
      // overnight range: open .. 24h OR 0 .. close
      if (nowMin >= o || nowMin < c) return true;
    }
  }
  return false;
}