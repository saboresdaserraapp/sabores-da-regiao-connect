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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, CalendarPlus, AlertCircle, Bookmark, PlayCircle, CalendarRange } from "lucide-react";
import { BlockSimulator } from "@/components/painel/horarios/BlockSimulator";
import { HoursCalendar } from "@/components/painel/horarios/HoursCalendar";
import { toast } from "sonner";
import {
  WEEKDAYS,
  emptyWeek,
  normalizeWeek,
  normalizeSpecial,
  normalizeChannelHours,
  summarizeWeek,
  validateWeek,
  isOpenAt,
  nextOpeningLabel,
  weekForChannel,
  CHANNEL_LABELS,
  type WeeklyHours,
  type SpecialDay,
  type TimeSlot,
  type ChannelHours,
  type ChannelKey,
  type SpecialRecurrence,
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

type ChannelTab = "default" | ChannelKey;

type HoursTemplate = {
  id: string;
  name: string;
  week: unknown;
  channel_hours: unknown;
  special_hours: unknown;
};

export default function Horarios() {
  const { ctx } = useActiveEstablishment();
  const [week, setWeek] = useState<WeeklyHours>(emptyWeek());
  const [channelHours, setChannelHours] = useState<ChannelHours>({});
  const [special, setSpecial] = useState<SpecialDay[]>([]);
  const [timezone, setTimezone] = useState<string>("America/Sao_Paulo");
  const [autoOpen, setAutoOpen] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelTab>("default");
  const [templates, setTemplates] = useState<HoursTemplate[]>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [previewDate, setPreviewDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [previewTime, setPreviewTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [previewChannel, setPreviewChannel] = useState<ChannelTab>("default");
  // Copy-special-to-other-dates dialog state
  const [copySpecialIdx, setCopySpecialIdx] = useState<number | null>(null);
  const [copyTargetDates, setCopyTargetDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ctx) return;
    setLoading(true);
    supabase
      .from("establishments")
      .select("business_hours,special_hours,hours_timezone,auto_open_now,open_now,channel_hours")
      .eq("id", ctx.establishmentId)
      .maybeSingle()
      .then(({ data }) => {
        setWeek(normalizeWeek(data?.business_hours));
        setChannelHours(normalizeChannelHours((data as any)?.channel_hours));
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
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.establishmentId]);

  const loadTemplates = async () => {
    const { data } = await (supabase as any).from("hours_templates").select("*").order("created_at", { ascending: false });
    setTemplates((data ?? []) as HoursTemplate[]);
  };

  const activeWeek: WeeklyHours = useMemo(() => {
    if (activeChannel === "default") return week;
    return channelHours[activeChannel] ?? week;
  }, [activeChannel, week, channelHours]);
  const channelOverrideEnabled = activeChannel !== "default" && !!channelHours[activeChannel as ChannelKey];

  const errors = useMemo(() => validateWeek(activeWeek), [activeWeek]);
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

  const previewResult = useMemo(() => {
    if (!previewDate || !previewTime) return null;
    const iso = `${previewDate}T${previewTime}:00`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const w = previewChannel === "default" ? week : weekForChannel(week, channelHours, previewChannel as ChannelKey);
    const open = isOpenAt(d, w, special, timezone);
    const next = nextOpeningLabel(d, w, special, timezone);
    return { open, next };
  }, [previewDate, previewTime, previewChannel, week, channelHours, special, timezone]);

  if (!ctx) return null;

  const setActiveWeek = (mut: (w: WeeklyHours) => WeeklyHours) => {
    if (activeChannel === "default") {
      setWeek((prev) => mut(prev));
    } else {
      const key = activeChannel as ChannelKey;
      setChannelHours((prev) => ({ ...prev, [key]: mut(prev[key] ?? week) }));
    }
  };

  const updateDay = (dayKey: string, patch: Partial<{ closed: boolean; slots: TimeSlot[] }>) =>
    setActiveWeek((w) => ({ ...w, [dayKey]: { ...w[dayKey], ...patch } }));

  const addSlot = (dayKey: string) => {
    const cfg = activeWeek[dayKey];
    const defaults: TimeSlot = cfg.slots.length ? { open: "18:00", close: "23:00" } : { open: "09:00", close: "18:00" };
    updateDay(dayKey, { closed: false, slots: [...cfg.slots, defaults] });
  };

  const updateSlot = (dayKey: string, idx: number, patch: Partial<TimeSlot>) => {
    const slots = activeWeek[dayKey].slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updateDay(dayKey, { slots });
  };

  const removeSlot = (dayKey: string, idx: number) => {
    const slots = activeWeek[dayKey].slots.filter((_, i) => i !== idx);
    updateDay(dayKey, { slots, closed: slots.length === 0 });
  };

  const copyToAllWeekdays = (dayKey: string) => {
    setActiveWeek((w) => {
      const src = w[dayKey];
      const next = { ...w };
      for (const d of WEEKDAYS) {
        if (["1", "2", "3", "4", "5"].includes(d.key)) next[d.key] = { closed: src.closed, slots: src.slots.map((s) => ({ ...s })) };
      }
      return next;
    });
    toast.success("Aplicado a Seg-Sex");
  };

  const copyToAll = (dayKey: string) => {
    setActiveWeek((w) => {
      const src = w[dayKey];
      const next = { ...w };
      for (const d of WEEKDAYS) next[d.key] = { closed: src.closed, slots: src.slots.map((s) => ({ ...s })) };
      return next;
    });
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
    setActiveWeek(() => w);
    toast.success("Modelo aplicado");
  };

  const toggleChannelOverride = (enabled: boolean) => {
    if (activeChannel === "default") return;
    const key = activeChannel as ChannelKey;
    setChannelHours((prev) => {
      const next = { ...prev };
      if (enabled) next[key] = normalizeWeek(prev[key] ?? week);
      else delete next[key];
      return next;
    });
  };

  const addSpecial = () => {
    const today = new Date().toISOString().slice(0, 10);
    setSpecial((prev) => [
      ...prev,
      { date: today, label: "", closed: true, slots: [], recurrence: "none", enabled: true },
    ]);
  };

  const openCopySpecial = (idx: number) => {
    setCopySpecialIdx(idx);
    setCopyTargetDates(new Set());
  };
  const daysInMonth = (isoDate: string): string[] => {
    const [y, m] = isoDate.split("-").map(Number);
    if (!y || !m) return [];
    const last = new Date(y, m, 0).getDate();
    const yy = String(y).padStart(4, "0");
    const mm = String(m).padStart(2, "0");
    return Array.from({ length: last }, (_, i) => `${yy}-${mm}-${String(i + 1).padStart(2, "0")}`);
  };
  const confirmCopySpecial = () => {
    if (copySpecialIdx === null) return;
    const src = special[copySpecialIdx];
    if (!src) return;
    const existing = new Set(special.map((s) => `${s.date}|${s.recurrence ?? "none"}`));
    const additions: SpecialDay[] = [];
    for (const d of copyTargetDates) {
      if (d === src.date) continue;
      const key = `${d}|${src.recurrence ?? "none"}`;
      if (existing.has(key)) continue;
      additions.push({
        date: d,
        label: src.label,
        closed: src.closed,
        slots: src.slots.map((s) => ({ ...s })),
        recurrence: src.recurrence ?? "none",
        enabled: src.enabled !== false,
      });
    }
    if (additions.length === 0) {
      toast.error("Selecione ao menos uma nova data");
      return;
    }
    setSpecial((prev) => [...prev, ...additions]);
    toast.success(`${additions.length} data(s) criadas com as mesmas faixas`);
    setCopySpecialIdx(null);
    setCopyTargetDates(new Set());
  };

  // Templates
  const openSaveTemplate = () => {
    setTemplateName("");
    setSaveTemplateOpen(true);
  };
  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) { toast.error("Dê um nome ao modelo"); return; }
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { toast.error("Faça login novamente"); return; }
    const { error } = await (supabase as any).from("hours_templates").insert({
      user_id: user.id,
      name,
      week,
      channel_hours: channelHours,
      special_hours: special,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Modelo salvo");
    setSaveTemplateOpen(false);
    void loadTemplates();
  };
  const applyTemplate = (t: HoursTemplate, mode: "full" | "week" | "channels" | "special") => {
    if (mode === "full" || mode === "week") setWeek(normalizeWeek(t.week));
    if (mode === "full" || mode === "channels") setChannelHours(normalizeChannelHours(t.channel_hours));
    if (mode === "full" || mode === "special") setSpecial(normalizeSpecial(t.special_hours));
    toast.success(`Modelo "${t.name}" aplicado`);
  };
  const deleteTemplate = async (id: string) => {
    const { error } = await (supabase as any).from("hours_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Modelo removido");
    void loadTemplates();
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
        channel_hours: channelHours as any,
        special_hours: special as any,
        hours_timezone: timezone,
        auto_open_now: autoOpen,
        open_now: effectiveOpen,
        hours: summary,
      } as any)
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
      subtitle="Configure semanas por canal, feriados recorrentes, modelos reutilizáveis e teste 'aberto em' antes de salvar."
    >
      <div className="space-y-6">
        {/* Status atual */}
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

        {/* Tabs por canal */}
        <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelTab)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="default">Padrão</TabsTrigger>
            <TabsTrigger value="delivery">Entrega{channelHours.delivery ? " •" : ""}</TabsTrigger>
            <TabsTrigger value="pickup">Retirada{channelHours.pickup ? " •" : ""}</TabsTrigger>
            <TabsTrigger value="dine_in">Comer no local{channelHours.dine_in ? " •" : ""}</TabsTrigger>
          </TabsList>

          {(["default", "delivery", "pickup", "dine_in"] as ChannelTab[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
              {tab !== "default" && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{CHANNEL_LABELS[tab as ChannelKey]} usa horário próprio?</p>
                      <p className="text-xs text-muted-foreground">
                        Desligado: segue o horário padrão. Ligado: define faixas exclusivas para este canal.
                      </p>
                    </div>
                    <Switch checked={channelOverrideEnabled} onCheckedChange={toggleChannelOverride} />
                  </CardContent>
                </Card>
              )}

              {(tab === "default" || channelOverrideEnabled) && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground self-center">Modelos rápidos:</span>
                    <Button size="sm" variant="outline" onClick={() => applyPreset("comercial")}>Comercial (Seg-Sex 9-18)</Button>
                    <Button size="sm" variant="outline" onClick={() => applyPreset("restaurante")}>Restaurante (2 turnos)</Button>
                    <Button size="sm" variant="outline" onClick={() => applyPreset("fds")}>Final de semana</Button>
                    <Button size="sm" variant="outline" onClick={() => applyPreset("24h")}>24 horas</Button>
                    <Button size="sm" variant="secondary" onClick={openSaveTemplate}>
                      <Bookmark className="h-3.5 w-3.5 mr-1" /> Salvar como modelo
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {WEEKDAYS.map((d) => {
                      const cfg = activeWeek[d.key];
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
                                  <Button size="sm" variant="ghost" onClick={() => copyToAllWeekdays(d.key)}>
                                    <Copy className="h-3.5 w-3.5 mr-1" /> Seg-Sex
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => copyToAll(d.key)}>
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
                                    <Input type="time" value={s.open} onChange={(e) => updateSlot(d.key, i, { open: e.target.value })} className="w-32" />
                                    <span className="text-muted-foreground">até</span>
                                    <Input type="time" value={s.close} onChange={(e) => updateSlot(d.key, i, { close: e.target.value })} className="w-32" />
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
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <Separator />

        {/* Modelos salvos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Modelos salvos</h3>
              <p className="text-xs text-muted-foreground">Reaplique em outros dias ou estabelecimentos com um clique.</p>
            </div>
            <Button size="sm" variant="outline" onClick={openSaveTemplate}>
              <Bookmark className="h-4 w-4 mr-1" /> Salvar atual
            </Button>
          </div>
          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum modelo salvo ainda.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{summarizeWeek(normalizeWeek(t.week))}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select onValueChange={(v) => applyTemplate(t, v as any)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Aplicar…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Tudo</SelectItem>
                          <SelectItem value="week">Só semana</SelectItem>
                          <SelectItem value="channels">Só canais</SelectItem>
                          <SelectItem value="special">Só feriados</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Datas especiais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Datas especiais e feriados</h3>
              <p className="text-xs text-muted-foreground">Sobrescreve o horário semanal. Suporta recorrência anual ou mensal.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addSpecial}>
              <CalendarPlus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          {special.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma data cadastrada.</p>}
          {special.map((sp, idx) => (
            <Card key={idx} className={sp.enabled === false ? "opacity-60" : ""}>
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
                  <Select
                    value={sp.recurrence ?? "none"}
                    onValueChange={(v) =>
                      setSpecial((prev) => prev.map((x, i) => (i === idx ? { ...x, recurrence: v as SpecialRecurrence } : x)))
                    }
                  >
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Data única</SelectItem>
                      <SelectItem value="yearly">Todo ano</SelectItem>
                      <SelectItem value="monthly">Todo mês</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2" title="Ativar/desativar rapidamente">
                    <Switch
                      checked={sp.enabled !== false}
                      onCheckedChange={(v) =>
                        setSpecial((prev) => prev.map((x, i) => (i === idx ? { ...x, enabled: v } : x)))
                      }
                    />
                    <span className="text-xs text-muted-foreground">{sp.enabled === false ? "Inativo" : "Ativo"}</span>
                  </div>
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
                  <Button size="sm" variant="ghost" onClick={() => openCopySpecial(idx)} title="Copiar esta exceção para outras datas do mês">
                    <CalendarRange className="h-4 w-4 mr-1" /> Copiar
                  </Button>
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

        {/* Prévia "aberto em..." */}
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Testar status "aberto em..."</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} className="w-44" />
              <Input type="time" value={previewTime} onChange={(e) => setPreviewTime(e.target.value)} className="w-32" />
              <Select value={previewChannel} onValueChange={(v) => setPreviewChannel(v as ChannelTab)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Horário padrão</SelectItem>
                  <SelectItem value="delivery">Entrega</SelectItem>
                  <SelectItem value="pickup">Retirada</SelectItem>
                  <SelectItem value="dine_in">Comer no local</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {previewResult && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge className={previewResult.open ? "bg-emerald-600 hover:bg-emerald-600" : ""} variant={previewResult.open ? "default" : "secondary"}>
                  {previewResult.open ? "Aberto" : "Fechado"}
                </Badge>
                <span className="text-muted-foreground">
                  em {previewDate.split("-").reverse().join("/")} às {previewTime} ({timezone})
                </span>
                {!previewResult.open && previewResult.next && (
                  <span className="text-xs text-muted-foreground">· Próxima abertura: <strong>{previewResult.next}</strong></span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simulador de bloqueio por canal */}
        <BlockSimulator
          week={week}
          channelHours={channelHours}
          special={special}
          timezone={timezone}
          timezones={TIMEZONES}
          onTimezoneChange={setTimezone}
          establishmentId={ctx.establishmentId}
        />

        {/* Calendário mensal por canal */}
        <HoursCalendar
          week={week}
          channelHours={channelHours}
          special={special}
          timezone={timezone}
          timezones={TIMEZONES}
          onTimezoneChange={setTimezone}
          establishmentName={ctx.establishmentName}
        />

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

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar horários como modelo</DialogTitle>
            <DialogDescription>Reaplique depois neste ou em outros estabelecimentos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex: Padrão restaurante" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveTemplateOpen(false)}>Cancelar</Button>
            <Button onClick={saveAsTemplate}>Salvar modelo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PainelSection>
  );
}