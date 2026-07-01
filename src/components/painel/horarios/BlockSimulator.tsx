import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, MessageCircleOff, MessageCircle } from "lucide-react";
import {
  weekForChannel,
  isOpenAt,
  nextOpeningLabel,
  CHANNEL_LABELS,
  type WeeklyHours,
  type ChannelHours,
  type ChannelKey,
  type SpecialDay,
} from "@/lib/businessHours";

const CHANNELS: ChannelKey[] = ["delivery", "pickup", "dine_in"];

function hasAnySlots(week: WeeklyHours): boolean {
  return Object.values(week).some((d) => !d.closed && d.slots.length > 0);
}

export function BlockSimulator({
  week,
  channelHours,
  special,
  timezone,
}: {
  week: WeeklyHours;
  channelHours: ChannelHours;
  special: SpecialDay[];
  timezone: string;
}) {
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);

  const results = useMemo(() => {
    const d = new Date(`${date}T${time}:00`);
    if (Number.isNaN(d.getTime())) return null;
    return CHANNELS.map((ch) => {
      const w = weekForChannel(week, channelHours, ch);
      const configured = hasAnySlots(w);
      const open = configured ? isOpenAt(d, w, special, timezone) : true;
      const blocked = configured && !open;
      const next = blocked ? nextOpeningLabel(d, w, special, timezone) : null;
      return { channel: ch, configured, open, blocked, next };
    });
  }, [date, time, week, channelHours, special, timezone]);

  return (
    <Card className="border-amber-500/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          <h3 className="font-medium">Simular bloqueio do WhatsApp por canal</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Testa se um pedido nesta data/hora seria bloqueado antes de abrir o WhatsApp, usando o horário do canal (com fallback para o padrão).
        </p>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />
        </div>
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
      </CardContent>
    </Card>
  );
}