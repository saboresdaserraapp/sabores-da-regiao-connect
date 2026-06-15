import { useEffect, useMemo, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { PainelSection } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useDeliverySettings,
  useDeliveryRegions,
  useDeliveryMutations,
  MODEL_LABEL,
  type DeliveryModel,
  type DeliveryRegion,
} from "@/hooks/useDeliverySettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";

const MODELS: DeliveryModel[] = ["to_confirm", "fixed", "by_region", "by_region_manual", "free", "no_delivery", "pickup_only", "dine_in_only"];

export default function Entrega() {
  const { ctx } = useActiveEstablishment();
  const estabId = ctx?.establishmentId;
  const qc = useQueryClient();

  const { data: settings, isLoading: ls } = useDeliverySettings(estabId);
  const { data: regions, isLoading: lr } = useDeliveryRegions(estabId, true);
  const { saveSettings, saveRegion, removeRegion } = useDeliveryMutations(estabId);

  const { data: estab } = useQuery({
    queryKey: ["estab-fee", estabId],
    enabled: !!estabId,
    queryFn: async () => {
      const { data } = await supabase.from("establishments").select("delivery_fee").eq("id", estabId!).maybeSingle();
      return data;
    },
  });

  const [model, setModel] = useState<DeliveryModel>("to_confirm");
  const [v2, setV2] = useState(false);
  const [alwaysConfirm, setAlwaysConfirm] = useState(true);
  const [defaultMsg, setDefaultMsg] = useState("");
  const [outsideMsg, setOutsideMsg] = useState("");
  const [fixedFee, setFixedFee] = useState<string>("0");

  useEffect(() => {
    if (settings) {
      setModel(settings.delivery_model);
      setV2(!!settings.delivery_v2_enabled);
      setAlwaysConfirm(!!settings.always_confirm_by_whatsapp);
      setDefaultMsg(settings.default_delivery_message ?? "");
      setOutsideMsg(settings.outside_area_message ?? "");
    }
  }, [settings]);
  useEffect(() => {
    if (estab?.delivery_fee != null) setFixedFee(String(estab.delivery_fee));
  }, [estab?.delivery_fee]);

  const sortedRegions = useMemo(
    () => [...(regions ?? [])].sort((a, b) => a.display_order - b.display_order),
    [regions]
  );

  const [editing, setEditing] = useState<Partial<DeliveryRegion> | null>(null);

  if (!ctx) return null;

  const saveAll = async () => {
    await saveSettings({
      delivery_model: model,
      delivery_v2_enabled: v2,
      always_confirm_by_whatsapp: alwaysConfirm,
      default_delivery_message: defaultMsg || null,
      outside_area_message: outsideMsg || null,
    });
    if (model === "fixed" && estabId) {
      const { error } = await supabase.from("establishments")
        .update({ delivery_fee: Number(fixedFee) || 0 }).eq("id", estabId);
      if (error) toast.error(error.message);
      else qc.invalidateQueries({ queryKey: ["estab-fee", estabId] });
    }
  };

  if (ls || lr) {
    return (
      <PainelSection title="Entrega e atendimento">
        <div className="flex justify-center p-8"><Loader2 className="size-6 animate-spin text-primary" /></div>
      </PainelSection>
    );
  }

  return (
    <PainelSection
      title="Entrega e atendimento"
      subtitle="Defina como sua loja calcula a taxa de entrega e atende os clientes."
      action={<Button onClick={saveAll}><Save className="mr-2 size-4" /> Salvar</Button>}
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h3 className="font-semibold">Modelo de entrega</h3>
          <Select value={model} onValueChange={(v) => setModel(v as DeliveryModel)}>
            <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => <SelectItem key={m} value={m}>{MODEL_LABEL[m]}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O app cruza esta configuração com a região do cliente (detectada pelo bairro). O valor que vale é sempre o desta tela.
          </p>
        </section>

        {model === "fixed" && (
          <section className="space-y-2 rounded-xl border bg-muted/30 p-4">
            <Label>Taxa fixa por entrega (R$)</Label>
            <Input type="number" step="0.01" min="0" className="max-w-[160px]"
              value={fixedFee} onChange={(e) => setFixedFee(e.target.value)} />
            <p className="text-xs text-muted-foreground">Aplicada a qualquer endereço atendido.</p>
          </section>
        )}

        <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-semibold">Cálculo por região (v2)</Label>
              <p className="text-xs text-muted-foreground">Liga a seleção de região no checkout. Recomendado para "por região".</p>
            </div>
            <Switch checked={v2} onCheckedChange={setV2} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-semibold">Sempre confirmar pelo WhatsApp</Label>
              <p className="text-xs text-muted-foreground">O total será marcado como "estimado" até a loja confirmar.</p>
            </div>
            <Switch checked={alwaysConfirm} onCheckedChange={setAlwaysConfirm} />
          </div>
        </section>

        {(model === "by_region" || model === "by_region_manual" || v2) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Regiões cadastradas</h3>
              <Button size="sm" variant="outline" onClick={() => setEditing({ name: "", fee: 0, status: "ativo", min_order_value: 0, display_order: (sortedRegions.at(-1)?.display_order ?? 0) + 1 })}>
                <Plus className="mr-1 size-4" /> Nova região
              </Button>
            </div>
            {sortedRegions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma região cadastrada. Adicione bairros e taxas que sua loja atende.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-2">Região</th><th>Taxa</th><th>Mínimo</th><th>Tempo</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {sortedRegions.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 font-medium">{r.name}{r.requires_manual_confirmation && <span className="ml-1 text-[10px] text-amber-600">manual</span>}</td>
                        <td>{brl(Number(r.fee))}</td>
                        <td>{r.min_order_value > 0 ? brl(Number(r.min_order_value)) : "—"}</td>
                        <td>{r.estimated_time ? `${r.estimated_time} min` : "—"}</td>
                        <td><span className={r.status === "ativo" ? "text-emerald-600" : r.status === "nao_atendida" ? "text-destructive" : "text-muted-foreground"}>{r.status}</span></td>
                        <td className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Editar</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Remover ${r.name}?`)) removeRegion(r.id); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          <h3 className="font-semibold">Mensagens automáticas</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Mensagem padrão de entrega</Label>
              <Textarea rows={3} value={defaultMsg} onChange={(e) => setDefaultMsg(e.target.value)} placeholder="Ex.: Confirmaremos taxa e prazo pelo WhatsApp." />
            </div>
            <div>
              <Label className="text-xs">Mensagem para endereço fora da área</Label>
              <Textarea rows={3} value={outsideMsg} onChange={(e) => setOutsideMsg(e.target.value)} placeholder="Ex.: No momento não atendemos essa região." />
            </div>
          </div>
        </section>

        {editing && (
          <RegionEditor
            initial={editing}
            onClose={() => setEditing(null)}
            onSave={async (r) => { await saveRegion(r as any); setEditing(null); }}
          />
        )}
      </div>
    </PainelSection>
  );
}

function RegionEditor({ initial, onClose, onSave }: {
  initial: Partial<DeliveryRegion>;
  onClose: () => void;
  onSave: (r: Partial<DeliveryRegion> & { name: string }) => Promise<void>;
}) {
  const [r, setR] = useState<Partial<DeliveryRegion>>(initial);
  const set = (p: Partial<DeliveryRegion>) => setR((s) => ({ ...s, ...p }));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-lg font-semibold">{initial.id ? "Editar região" : "Nova região"}</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome do bairro / região</Label>
            <Input value={r.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Centro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Taxa (R$)</Label>
              <Input type="number" step="0.01" min="0" value={r.fee ?? 0} onChange={(e) => set({ fee: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Pedido mínimo (R$)</Label>
              <Input type="number" step="0.01" min="0" value={r.min_order_value ?? 0} onChange={(e) => set({ min_order_value: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Tempo estimado (min)</Label>
              <Input type="number" min="0" value={r.estimated_time ?? ""} onChange={(e) => set({ estimated_time: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={(r.status as string) ?? "ativo"} onValueChange={(v) => set({ status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="nao_atendida">Não atendida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={!!r.requires_manual_confirmation} onCheckedChange={(c) => set({ requires_manual_confirmation: c })} />
            Exige confirmação manual pelo WhatsApp
          </label>
          <div>
            <Label className="text-xs">Observação pública (mostrada ao cliente)</Label>
            <Textarea rows={2} value={r.public_note ?? ""} onChange={(e) => set({ public_note: e.target.value })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => r.name?.trim() ? onSave(r as any) : toast.error("Informe o nome da região")}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}
