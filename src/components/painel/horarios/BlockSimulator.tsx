import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FlaskConical,
  MessageCircleOff,
  MessageCircle,
  Bug,
  Bookmark,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  Share2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  evaluateHoursGate,
  matchSpecialForDate,
  CHANNEL_LABELS,
  type WeeklyHours,
  type ChannelHours,
  type ChannelKey,
  type SpecialDay,
} from "@/lib/businessHours";

const CHANNELS: ChannelKey[] = ["delivery", "pickup", "dine_in"];

function weekdayInTz(date: Date, tz: string): { key: string; long: string } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(date);
  const shortMap: Record<string, { key: string; long: string }> = {
    Sunday: { key: "0", long: "Domingo" }, Monday: { key: "1", long: "Segunda" },
    Tuesday: { key: "2", long: "Terça" }, Wednesday: { key: "3", long: "Quarta" },
    Thursday: { key: "4", long: "Quinta" }, Friday: { key: "5", long: "Sexta" },
    Saturday: { key: "6", long: "Sábado" },
  };
  return shortMap[parts] ?? { key: "0", long: parts };
}

function isoInTz(date: Date, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((a, x) => { a[x.type] = x.value; return a; }, {});
  return `${p.year}-${p.month}-${p.day}`;
}

type Scenario = { id: string; label: string; date: string; time: string };

function scenariosKey(establishmentId?: string) {
  return `hours-scenarios:${establishmentId ?? "default"}`;
}

