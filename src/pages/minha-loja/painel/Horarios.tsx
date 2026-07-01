import { useEffect, useMemo, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Copy, CalendarPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  WEEKDAYS,
  emptyWeek,
  normalizeWeek,
  normalizeSpecial,
  summarizeWeek,
  validateWeek,
  isOpenAt,
  type WeeklyHours,
  type SpecialDay,
  type TimeSlot,
} from "@/lib/businessHours";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Rio_Branco",
  "America/Noronha",
];

export default function Horarios() {
  const { ctx } = useActiveEstablishment();
  const [week, setWeek] = useState<WeeklyHours>(emptyWeek());
  const [special, setSpecial] = useState<SpecialDay[]>([]);
  const [timezone, setTimezone] = useState<string>("America/Sao_Paulo");
  const [autoOpen, setAutoOpen] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ctx) return;
    setLoading(true);
    supabase
      .from("establishments")
      .select("business_hours,special_hours,hours_timezone,auto_open_now,open_now")
      .eq("id", ctx.establishmentId)
      .maybeSingle()
      .then(({ data }) => {
        setWeek(normalizeWeek(data?.business_hours));
        setSpecial(normalizeSpecial(data?.special_hours));
        setTimezone(data?.hours_timezone || "America/Sao_Paulo");
        setAutoOpen(!!data?.auto_open_now);
        setOpenNow(!!data?.open_now);
        setLoading(false);
      });
    supabase
      .from("establishment_delivery_settings")
      .select("*")
      .eq("establishment_id", ctx.establishmentId)
      .maybeSingle()
      .then(({ data }) =>
        setSettings(data ?? { delivery_available: true, pickup_available: true, dine_in_available: false }),
      );
  }, [ctx?.establishmentId]);

  const errors = useMemo(() => validateWeek(week), [week]);
  const errorByDay = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const e of errors) (map[e.day] ??= []).push(e.message);
    return map;
  }, [errors]);
  const summary = useMemo(() => summarizeWeek(week), [week]);
  const computedOpen = useMemo(
    () => isOpenAt(new Date(), week, special, timezone),
    [week, special, timezone],
  );

  if (!ctx) return null;

  const updateDay = (dayKey: string, patch: Partial<{ closed: boolean; slots: TimeSlot[] }>) =>
    setWeek((prev) => ({ ...prev, [dayKey]: { ...prev[dayKey], ...patch } }));

  const addSlot = (dayKey: string) => {
    const cfg = week[dayKey];
    const defaults: TimeSlot = cfg.slots.length ? { open: "18:00", close: "23:00" } : { open: "09:00", close: "18:00" };
    updateDay(dayKey, { closed: false, slots: [...cfg.slots, defaults] });
  };

  const updateSlot = (dayKey: string, idx: number, patch: Partial<TimeSlot>) => {
    const slots = week[dayKey].slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updateDay(dayKey, { slots });
  };

  const removeSlot = (dayKey: string, idx: number) => {
    const slots = week[dayKey].slots.filter((_, i) => i !== idx);
    updateDay(dayKey, { slots, closed: slots.length === 0 });
  };

  const copyToAllWeekdays = (dayKey: string) => {
    const src = week[dayKey];
    const next = { ...week };
    for (const d of WEEKDAYS) {
      if (["1", "2", "3", "4", "5"].includes(d.key)) next[d.key] = { closed: src.closed, slots: src.slots.map((s) => ({ ...s })) };
    }
    setWeek(next);
    toast.success("Aplicado a Seg-Sex");
  };

  const copyToAll = (dayKey: string) => {
    const src = week[dayKey];
    const next = { ...week };
    for (const d of WEEKDAYS) next[d.key] = { closed: src.closed, slots: src.slots.map((s) => ({ ...s })) };
    setWeek(next);
    toast.success("Aplicado a todos os dias");
  };

  const applyPreset = (preset: "comercial" | "restaurante" | "24h" | "fds") => {
    const w = emptyWeek();
    if (preset === "comercial") {
      for (const k of ["1", "2", "3", "4", "5"]) w[k] = { closed: false, slots: [{ open: "09:00", close: "18:00" }] };
    } else if (preset === "restaurante") {
      for (const k of ["2", "3", "4", "5", "6"])
        w[k] = { closed: false, slots: [{ open: "11:00", close: "15:00" }, { open: "18:00", close: "23:00" }] };
      w["0"] = { closed: false, slots: [{ open: "11:00", close: "16:00" }] };
    } else if (preset === "24h") {
      for (const d of WEEKDAYS) w[d.key] = { closed: false, slots: [{ open: "00:00", close: "23:59" }] };
    } else if (preset === "fds") {
      for (const k of ["5", "6"]) w[k] = { closed: false, slots: [{ open: "18:00", close: "23:00" }] };
      w["0"] = { closed: false, slots: [{ open: "12:00", close: "18:00" }] };
    }
    setWeek(w);
    toast.success("Modelo aplicado");
  };

  const addSpecial = () => {
    const today = new Date().toISOString().slice(0, 10);
    setSpecial((prev) => [...prev, { date: today, label: "", closed: true, slots: [] }]);
  };

  const save = async () => {
    if (errors.length > 0) {
      toast.error("Corrija os erros de horário antes de salvar");
      return;
    }
    setSaving(true);
    const effectiveOpen = autoOpen ? computedOpen : openNow;
    const { error } = await supabase
      .from("establishments")
      .update({
        business_hours: week as any,
        special_hours: special as any,
        hours_timezone: timezone,
        auto_open_now: autoOpen,
        open_now: effectiveOpen,
        hours: summary,
      })
      .eq("id", ctx.establishmentId);
    if (settings) {
      await supabase.from("establishment_delivery_settings").upsert(
        {
          establishment_id: ctx.establishmentId,
          delivery_available: !!settings.delivery_available,
          pickup_available: !!settings.pickup_available,
          dine_in_available: !!settings.dine_in_available,
        },
        { onConflict: "establishment_id" },
      );
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Horários salvos");
  };

  if (loading) return <PainelSection title="Horários e atendimento"><p className="text-sm text-muted-foreground">Carregando…</p></PainelSection>;

  return (
    <PainelSection
      title="Horários e atendimento"
      subtitle="Configure semanas, feriados, fuso horário e canais de atendimento"
    >
      <div className="space-y-6">
        {/* Status atual + preview */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={computedOpen ? "default" : "secondary"} className={computedOpen ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                {computedOpen ? "Aberto agora" : "Fechado agora"}
              </Badge>
              <span className="text-sm text-muted-foreground">segundo o horário configurado ({timezone})</span>
            </div>
            <div className="text-xs text-muted-foreground max-w-md text-right">
              <strong className="text-foreground">Resumo:</strong> {summary}
            </div>
          </CardContent>
        </Card>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Modelos rápidos:</span>
          <Button size="sm" variant="outline" onClick={() => applyPreset("comercial")}>Comercial (Seg-Sex 9-18)</Button>
          <Button size="sm" variant="outline" onClick={() => applyPreset("restaurante")}>Restaurante (2 turnos)</Button>
          <Button size="sm" variant="outline" onClick={() => applyPreset("fds")}>Final de semana</Button>
          <Button size="sm" variant="outline" onClick={() => applyPreset("24h")}>24 horas</Button>
        </div>

        {/* Semana */}
        <div className="space-y-3">
          {WEEKDAYS.map((d) => {
            const cfg = week[d.key];
            const dayErrors = errorByDay[d.key] ?? [];
            return (
              <Card key={d.key} className={dayErrors.length ? "border-destructive/60" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-28 font-medium">{d.long}</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!cfg.closed}
                          onCheckedChange={(v) => updateDay(d.key, { closed: !v, slots: v && cfg.slots.length === 0 ? [{ open: "09:00", close: "18:00" }] : cfg.slots })}
                        />
                        <span className="text-sm text-muted-foreground">{cfg.closed ? "Fechado" : "Aberto"}</span>
                      </div>
                    </div>
                    {!cfg.closed && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => copyToAllWeekdays(d.key)} title="Aplicar a Seg-Sex">
                          <Copy className="h-3.5 w-3.5 mr-1" /> Seg-Sex
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => copyToAll(d.key)} title="Aplicar a todos">
                          <Copy className="h-3.5 w-3.5 mr-1" /> Todos
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => addSlot(d.key)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Faixa
                        </Button>
                      </div>
                    )}
                  </div>

                  {!cfg.closed && (
                    <div className="space-y-2 pl-1">
                      {cfg.slots.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhuma faixa configurada. Clique em "Faixa" para adicionar.</p>
                      )}
                      {cfg.slots.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="time"
                            value={s.open}
                            onChange={(e) => updateSlot(d.key, i, { open: e.target.value })}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">até</span>
                          <Input
                            type="time"
                            value={s.close}
                            onChange={(e) => updateSlot(d.key, i, { close: e.target.value })}
                            className="w-32"
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeSlot(d.key, i)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      {dayErrors.length > 0 && (
                        <Alert variant="destructive" className="py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">{Array.from(new Set(dayErrors)).join(" · ")}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator />

        {/* Datas especiais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Datas especiais e feriados</h3>
              <p className="text-xs text-muted-foreground">Sobrescreve o horário semanal em datas específicas.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addSpecial}>
              <CalendarPlus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          {special.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma data cadastrada.</p>}
          {special.map((sp, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={sp.date}
                    onChange={(e) => setSpecial((prev) => prev.map((x, i) => (i === idx ? { ...x, date: e.target.value } : x)))}
                    className="w-44"
                  />
                  <Input
                    placeholder="Descrição (ex: Natal)"
                    value={sp.label ?? ""}
                    onChange={(e) => setSpecial((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                    className="flex-1 min-w-[180px]"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!sp.closed}
                      onCheckedChange={(v) =>
                        setSpecial((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, closed: !v, slots: v && x.slots.length === 0 ? [{ open: "09:00", close: "18:00" }] : x.slots } : x,
                          ),
                        )
                      }
                    />
                    <span className="text-sm">{sp.closed ? "Fechado" : "Aberto"}</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setSpecial((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                {!sp.closed && (
                  <div className="space-y-2 pl-1">
                    {sp.slots.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="time"
                          value={s.open}
                          onChange={(e) =>
                            setSpecial((prev) =>
                              prev.map((x, j) =>
                                j === idx ? { ...x, slots: x.slots.map((y, k) => (k === i ? { ...y, open: e.target.value } : y)) } : x,
                              ),
                            )
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={s.close}
                          onChange={(e) =>
                            setSpecial((prev) =>
                              prev.map((x, j) =>
                                j === idx ? { ...x, slots: x.slots.map((y, k) => (k === i ? { ...y, close: e.target.value } : y)) } : x,
                              ),
                            )
                          }
                          className="w-32"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setSpecial((prev) =>
                              prev.map((x, j) => (j === idx ? { ...x, slots: x.slots.filter((_, k) => k !== i) } : x)),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSpecial((prev) =>
                          prev.map((x, j) => (j === idx ? { ...x, slots: [...x.slots, { open: "09:00", close: "18:00" }] } : x)),
                        )
                      }
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Faixa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Preferências gerais */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Fuso horário</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status "Aberto agora"</Label>
            <div className="flex items-center gap-2">
              <Switch checked={autoOpen} onCheckedChange={setAutoOpen} />
              <span className="text-sm">Calcular automaticamente pelo horário configurado</span>
            </div>
            {!autoOpen && (
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={openNow} onCheckedChange={setOpenNow} />
                <span className="text-sm text-muted-foreground">Forçar {openNow ? "aberto" : "fechado"}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Canais */}
        {settings && (
          <div className="space-y-2">
            <h3 className="font-medium">Canais de atendimento</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-md border p-3">
                <Switch checked={!!settings.delivery_available} onCheckedChange={(v) => setSettings({ ...settings, delivery_available: v })} />
                <span className="text-sm">Entrega</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border p-3">
                <Switch checked={!!settings.pickup_available} onCheckedChange={(v) => setSettings({ ...settings, pickup_available: v })} />
                <span className="text-sm">Retirada</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border p-3">
                <Switch checked={!!settings.dine_in_available} onCheckedChange={(v) => setSettings({ ...settings, dine_in_available: v })} />
                <span className="text-sm">Comer no local</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-3 -mx-2 px-2 border-t">
          {errors.length > 0 && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.length} erro(s) a corrigir
            </span>
          )}
          <Button onClick={save} disabled={saving || errors.length > 0}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
        </div>
      </div>
    </PainelSection>
  );
}
