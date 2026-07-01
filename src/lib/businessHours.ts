// Structured business hours helpers.
// Weekly schedule: { "0": DayConfig, ..., "6": DayConfig } where 0 = Sunday.
// Special day: { date: "YYYY-MM-DD", label?: string, closed: boolean, slots: TimeSlot[] }

export type TimeSlot = { open: string; close: string }; // "HH:mm"
export type DayConfig = { closed: boolean; slots: TimeSlot[] };
export type WeeklyHours = Record<string, DayConfig>;
export type SpecialRecurrence = "none" | "yearly" | "monthly";
export type SpecialDay = {
  id?: string;
  date: string; // YYYY-MM-DD
  label?: string;
  closed: boolean;
  slots: TimeSlot[];
  recurrence?: SpecialRecurrence; // default "none"
  enabled?: boolean; // default true
};
export type ChannelKey = "delivery" | "pickup" | "dine_in";
export type ChannelHours = Partial<Record<ChannelKey, WeeklyHours>>;

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
  dine_in: "Comer no local",
};

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
      id: typeof s.id === "string" ? s.id : undefined,
      date: s.date,
      label: typeof s.label === "string" ? s.label : undefined,
      closed: !!s.closed,
      slots: Array.isArray(s.slots)
        ? s.slots
            .filter((x: any) => x && typeof x.open === "string" && typeof x.close === "string")
            .map((x: any) => ({ open: x.open, close: x.close }))
        : [],
      recurrence:
        s.recurrence === "yearly" || s.recurrence === "monthly" ? s.recurrence : "none",
      enabled: s.enabled === false ? false : true,
    }));
}

export function normalizeChannelHours(input: unknown): ChannelHours {
  const out: ChannelHours = {};
  if (!input || typeof input !== "object") return out;
  for (const k of ["delivery", "pickup", "dine_in"] as ChannelKey[]) {
    const raw = (input as any)[k];
    if (raw && typeof raw === "object") out[k] = normalizeWeek(raw);
  }
  return out;
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

  const sp = matchSpecialForDate(isoDate, special);
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

// Match a special-day rule against an ISO date, honouring recurrence (yearly/monthly) and enabled flag.
export function matchSpecialForDate(isoDate: string, special: SpecialDay[]): SpecialDay | undefined {
  const [y, m, d] = isoDate.split("-");
  for (const sp of special) {
    if (sp.enabled === false) continue;
    const [sy, sm, sd] = sp.date.split("-");
    const rec = sp.recurrence ?? "none";
    if (rec === "none" && sp.date === isoDate) return sp;
    if (rec === "yearly" && sm === m && sd === d) return sp;
    if (rec === "monthly" && sd === d) return sp;
    // still allow original exact date to match for yearly/monthly historic records
    if (sp.date === isoDate) return sp;
    // ignore future single-date rules that don't match today
    void y; void sy;
  }
  return undefined;
}

// Find the next moment (up to `daysAhead` in the future) where the store will be open.
// Returns a formatted string in the configured timezone, or null if none found.
export function nextOpeningLabel(
  from: Date,
  week: WeeklyHours,
  special: SpecialDay[] = [],
  timezone = "America/Sao_Paulo",
  daysAhead = 14,
): string | null {
  // Iterate minute-by-minute would be slow; iterate day-by-day and inspect slots.
  const wdMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let offset = 0; offset <= daysAhead; offset++) {
    const candidate = new Date(from.getTime() + offset * 24 * 60 * 60 * 1000);
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
    const parts = fmt.formatToParts(candidate).reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value; return acc;
    }, {});
    const isoDate = `${parts.year}-${parts.month}-${parts.day}`;
    const wd = String(wdMap.indexOf(parts.weekday));
    const nowMin = offset === 0 ? Number(parts.hour) * 60 + Number(parts.minute) : 0;
    const sp = matchSpecialForDate(isoDate, special);
    const cfg = sp ? { closed: sp.closed, slots: sp.slots } : week[wd];
    if (!cfg || cfg.closed) continue;
    const candidates = cfg.slots
      .map((s) => ({ o: toMinutes(s.open), c: toMinutes(s.close), open: s.open, close: s.close }))
      .filter((s) => !Number.isNaN(s.o) && !Number.isNaN(s.c))
      .sort((a, b) => a.o - b.o);
    for (const s of candidates) {
      // If we are inside slot right now, opening is "now"
      if (offset === 0 && s.c > s.o && nowMin >= s.o && nowMin < s.c) return "agora";
      if (offset === 0 && s.c <= s.o && (nowMin >= s.o || nowMin < s.c)) return "agora";
      if (s.o >= nowMin || offset > 0) {
        const dayLabel = offset === 0 ? "hoje" : offset === 1 ? "amanhã" : WEEKDAYS.find((w) => w.key === wd)?.long ?? "";
        const dateLabel = `${parts.day}/${parts.month}`;
        return `${dayLabel} (${dateLabel}) às ${s.open}`;
      }
    }
  }
  return null;
}

// Resolve which weekly schedule applies to a channel: use channel override if defined, else default.
export function weekForChannel(base: WeeklyHours, channels: ChannelHours, channel?: ChannelKey): WeeklyHours {
  if (!channel) return base;
  return channels[channel] ?? base;
}

// -----------------------------------------------------------------------------
// Shared gate: single source of truth used by BOTH the checkout and the
// simulator so results never diverge. Accepts raw establishment fields.
// -----------------------------------------------------------------------------
export type EstablishmentHoursSource = {
  business_hours?: unknown;
  channel_hours?: unknown;
  special_hours?: unknown;
  hours_timezone?: string | null;
};

export type GateResult = {
  channel: ChannelKey;
  timezone: string;
  configured: boolean; // whether there is any slot in the effective week
  open: boolean;
  blocked: boolean; // configured && !open
  next: string | null; // next opening label (when blocked)
  effectiveWeek: WeeklyHours;
  usingChannelOverride: boolean;
  specials: SpecialDay[];
};

export function evaluateHoursGate(
  when: Date,
  source: EstablishmentHoursSource,
  channel: ChannelKey,
): GateResult {
  const baseWeek = normalizeWeek(source.business_hours);
  const channels = normalizeChannelHours(source.channel_hours);
  const specials = normalizeSpecial(source.special_hours);
  const tz = source.hours_timezone || "America/Sao_Paulo";
  const usingChannelOverride = !!channels[channel];
  const effectiveWeek = weekForChannel(baseWeek, channels, channel);
  const configured = Object.values(effectiveWeek).some((d) => !d.closed && d.slots.length > 0);
  const open = configured ? isOpenAt(when, effectiveWeek, specials, tz) : true;
  const blocked = configured && !open;
  const next = blocked ? nextOpeningLabel(when, effectiveWeek, specials, tz) : null;
  return { channel, timezone: tz, configured, open, blocked, next, effectiveWeek, usingChannelOverride, specials };
}

export const CHANNEL_FROM_ORDER_TYPE: Record<string, ChannelKey> = {
  entrega: "delivery",
  retirada: "pickup",
  local: "dine_in",
};