export function BlockSimulator({
  week,
  channelHours,
  special,
  timezone,
  timezones,
  onTimezoneChange,
  establishmentId,
}: {
  week: WeeklyHours;
  channelHours: ChannelHours;
  special: SpecialDay[];
  timezone: string;
  timezones: string[];
  onTimezoneChange: (tz: string) => void;
  establishmentId?: string;
}) {
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  const [debugOpen, setDebugOpen] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioLabel, setScenarioLabel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(scenariosKey(establishmentId));
      setScenarios(raw ? JSON.parse(raw) : []);
    } catch { setScenarios([]); }
  }, [establishmentId]);

  const persistScenarios = (list: Scenario[]) => {
    setScenarios(list);
    try { localStorage.setItem(scenariosKey(establishmentId), JSON.stringify(list)); } catch {}
  };

  const saveScenario = () => {
    const label = scenarioLabel.trim() || `${date.split("-").reverse().join("/")} ${time}`;
    persistScenarios([{ id: crypto.randomUUID(), label, date, time }, ...scenarios].slice(0, 20));
    setScenarioLabel("");
    toast.success("Cenário salvo");
  };
  const applyScenario = (s: Scenario) => { setDate(s.date); setTime(s.time); };
  const removeScenario = (id: string) => persistScenarios(scenarios.filter((s) => s.id !== id));

  const testDate = useMemo(() => {
    const d = new Date(`${date}T${time}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [date, time]);

  const results = useMemo(() => {
    if (!testDate) return null;
    return CHANNELS.map((ch) => {
      const usingOverride = !!channelHours[ch];
      const w = weekForChannel(week, channelHours, ch);
      const configured = hasAnySlots(w);
      const open = configured ? isOpenAt(testDate, w, special, timezone) : true;
      const blocked = configured && !open;
      const next = blocked ? nextOpeningLabel(testDate, w, special, timezone) : null;
      const wd = weekdayInTz(testDate, timezone);
      const iso = isoInTz(testDate, timezone);
      const sp = matchSpecialForDate(iso, special);
      const dayCfg = sp ? { closed: sp.closed, slots: sp.slots } : w[wd.key];
      return { channel: ch, usingOverride, configured, open, blocked, next, weekday: wd, iso, special: sp, dayCfg };
    });
  }, [testDate, week, channelHours, special, timezone]);

  const dateTz = testDate ? isoInTz(testDate, timezone) : "";

  return (
    <Card className="border-amber-500/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            <h3 className="font-medium">Simular bloqueio do WhatsApp por canal</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fuso:</span>
            <Select value={timezone} onValueChange={onTimezoneChange}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{timezones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Testa se um pedido nesta data/hora seria bloqueado antes de abrir o WhatsApp, usando o horário do canal (com fallback para o padrão).
          O fuso acima é o mesmo aplicado no checkout — mudanças aqui refletem também no calendário.
        </p>

        <div className="flex flex-wrap gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />
          <div className="flex items-center gap-1 ml-auto">
            <Input placeholder="Rótulo do cenário (opcional)" value={scenarioLabel}
              onChange={(e) => setScenarioLabel(e.target.value)} className="w-56 h-9" />
            <Button size="sm" variant="secondary" onClick={saveScenario}>
              <Bookmark className="h-3.5 w-3.5 mr-1" /> Salvar cenário
            </Button>
          </div>
        </div>

        {/* Cenários salvos */}
        {scenarios.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {scenarios.map((s) => (
              <div key={s.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                <button className="hover:underline flex items-center gap-1" onClick={() => applyScenario(s)}>
                  <Play className="h-3 w-3" /> {s.label}
                </button>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => removeScenario(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Resultado por canal */}
        <div className="grid gap-2 sm:grid-cols-3">
          {results?.map((r) => (
            <div key={r.channel} className="rounded-md border p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{CHANNEL_LABELS[r.channel]}</span>
                {r.blocked ? (
                  <Badge variant="destructive" className="gap-1"><MessageCircleOff className="h-3 w-3" />Bloqueado</Badge>
                ) : (
                  <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><MessageCircle className="h-3 w-3" />Liberado</Badge>
                )}
              </div>
              {!r.configured && (
                <p className="text-xs text-muted-foreground">Sem horário configurado — sempre liberado.</p>
              )}
              {r.blocked && r.next && (
                <p className="text-xs text-muted-foreground">Próximo horário: <strong className="text-foreground">{r.next}</strong></p>
              )}
            </div>
          ))}
        </div>

        {/* Painel de depuração */}
        <div className="rounded-md border">
          <button
            onClick={() => setDebugOpen((x) => !x)}
            className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50"
          >
            <span className="flex items-center gap-2"><Bug className="h-4 w-4 text-primary" /> Regra aplicada (debug)</span>
            {debugOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {debugOpen && results && (
            <div className="border-t p-3 space-y-3 text-xs">
              <div className="text-muted-foreground">
                Instante testado: <strong className="text-foreground">{date.split("-").reverse().join("/")} {time}</strong>
                {" · "}Resolvido no fuso <strong className="text-foreground">{timezone}</strong> como <strong className="text-foreground">{dateTz}</strong>
              </div>
              {results.map((r) => (
                <div key={r.channel} className="rounded border p-2 space-y-1">
                  <div className="font-medium text-sm">{CHANNEL_LABELS[r.channel]}</div>
                  <div>
                    <span className="text-muted-foreground">Fonte do horário: </span>
                    <span>{r.usingOverride ? "Horário próprio do canal" : "Horário padrão (fallback)"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dia da semana: </span>
                    <span>{r.weekday.long}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exceção/feriado aplicado: </span>
                    {r.special ? (
                      <span>
                        <strong>{r.special.label || r.special.date}</strong>
                        {r.special.recurrence && r.special.recurrence !== "none" && (
                          <> · recorrência {r.special.recurrence === "yearly" ? "anual" : "mensal"}</>
                        )}
                        {r.special.enabled === false && " · inativo"}
                      </span>
                    ) : (
                      <span>Nenhum</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Faixas do dia: </span>
                    <span>
                      {r.dayCfg && !r.dayCfg.closed && r.dayCfg.slots.length > 0
                        ? r.dayCfg.slots.map((s) => `${s.open}-${s.close}`).join(", ")
                        : "Fechado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resultado: </span>
                    {!r.configured ? (
                      <span>Nenhuma faixa em nenhum dia → sempre liberado.</span>
                    ) : r.blocked ? (
                      <span className="text-destructive">
                        Bloqueado — hora testada está fora das faixas.
                        {r.next && <> Próxima abertura: <strong>{r.next}</strong>.</>}
                      </span>
                    ) : (
                      <span className="text-emerald-600">Liberado — hora testada cai dentro de uma faixa.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}