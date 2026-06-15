import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import {
  DeliveryModel, DeliveryRegion, MODEL_LABEL, PlanTier,
  allowedModels, planTier, tierAtLeast,
  useDeliveryMutations, useDeliveryRegions, useDeliverySettings,
} from "@/hooks/useDeliverySettings";
import { cn } from "@/lib/utils";

const DEFAULT_VALUES = {
  delivery_model: "to_confirm" as DeliveryModel,
  delivery_available: true,
  pickup_available: true,
  dine_in_available: false,
  always_confirm_by_whatsapp: true,
  default_delivery_message: "",
  outside_area_message: "",
  delivery_v2_enabled: false,
};

export function DeliverySettings({ establishmentId, planName }: { establishmentId: string; planName?: string | null }) {
  const tier = planTier(planName);
  const { data: settings } = useDeliverySettings(establishmentId);
  const { data: regions } = useDeliveryRegions(establishmentId, true);
  const { saveSettings, saveRegion, removeRegion } = useDeliveryMutations(establishmentId);

  const s = { ...DEFAULT_VALUES, ...(settings ?? {}) };
  const [editing, setEditing] = useState<Partial<DeliveryRegion> | null>(null);

  const canRegions = tierAtLeast(tier, "essencial");
  const canManualRegion = tierAtLeast(tier, "exclusivo");
  const canReports = tierAtLeast(tier, "gestao");
  const models = allowedModels(tier);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Disponibilidade */}
      <Card title="Disponibilidade">
        <ToggleRow label="Entrega disponível" checked={s.delivery_available}
          onChange={(v) => saveSettings({ delivery_available: v })} />
        <ToggleRow label="Retirada disponível" checked={s.pickup_available}
          onChange={(v) => saveSettings({ pickup_available: v })} />
        <ToggleRow label="Comer no local disponível" checked={s.dine_in_available}
          onChange={(v) => saveSettings({ dine_in_available: v })} />
      </Card>

      {/* Modelo de entrega */}
      <Card title="Modelo de entrega">
        <Select value={s.delivery_model} onValueChange={(v) => saveSettings({ delivery_model: v as DeliveryModel })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(MODEL_LABEL) as DeliveryModel[]).map((m) => {
              const locked = !models.includes(m) && m !== "free";
              return (
                <SelectItem key={m} value={m} disabled={locked}>
                  <span className="flex items-center gap-2">
                    {locked && <Lock className="size-3" />}
                    {MODEL_LABEL[m]}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Modelos avançados ficam disponíveis a partir do plano Essencial.
        </p>

        <div className="mt-4">
          <ToggleRow
            label="Sempre confirmar taxa pelo WhatsApp"
            checked={s.always_confirm_by_whatsapp}
            onChange={(v) => saveSettings({ always_confirm_by_whatsapp: v })}
          />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-border p-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-primary" /> Usar sistema avançado de entrega por região</div>
            <p className="text-xs text-muted-foreground">Quando ligado, o checkout usa regiões, taxa estimada e confirmação pelo WhatsApp. Desligado mantém o fluxo antigo.</p>
          </div>
          <Switch checked={s.delivery_v2_enabled} onCheckedChange={(v) => saveSettings({ delivery_v2_enabled: v })} />
        </div>

      </Card>

      {/* Mensagens */}
      <Card title="Mensagens" className="md:col-span-2">
        <label className="text-xs text-muted-foreground">Mensagem padrão de entrega</label>
        <Textarea
          defaultValue={s.default_delivery_message ?? ""}
          rows={2}
          maxLength={500}
          onBlur={(e) => e.target.value !== (s.default_delivery_message ?? "") && saveSettings({ default_delivery_message: e.target.value })}
        />
        <label className="mt-3 block text-xs text-muted-foreground">Mensagem para região fora da área</label>
        <Textarea
          defaultValue={s.outside_area_message ?? ""}
          rows={2}
          maxLength={500}
          onBlur={(e) => e.target.value !== (s.outside_area_message ?? "") && saveSettings({ outside_area_message: e.target.value })}
        />
      </Card>

      {/* Regiões */}
      <Card
        title={<span className="flex items-center gap-2">Regiões de entrega {!canRegions && <Lock className="size-4 text-muted-foreground" />}</span>}
        className="md:col-span-2"
      >
        {!canRegions ? (
          <PlanLocked minPlan="Essencial" desc="Cadastre bairros/regiões com taxa e prazo no plano Essencial ou superior." />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setEditing({ name: "", fee: 0, status: "ativo", display_order: (regions?.length ?? 0) + 1, requires_manual_confirmation: false })}>
                <Plus className="mr-1 size-4" /> Nova região
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manual?</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(regions ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{r.display_order}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>R$ {Number(r.fee).toFixed(2)}</TableCell>
                      <TableCell>{r.estimated_time ? `${r.estimated_time} min` : "—"}</TableCell>
                      <TableCell><RegionStatusBadge status={r.status} /></TableCell>
                      <TableCell>{r.requires_manual_confirmation ? "Sim" : "—"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing({ ...r })}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={async () => { if (confirm("Excluir região?")) await removeRegion(r.id); }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(regions ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">Nenhuma região cadastrada.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* Relatórios (gestão) */}
      <Card
        title={<span className="flex items-center gap-2">Relatórios de entrega {!canReports && <Lock className="size-4 text-muted-foreground" />}</span>}
        className="md:col-span-2"
      >
        {canReports ? (
          <p className="text-sm text-muted-foreground">Relatórios serão liberados em breve.</p>
        ) : (
          <PlanLocked minPlan="Gestão" desc="Relatórios de regiões mais pedidas, conversão por área e desempenho de entrega." />
        )}
      </Card>

      {/* Modal de edição de região */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar região" : "Nova região"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <FormRow label="Nome da região">
                <Input defaultValue={editing.name ?? ""} maxLength={120} onChange={(e) => (editing.name = e.target.value)} />
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Taxa de entrega (R$)">
                  <Input type="number" min={0} step="0.01" defaultValue={editing.fee ?? 0} onChange={(e) => (editing.fee = parseFloat(e.target.value || "0"))} />
                </FormRow>
                <FormRow label="Tempo estimado (min)">
                  <Input type="number" min={0} defaultValue={editing.estimated_time ?? ""} onChange={(e) => (editing.estimated_time = e.target.value ? parseInt(e.target.value) : null)} />
                </FormRow>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Status">
                  <Select defaultValue={editing.status ?? "ativo"} onValueChange={(v) => (editing.status = v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativa</SelectItem>
                      <SelectItem value="inativo">Inativa</SelectItem>
                      <SelectItem value="nao_atendida">Não atendida</SelectItem>
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Ordem de exibição">
                  <Input type="number" defaultValue={editing.display_order ?? 0} onChange={(e) => (editing.display_order = parseInt(e.target.value || "0"))} />
                </FormRow>
              </div>
              <div className={cn("flex items-center justify-between rounded-xl border p-3", !canManualRegion && "opacity-60")}>
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {!canManualRegion && <Lock className="size-3.5" />} Exigir confirmação manual
                  </div>
                  <p className="text-xs text-muted-foreground">Mesmo com taxa cadastrada, o lojista confirma pelo WhatsApp.</p>
                </div>
                <Switch
                  defaultChecked={!!editing.requires_manual_confirmation}
                  disabled={!canManualRegion}
                  onCheckedChange={(v) => (editing.requires_manual_confirmation = v)}
                />
              </div>
              <FormRow label="Observação pública (vista pelo cliente)">
                <Textarea defaultValue={editing.public_note ?? ""} rows={2} maxLength={300} onChange={(e) => (editing.public_note = e.target.value)} />
              </FormRow>
              <FormRow label="Observação interna (somente lojista)">
                <Textarea defaultValue={editing.internal_note ?? ""} rows={2} maxLength={300} onChange={(e) => (editing.internal_note = e.target.value)} />
              </FormRow>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!editing?.name?.trim()) return;
              await saveRegion(editing as any);
              setEditing(null);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0 border-b border-border last:border-0">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs text-muted-foreground">{label}</label>{children}</div>;
}
function PlanLocked({ minPlan, desc }: { minPlan: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" />
      <div>
        <div className="font-medium text-foreground">Disponível no plano {minPlan}</div>
        <p>{desc}</p>
      </div>
    </div>
  );
}
function RegionStatusBadge({ status }: { status: string }) {
  if (status === "ativo") return <Badge>Ativa</Badge>;
  if (status === "nao_atendida") return <Badge variant="destructive">Não atendida</Badge>;
  return <Badge variant="secondary">Inativa</Badge>;
}
