import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save, Lightbulb, Trash2, Plus, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ThemeEditor } from "@/components/owner/ThemeEditor";
import { Switch } from "@/components/ui/switch";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEstablishmentOrders } from "@/hooks/useOrders";
import { brl } from "@/lib/format";
import { OrderRow } from "@/components/orders/OrderRow";
import { DeliverySettings } from "@/components/admin/DeliverySettings";

export default function EstabelecimentoPerfil() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const { data: orders } = useEstablishmentOrders(id);

  const { data: e, isLoading } = useQuery({
    queryKey: ["admin-estab", id],
    queryFn: async () => {
      const { data } = await supabase.from("establishments").select("*, plans(name,id)").eq("id", id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["admin-estab-events", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("type,created_at,hour,weekday,value_cents")
        .eq("establishment_id", id!)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5000);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["admin-estab-reviews", id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").eq("establishment_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ["admin-estab-products", id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("establishment_id", id!).order("name");
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ["admin-estab-audit", id],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").eq("target_id", id!).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: plans } = useQuery({
    queryKey: ["plans-list"],
    queryFn: async () => (await supabase.from("plans").select("id,name").order("position")).data ?? [],
  });

  if (isLoading) return <div className="flex p-20 items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>;
  if (!e) return <div className="p-10">Estabelecimento não encontrado. <Link to="/admin/estabelecimentos" className="text-primary">Voltar</Link></div>;

  async function patch(values: Record<string, any>) {
    const { error } = await supabase.from("establishments").update(values as any).eq("id", e.id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_action", { _action: "establishment.update", _target_type: "establishment", _target_id: e.id, _meta: values as never });
    toast.success("Salvo");
    qc.invalidateQueries({ queryKey: ["admin-estab", id] });
  }

  const wpps = (events ?? []).filter((x) => x.type === "whatsapp_send");
  const visits = (events ?? []).filter((x) => x.type === "establishment_view").length;
  const conversion = visits ? ((wpps.length / visits) * 100).toFixed(1) : "—";

  const insights: { title: string; sev: "info" | "warn" }[] = [];
  if (!e.cover) insights.push({ title: "Adicione uma foto de capa para chamar mais atenção.", sev: "warn" });
  if (!e.logo) insights.push({ title: "Inclua o logo do estabelecimento.", sev: "warn" });
  if (!e.tagline) insights.push({ title: "Capriche em uma frase de destaque (tagline).", sev: "info" });
  if (!e.whatsapp) insights.push({ title: "Configure o WhatsApp — sem ele os pedidos não chegam.", sev: "warn" });
  if ((products?.length ?? 0) < 6) insights.push({ title: "Cardápio com poucos itens. Adicione pelo menos 6 produtos.", sev: "info" });
  if (e.last_menu_update_at) {
    const days = Math.floor((Date.now() - new Date(e.last_menu_update_at).getTime()) / (24 * 60 * 60 * 1000));
    if (days > 20) insights.push({ title: `Cardápio sem atualização há ${days} dias.`, sev: "warn" });
  }
  if (visits > 50 && wpps.length === 0) insights.push({ title: "Recebe visitas mas nenhum pedido — revise preços e fotos.", sev: "warn" });

  return (
    <>
      <div className="border-b border-border bg-card/50 px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/estabelecimentos" className="grid size-9 place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          {e.logo && <img src={e.logo} alt="" className="size-12 rounded-xl object-cover" />}
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold truncate">{e.name}</h1>
            <div className="text-xs text-muted-foreground capitalize">{e.category_label} · {e.city}</div>
          </div>
        </div>
        <Badge variant={e.status === "ativo" ? "default" : "secondary"}>{e.status}</Badge>
      </div>

      <Tabs defaultValue="overview" className="p-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="menu">Cardápio</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="delivery">Entrega e Frete</TabsTrigger>
          <TabsTrigger value="theme">Tema premium</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações</TabsTrigger>
          <TabsTrigger value="insights">Recomendações</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Nome" defaultValue={e.name} onSave={(v) => patch({ name: v })} />
          <Field label="Categoria (label)" defaultValue={e.category_label} onSave={(v) => patch({ category_label: v })} />
          <Field label="WhatsApp" defaultValue={e.whatsapp ?? ""} onSave={(v) => patch({ whatsapp: v })} />
          <Field label="Tagline" defaultValue={e.tagline ?? ""} onSave={(v) => patch({ tagline: v })} />
          <Field label="Endereço" defaultValue={e.address ?? ""} onSave={(v) => patch({ address: v })} />
          <Field label="Cidade" defaultValue={e.city ?? ""} onSave={(v) => patch({ city: v })} />
          <Field label="Bairro" defaultValue={e.neighborhood ?? ""} onSave={(v) => patch({ neighborhood: v })} />
          <Field label="Horários" defaultValue={e.hours ?? ""} onSave={(v) => patch({ hours: v })} />
          <FieldArea label="Descrição" defaultValue={e.description ?? ""} onSave={(v) => patch({ description: v })} />
        </TabsContent>

        <TabsContent value="media" className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Capa</label>
            <MediaUploader value={e.cover ?? ""} onChange={(url) => patch({ cover: url })} bucket="public-media" folder={`estabs/${e.id}/cover`} aspect="aspect-[21/9]" label="Enviar capa" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Logo</label>
            <MediaUploader value={e.logo ?? ""} onChange={(url) => patch({ logo: url })} bucket="public-media" folder={`estabs/${e.id}/logo`} aspect="aspect-square" label="Enviar logo" />
          </div>
        </TabsContent>

        <TabsContent value="menu" className="mt-6 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditingProduct({ establishment_id: e.id, name: "", price: 0, description: "", image: "", promo: false, featured: false })}>
              <Plus className="mr-1 size-4" /> Novo produto
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Promoção</TableHead>
                  <TableHead>Destaque</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>R$ {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell>{p.promo ? "Sim" : "—"}</TableCell>
                    <TableCell>{p.featured ? "Sim" : "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => setEditingProduct({ ...p })}><Pencil className="size-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        if (!confirm("Excluir produto?")) return;
                        await supabase.from("products").delete().eq("id", p.id);
                        qc.invalidateQueries({ queryKey: ["admin-estab-products", id] });
                      }}><Trash2 className="size-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(products ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Sem produtos.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <div className="space-y-2">
            {(orders ?? []).map((o: any) => (
              <OrderRow key={o.id} order={o} onChanged={() => qc.invalidateQueries({ queryKey: ["orders-estab", id] })} />
            ))}
            {(orders ?? []).length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Nenhum pedido ainda.
              </div>
            )}
          </div>
        </TabsContent>


        <TabsContent value="delivery" className="mt-6">
          <DeliverySettings establishmentId={e.id} planName={(e as any).plans?.name} />
        </TabsContent>

        <TabsContent value="theme" className="mt-6">
          <ThemeEditor establishmentId={e.id} menuType={e.menu_type as "essencial" | "exclusivo"} />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatBox label="Visitas (30d)" value={visits} />
          <StatBox label="Pedidos WhatsApp" value={wpps.length} />
          <StatBox label="Conversão" value={`${conversion}%`} hint="pedidos / visitas" />
          <StatBox label="Avaliação média" value={Number(e.rating).toFixed(1)} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6 space-y-3">
          {(reviews ?? []).map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.author} · {"★".repeat(r.rating)}</div>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              <div className="mt-2 flex gap-2">
                {r.status !== "aprovado" && <Button size="sm" variant="outline" onClick={async () => {
                  await supabase.from("reviews").update({ status: "aprovado" }).eq("id", r.id);
                  qc.invalidateQueries({ queryKey: ["admin-estab-reviews", id] });
                }}>Aprovar</Button>}
                {r.status !== "reprovado" && <Button size="sm" variant="outline" onClick={async () => {
                  await supabase.from("reviews").update({ status: "reprovado" }).eq("id", r.id);
                  qc.invalidateQueries({ queryKey: ["admin-estab-reviews", id] });
                }}>Ocultar</Button>}
              </div>
            </div>
          ))}
          {(reviews ?? []).length === 0 && <p className="text-muted-foreground text-sm">Nenhuma avaliação.</p>}
        </TabsContent>

        <TabsContent value="insights" className="mt-6 space-y-3">
          {insights.length === 0 && <p className="text-sm text-muted-foreground">Tudo em ordem — sem recomendações urgentes.</p>}
          {insights.map((i, idx) => (
            <div key={idx} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <Lightbulb className={i.sev === "warn" ? "size-5 text-destructive" : "size-5 text-primary"} />
              <p className="text-sm">{i.title}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamSection establishmentId={id!} />
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-2">
          {(history ?? []).map((h) => (
            <div key={h.id} className="rounded-lg border border-border bg-card px-4 py-2 text-sm flex justify-between">
              <span className="font-mono text-xs">{h.action}</span>
              <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
          {(history ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem registros.</p>}
        </TabsContent>

        <TabsContent value="settings" className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={e.status} onValueChange={(v) => patch({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["pendente", "ativo", "suspenso", "inativo"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Plano</label>
            <Select value={e.plan_id ?? ""} onValueChange={(v) => patch({ plan_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(plans ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="size-4 text-primary" /> Cardápio Premium
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Habilita personalização visual completa (cores, fundo, fontes, banners internos) e seções extras (galeria, história, destaques).
              </p>
            </div>
            <Switch
              checked={e.menu_type === "exclusivo"}
              onCheckedChange={(v) => patch({ menu_type: v ? "exclusivo" : "essencial" })}
            />
          </div>
          <FieldArea label="Motivo de suspensão" defaultValue={e.suspended_reason ?? ""} onSave={(v) => patch({ suspended_reason: v })} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProduct?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {editingProduct && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Nome</label>
                <Input defaultValue={editingProduct.name ?? ""} onChange={(ev) => (editingProduct.name = ev.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Preço (R$)</label>
                  <Input type="number" step="0.01" defaultValue={editingProduct.price ?? 0} onChange={(ev) => (editingProduct.price = parseFloat(ev.target.value || "0"))} />
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch defaultChecked={!!editingProduct.promo} onCheckedChange={(v) => (editingProduct.promo = v)} /> Promo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch defaultChecked={!!editingProduct.featured} onCheckedChange={(v) => (editingProduct.featured = v)} /> Destaque
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Descrição</label>
                <Textarea defaultValue={editingProduct.description ?? ""} onChange={(ev) => (editingProduct.description = ev.target.value)} rows={2} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Imagem</label>
                <MediaUploader
                  value={editingProduct.image ?? ""}
                  onChange={(url) => setEditingProduct({ ...editingProduct, image: url })}
                  bucket="public-media"
                  folder={`estabs/${e.id}/products`}
                  aspect="aspect-video"
                  label="Enviar foto do produto"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!editingProduct) return;
              const payload = {
                establishment_id: e.id,
                name: editingProduct.name,
                price: editingProduct.price,
                description: editingProduct.description,
                image: editingProduct.image,
                promo: !!editingProduct.promo,
                featured: !!editingProduct.featured,
              };
              if (!payload.name?.trim()) { toast.error("Nome obrigatório"); return; }
              const { error } = editingProduct.id
                ? await supabase.from("products").update(payload).eq("id", editingProduct.id)
                : await supabase.from("products").insert(payload as never);
              if (error) return toast.error(error.message);
              toast.success("Produto salvo");
              await supabase.from("establishments").update({ last_menu_update_at: new Date().toISOString() }).eq("id", e.id);
              setEditingProduct(null);
              qc.invalidateQueries({ queryKey: ["admin-estab-products", id] });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, defaultValue, onSave }: { label: string; defaultValue: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} />
        <Button variant="outline" size="icon" onClick={() => onSave(v)}><Save className="size-4" /></Button>
      </div>
    </div>
  );
}
function FieldArea({ label, defaultValue, onSave }: { label: string; defaultValue: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="md:col-span-2">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Textarea value={v} onChange={(e) => setV(e.target.value)} rows={3} />
        <Button variant="outline" size="icon" onClick={() => onSave(v)}><Save className="size-4" /></Button>
      </div>
    </div>
  );
}
function StatBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Dono" },
  { value: "manager", label: "Gerente" },
  { value: "attendant", label: "Atendente" },
  { value: "menu_editor", label: "Editor de cardápio" },
  { value: "finance", label: "Financeiro" },
];

function TeamSection({ establishmentId }: { establishmentId: string }) {
  const qc = useQueryClient();
  const { data: members } = useQuery({
    queryKey: ["admin-team", establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("establishment_owners")
        .select("id,user_id,role,created_at,profiles:user_id(display_name)")
        .eq("establishment_id", establishmentId);
      return data ?? [];
    },
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data: uid, error: e1 } = await supabase.rpc("admin_find_user_by_email", { _email: email.trim() });
      if (e1) throw e1;
      if (!uid) { toast.error("Usuário não encontrado."); return; }
      const { error } = await supabase.from("establishment_owners").insert({
        establishment_id: establishmentId,
        user_id: uid as string,
        role: role as never,
      });
      if (error) throw error;
      toast.success("Membro adicionado");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-team", establishmentId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally { setLoading(false); }
  }

  async function changeRole(id: string, newRole: string) {
    const { error } = await supabase.from("establishment_owners").update({ role: newRole as never }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-team", establishmentId] });
  }

  async function remove(id: string) {
    if (!confirm("Remover este membro?")) return;
    const { error } = await supabase.from("establishment_owners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-team", establishmentId] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="text-sm font-medium">Adicionar membro</div>
        <div className="flex flex-wrap gap-2">
          <Input className="flex-1 min-w-[240px]" placeholder="E-mail do usuário" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={loading}><Plus className="size-4 mr-1" /> Adicionar</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Como admin, você pode atribuir qualquer papel sem restrição de plano.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {(members ?? []).map((m: any) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 p-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{m.profiles?.display_name ?? "—"}</div>
              <div className="font-mono text-[11px] text-muted-foreground truncate">{m.user_id}</div>
            </div>
            <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
        {(members ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum membro vinculado.</div>}
      </div>
    </div>
  );
}
