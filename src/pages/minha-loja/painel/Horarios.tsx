import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Horarios() {
  const { ctx } = useActiveEstablishment();
  const [hours, setHours] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!ctx) return;
    supabase.from("establishments").select("hours,open_now").eq("id", ctx.establishmentId).maybeSingle()
      .then(({ data }) => { setHours(data?.hours ?? ""); setOpenNow(!!data?.open_now); });
    supabase.from("establishment_delivery_settings").select("*").eq("establishment_id", ctx.establishmentId).maybeSingle()
      .then(({ data }) => setSettings(data ?? { delivery_available: true, pickup_available: true, dine_in_available: false }));
  }, [ctx?.establishmentId]);

  if (!ctx) return null;
  const save = async () => {
    const { error } = await supabase.from("establishments").update({ hours, open_now: openNow }).eq("id", ctx.establishmentId);
    if (settings) {
      await supabase.from("establishment_delivery_settings").upsert({
        establishment_id: ctx.establishmentId,
        delivery_available: !!settings.delivery_available,
        pickup_available: !!settings.pickup_available,
        dine_in_available: !!settings.dine_in_available,
      }, { onConflict: "establishment_id" });
    }
    if (error) toast.error(error.message); else toast.success("Salvo");
  };

  return (
    <PainelSection title="Horários e atendimento" subtitle="Quando você atende e como recebe pedidos">
      <div className="space-y-4">
        <div><Label>Horários (texto livre)</Label><Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Seg-Sex 11h-22h" /></div>
        <div className="flex items-center gap-2"><Switch checked={openNow} onCheckedChange={setOpenNow} /> <span className="text-sm">Aberto agora</span></div>
        {settings && (
          <>
            <div className="flex items-center gap-2"><Switch checked={!!settings.delivery_available} onCheckedChange={(v) => setSettings({ ...settings, delivery_available: v })} /> <span className="text-sm">Entrega</span></div>
            <div className="flex items-center gap-2"><Switch checked={!!settings.pickup_available} onCheckedChange={(v) => setSettings({ ...settings, pickup_available: v })} /> <span className="text-sm">Retirada</span></div>
            <div className="flex items-center gap-2"><Switch checked={!!settings.dine_in_available} onCheckedChange={(v) => setSettings({ ...settings, dine_in_available: v })} /> <span className="text-sm">Comer no local</span></div>
          </>
        )}
        <Button onClick={save}>Salvar</Button>
      </div>
    </PainelSection>
  );
}
