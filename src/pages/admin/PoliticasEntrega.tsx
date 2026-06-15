import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, MessageSquareWarning, MapPin, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { MODEL_LABEL, type DeliveryModel } from "@/hooks/useDeliverySettings";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  neighborhood: string | null;
  status: string;
  settings: {
    delivery_model: DeliveryModel;
    delivery_v2_enabled: boolean;
    always_confirm_by_whatsapp: boolean;
    delivery_available: boolean;
    pickup_available: boolean;
    dine_in_available: boolean;
  } | null;
  regions: Array<{
    id: string; name: string; fee: number; estimated_time: number | null;
    status: "ativo" | "inativo" | "nao_atendida"; requires_manual_confirmation: boolean;
  }>;
};

export default function PoliticasEntrega() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [requestFor, setRequestFor] = useState<Row | null>(null);
  const [requestMsg, setRequestMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-delivery-policies"],
    queryFn: async (): Promise<Row[]> => {
      const [{ data: estabs }, { data: settings }, { data: regions }] = await Promise.all([
        supabase.from("establishments").select("id,name,slug,city,neighborhood,status").order("name"),
        supabase.from("establishment_delivery_settings").select("*"),
        supabase.from("delivery_regions").select("id,establishment_id,name,fee,estimated_time,status,requires_manual_confirmation").order("display_order"),
      ]);
      const sBy = new Map((settings ?? []).map((s: any) => [s.establishment_id, s]));
      const rBy = new Map<string, Row["regions"]>();
      (regions ?? []).forEach((r: any) => {
        const arr = rBy.get(r.establishment_id) ?? [];
        arr.push(r); rBy.set(r.establishment_id, arr);
      });
      return (estabs ?? []).map((e: any) => ({
        ...e,
        settings: sBy.get(e.id) ?? null,
        regions: rBy.get(e.id) ?? [],
      }));
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) =>
      r.name.toLowerCase().includes(term) ||
      (r.city ?? "").toLowerCase().includes(term) ||
      (r.neighborhood ?? "").toLowerCase().includes(term)
    );
  }, [data, q]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, v2: 0, alwaysConfirm: 0, naoAtendidas: 0, manual: 0 };
    return {
      total: data.length,
      v2: data.filter((r) => r.settings?.delivery_v2_enabled).length,
      alwaysConfirm: data.filter((r) => r.settings?.always_confirm_by_whatsapp).length,
      naoAtendidas: data.filter((r) => r.regions.some((rg) => rg.status === "nao_atendida")).length,
      manual: data.filter((r) => r.regions.some((rg) => rg.requires_manual_confirmation)).length,
    };
  }, [data]);

  const toggleV2 = async (row: Row, v: boolean) => {
    const existing = row.settings;
    if (existing) {
      const { error } = await supabase
        .from("establishment_delivery_settings")
        .update({ delivery_v2_enabled: v })
        .eq("establishment_id", row.id);
      if (error) return toast.error("Falha ao atualizar");
    } else {
      const { error } = await supabase
        .from("establishment_delivery_settings")
        .insert({ establishment_id: row.id, delivery_v2_enabled: v });
      if (error) return toast.error("Falha ao criar configuração");
    }
    toast.success(`Entrega v2 ${v ? "ativada" : "desativada"} para ${row.name}`);
    qc.invalidateQueries({ queryKey: ["admin-delivery-policies"] });
  };

  const sendRequest = async () => {
    if (!requestFor || !requestMsg.trim()) return;
    const { error } = await supabase.from("business_insights").insert({
      establishment_id: requestFor.id,
      insight_type: "delivery_policy_request",
      title: "Solicitação de ajuste na política de entrega",
      description: requestMsg.trim(),
      recommendation: "Revise sua configuração em Entrega e Frete no painel da loja.",
      severity: "warning",
      status: "open",
    });
    if (error) return toast.error("Não foi possível enviar a solicitação");
    toast.success("Solicitação enviada à loja");
    setRequestFor(null); setRequestMsg("");
  };

  const toggleExp = (id: string) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Políticas de Entrega</h1>
        <p className="text-sm text-muted-foreground">Supervisão e controle das configurações de entrega de todas as lojas.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Lojas" value={stats.total} />
        <Stat label="Com Entrega v2" value={stats.v2} accent />
        <Stat label="Sempre confirmam taxa" value={stats.alwaysConfirm} />
        <Stat label="Com regiões não atendidas" value={stats.naoAtendidas} warn />
        <Stat label="Com confirmação manual" value={stats.manual} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar loja, cidade ou bairro" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Loja</div>
          <div className="col-span-3">Modelo</div>
          <div className="col-span-2">Sinais</div>
          <div className="col-span-2 text-center">Entrega v2</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando…</div>}
        {!isLoading && rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma loja encontrada.</div>}

        {rows.map((row) => {
          const isOpen = expanded.has(row.id);
          const s = row.settings;
          const hasNotServed = row.regions.some((r) => r.status === "nao_atendida");
          const hasManual = row.regions.some((r) => r.requires_manual_confirmation);
          return (
            <div key={row.id} className="border-b border-border last:border-b-0">
              <div className="grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-muted/20">
                <button onClick={() => toggleExp(row.id)} className="col-span-4 flex items-center gap-2 text-left">
                  {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{row.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{row.neighborhood ?? "—"} · {row.city ?? "—"}</div>
                  </div>
                </button>
                <div className="col-span-3 text-xs">
                  <Badge variant="secondary">{MODEL_LABEL[s?.delivery_model ?? "to_confirm"]}</Badge>
                </div>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {s?.always_confirm_by_whatsapp && <Badge variant="outline" className="text-[10px]">taxa a confirmar</Badge>}
                  {hasManual && <Badge variant="outline" className="text-[10px]">manual</Badge>}
                  {hasNotServed && <Badge variant="destructive" className="text-[10px]">não atende</Badge>}
                </div>
                <div className="col-span-2 flex items-center justify-center gap-2">
                  <Switch checked={!!s?.delivery_v2_enabled} onCheckedChange={(v) => toggleV2(row, v)} />
                  {s?.delivery_v2_enabled
                    ? <CheckCircle2 className="size-4 text-primary" />
                    : <span className="text-xs text-muted-foreground">off</span>}
                </div>
                <div className="col-span-1 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setRequestFor(row); setRequestMsg(""); }} title="Solicitar ajuste">
                    <MessageSquareWarning className="size-4" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="bg-muted/20 px-12 py-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-3 text-xs">
                    <Info label="Entrega" value={s?.delivery_available ? "Sim" : "Não"} />
                    <Info label="Retirada" value={s?.pickup_available ? "Sim" : "Não"} />
                    <Info label="Comer no local" value={s?.dine_in_available ? "Sim" : "Não"} />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <MapPin className="size-3" /> Regiões cadastradas ({row.regions.length})
                    </div>
                    {row.regions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma região cadastrada.</p>
                    ) : (
                      <div className="rounded-xl border border-border overflow-x-auto">
                        <table className="w-full min-w-[520px] text-xs">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-1.5 text-left font-medium">Região</th>
                              <th className="px-3 py-1.5 text-right font-medium">Taxa</th>
                              <th className="px-3 py-1.5 text-right font-medium">Prazo</th>
                              <th className="px-3 py-1.5 text-center font-medium">Status</th>
                              <th className="px-3 py-1.5 text-center font-medium">Manual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.regions.map((r) => (
                              <tr key={r.id} className="border-t border-border">
                                <td className="px-3 py-1.5">{r.name}</td>
                                <td className="px-3 py-1.5 text-right">{brl(Number(r.fee))}</td>
                                <td className="px-3 py-1.5 text-right">{r.estimated_time ? `${r.estimated_time} min` : "—"}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <Badge variant={r.status === "ativo" ? "secondary" : r.status === "nao_atendida" ? "destructive" : "outline"} className="text-[10px]">
                                    {r.status}
                                  </Badge>
                                </td>
                                <td className="px-3 py-1.5 text-center">{r.requires_manual_confirmation ? "Sim" : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!requestFor} onOpenChange={(o) => !o && setRequestFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajuste na política de entrega</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Loja: <strong>{requestFor?.name}</strong>
          </p>
          <Textarea
            rows={5}
            maxLength={800}
            placeholder="Descreva o ajuste sugerido (ex: cadastrar regiões faltantes, revisar taxa, ativar Entrega v2…)"
            value={requestMsg}
            onChange={(e) => setRequestMsg(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestFor(null)}>Cancelar</Button>
            <Button onClick={sendRequest} disabled={!requestMsg.trim()}>Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-3", accent ? "border-primary/30 bg-primary/5" : warn ? "border-warning/30 bg-warning/5" : "border-border bg-card")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
