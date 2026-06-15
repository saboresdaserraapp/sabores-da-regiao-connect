import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Save, Image as ImageIcon, ArrowUp, ArrowDown, ExternalLink, Eye, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import type { BannerPlacement } from "@/hooks/useBanners";
import { MediaUploader } from "@/components/media/MediaUploader";

const PLACEMENTS: { value: BannerPlacement; label: string; tier: string; description: string }[] = [
  { value: "home_top", label: "Home — Topo", tier: "Premium", description: "Anúncio mais caro, exibido logo abaixo do hero." },
  { value: "home_mid", label: "Home — Meio (portal)", tier: "Premium", description: "Entre carrosséis de produtos." },
  { value: "loja_top", label: "Loja — Topo", tier: "Padrão", description: "Página /loja, antes dos filtros." },
  { value: "category_top", label: "Categoria — Topo", tier: "Médio", description: "Filtrado por categoria." },
  { value: "category_mid", label: "Categoria — Meio", tier: "Padrão", description: "No meio da listagem por categoria." },
  { value: "establishment_menu", label: "Cardápio de estabelecimento", tier: "Premium loja", description: "Banner interno em cardápio premium." },
];

export default function AdminSite() {
  return (
    <>
      <AdminHeader title="Gestão do site" subtitle="Banners, categorias, planos e textos institucionais." />
      <Tabs defaultValue="banners" className="p-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="settings">Site & FAQ</TabsTrigger>
        </TabsList>
        <TabsContent value="banners" className="mt-6"><BannersTab /></TabsContent>
        <TabsContent value="categories" className="mt-6"><CategoriesTab /></TabsContent>
        <TabsContent value="plans" className="mt-6"><PlansTab /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
      </Tabs>
    </>
  );
}

function BannersTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | BannerPlacement>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "scheduled" | "expired">("all");
  const [editing, setEditing] = useState<any | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => (await supabase.from("banners").select("*").order("priority", { ascending: false })).data ?? [],
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["site-cats-all"],
    queryFn: async () => (await supabase.from("site_categories").select("key,label,emoji").order("position")).data ?? [],
  });
  const { data: estabs = [] } = useQuery({
    queryKey: ["estabs-min"],
    queryFn: async () => (await supabase.from("establishments").select("id,name").order("name")).data ?? [],
  });

  const now = Date.now();
  const filtered = (banners as any[]).filter((b) => {
    if (filter !== "all" && b.placement !== filter) return false;
    if (statusFilter === "active" && !b.active) return false;
    if (statusFilter === "scheduled" && (!b.starts_at || new Date(b.starts_at).getTime() <= now)) return false;
    if (statusFilter === "expired" && (!b.ends_at || new Date(b.ends_at).getTime() > now)) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const p of PLACEMENTS) m[p.value] = [];
    for (const b of filtered) (m[b.placement] ||= []).push(b);
    return m;
  }, [filtered]);

  async function move(b: any, dir: 1 | -1) {
    await supabase.from("banners").update({ priority: (b.priority ?? 0) + dir }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Posição" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas posições</SelectItem>
            {PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="scheduled">Agendados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setEditing({})}><Plus className="mr-2 size-4" /> Novo banner</Button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <div className="space-y-8">
          {PLACEMENTS.map((p) => {
            const list = grouped[p.value] || [];
            return (
              <section key={p.value}>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{p.label}</h3>
                      <Badge variant="outline">{p.tier}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{list.length} ativos</span>
                </div>
                {list.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                    <ImageIcon className="mx-auto mb-2 size-6 opacity-40" />
                    Slot vazio — espaço disponível para venda.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((b) => {
                      const ctr = b.impressions ? ((b.clicks / b.impressions) * 100).toFixed(1) : "0";
                      return (
                        <div key={b.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                          <div className="relative aspect-[21/9] bg-muted">
                            <img src={b.image} alt="" className="size-full object-cover" />
                            {!b.active && (
                              <span className="absolute left-2 top-2 rounded-full bg-destructive/80 px-2 py-0.5 text-xs text-white">
                                Inativo
                              </span>
                            )}
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{b.title || "(sem título)"}</div>
                                {b.link && (
                                  <a href={b.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                                    <ExternalLink className="size-3" /> link
                                  </a>
                                )}
                              </div>
                              <Switch checked={b.active} onCheckedChange={async (v) => {
                                await supabase.from("banners").update({ active: v }).eq("id", b.id);
                                qc.invalidateQueries({ queryKey: ["admin-banners"] });
                              }} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Eye className="size-3" /> {b.impressions ?? 0}</span>
                              <span className="inline-flex items-center gap-1"><MousePointerClick className="size-3" /> {b.clicks ?? 0}</span>
                              <span>CTR {ctr}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="outline" onClick={() => move(b, 1)}><ArrowUp className="size-3.5" /></Button>
                                <Button size="icon" variant="outline" onClick={() => move(b, -1)}><ArrowDown className="size-3.5" /></Button>
                                <span className="text-xs text-muted-foreground">prio {b.priority ?? 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="outline" onClick={() => setEditing(b)}>Editar</Button>
                                <Button size="icon" variant="outline" onClick={() => remove(b.id)}><Trash2 className="size-3.5" /></Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing !== null && (
        <BannerForm
          initial={editing}
          categories={cats as any[]}
          establishments={estabs as any[]}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-banners"] }); }}
        />
      )}
    </div>
  );
}

function BannerForm({ initial, categories, establishments, onClose, onSaved }: {
  initial: any;
  categories: any[];
  establishments: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !initial.id;
  const [form, setForm] = useState({
    title: initial.title ?? "",
    image: initial.image ?? "",
    link: initial.link ?? "",
    cta_label: initial.cta_label ?? "",
    placement: (initial.placement ?? "home_top") as BannerPlacement,
    category_key: initial.category_key ?? "",
    establishment_id: initial.establishment_id ?? "",
    paid_by_establishment_id: initial.paid_by_establishment_id ?? "",
    media_type: initial.media_type ?? "image",
    priority: initial.priority ?? 0,
    active: initial.active ?? true,
    starts_at: initial.starts_at ?? "",
    ends_at: initial.ends_at ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    if (!form.image) return toast.error("Envie uma imagem ou GIF");
    const url = form.image.toLowerCase();
    const media_type = /\.gif(\?.*)?$/.test(url) ? "gif" : "image";

    const payload: any = {
      title: form.title || null,
      image: form.image,
      link: form.link || null,
      cta_label: form.cta_label || null,
      placement: form.placement,
      category_key: form.category_key || null,
      establishment_id: form.establishment_id || null,
      paid_by_establishment_id: form.paid_by_establishment_id || null,
      media_type,
      priority: Number(form.priority) || 0,
      active: form.active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    const { error } = isNew
      ? await supabase.from("banners").insert(payload)
      : await supabase.from("banners").update(payload).eq("id", initial.id);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Banner criado" : "Banner atualizado");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-glow my-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{isNew ? "Novo banner" : "Editar banner"}</h3>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Mídia do banner * (imagem ou GIF)</label>
          <MediaUploader
            value={form.image}
            onChange={(url) => set("image", url)}
            bucket="public-media"
            folder="banners"
            aspect="aspect-[21/9]"
            maxSizeMB={8}
            label="Enviar banner"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Título">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Link de destino">
            <Input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Texto do CTA (opcional)">
            <Input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="Ex: Ver oferta" />
          </Field>
          <Field label="Posição *">
            <Select value={form.placement} onValueChange={(v) => set("placement", v as BannerPlacement)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade (maior aparece primeiro)">
            <Input type="number" value={form.priority} onChange={(e) => set("priority", Number(e.target.value))} />
          </Field>
          {(form.placement === "category_top" || form.placement === "category_mid") && (
            <Field label="Categoria alvo">
              <Select value={form.category_key} onValueChange={(v) => set("category_key", v)}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          {form.placement === "establishment_menu" && (
            <Field label="Estabelecimento alvo">
              <Select value={form.establishment_id} onValueChange={(v) => set("establishment_id", v)}>
                <SelectTrigger><SelectValue placeholder="Estabelecimento" /></SelectTrigger>
                <SelectContent>
                  {establishments.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Estabelecimento pagante (opcional)">
            <Select value={form.paid_by_establishment_id || "__none"} onValueChange={(v) => set("paid_by_establishment_id", v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Nenhum</SelectItem>
                {establishments.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Início da campanha">
            <Input type="datetime-local" value={form.starts_at ? form.starts_at.slice(0, 16) : ""} onChange={(e) => set("starts_at", e.target.value)} />
          </Field>
          <Field label="Fim da campanha">
            <Input type="datetime-local" value={form.ends_at ? form.ends_at.slice(0, 16) : ""} onChange={(e) => set("ends_at", e.target.value)} />
          </Field>
          <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <div className="text-sm font-medium">Banner ativo</div>
              <div className="text-xs text-muted-foreground">Desative para esconder sem excluir.</div>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}><Save className="mr-2 size-4" /> Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function CategoriesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["site-cats"], queryFn: async () => (await supabase.from("site_categories").select("*").order("position")).data ?? [] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ key: "", label: "", emoji: "", position: 0 });
  const list = data ?? [];

  async function createCat() {
    const key = (form.key || form.label).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!key || !form.label) { toast.error("Informe nome e chave."); return; }
    const pos = form.position || (list.length + 1);
    const { error } = await supabase.from("site_categories").insert({ key, label: form.label, emoji: form.emoji || null, position: pos, visible: true });
    if (error) return toast.error(error.message);
    toast.success("Categoria criada");
    setOpen(false); setForm({ key: "", label: "", emoji: "", position: 0 });
    qc.invalidateQueries({ queryKey: ["site-cats"] });
  }

  async function updateCat(key: string, patch: { label?: string; emoji?: string | null; position?: number; visible?: boolean }) {
    const { error } = await supabase.from("site_categories").update(patch).eq("key", key);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["site-cats"] });
  }

  async function moveCat(idx: number, dir: -1 | 1) {
    const a = list[idx]; const b = list[idx + dir];
    if (!a || !b) return;
    await supabase.from("site_categories").update({ position: b.position }).eq("key", a.key);
    await supabase.from("site_categories").update({ position: a.position }).eq("key", b.key);
    qc.invalidateQueries({ queryKey: ["site-cats"] });
  }

  async function deleteCat(key: string) {
    const { count } = await supabase.from("establishments").select("id", { count: "exact", head: true }).eq("category", key);
    if ((count ?? 0) > 0) { toast.error(`Não é possível excluir: ${count} estabelecimento(s) usam esta categoria.`); return; }
    if (!confirm("Excluir esta categoria?")) return;
    const { error } = await supabase.from("site_categories").delete().eq("key", key);
    if (error) return toast.error(error.message);
    toast.success("Categoria removida");
    qc.invalidateQueries({ queryKey: ["site-cats"] });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4 mr-1" /> Nova categoria</Button>
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {list.map((c, idx) => (
          <div key={c.key} className="flex flex-wrap items-center gap-2 p-3">
            <Input className="w-16 text-center" defaultValue={c.emoji ?? ""} onBlur={(e) => e.target.value !== (c.emoji ?? "") && updateCat(c.key, { emoji: e.target.value || null })} />
            <Input className="flex-1 min-w-[180px]" defaultValue={c.label} onBlur={(e) => e.target.value !== c.label && updateCat(c.key, { label: e.target.value })} />
            <span className="font-mono text-xs text-muted-foreground w-32 truncate">{c.key}</span>
            <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => moveCat(idx, -1)}><ArrowUp className="size-4" /></Button>
            <Button size="icon" variant="ghost" disabled={idx === list.length - 1} onClick={() => moveCat(idx, 1)}><ArrowDown className="size-4" /></Button>
            <Switch checked={c.visible} onCheckedChange={(v) => updateCat(c.key, { visible: v })} />
            <Button size="icon" variant="ghost" onClick={() => deleteCat(c.key)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
        {list.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma categoria. Clique em "Nova categoria".</div>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold">Nova categoria</h3>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Nome exibido</label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Sorvetes" />
              <label className="text-xs text-muted-foreground">Chave (slug, opcional)</label>
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="auto a partir do nome" />
              <label className="text-xs text-muted-foreground">Emoji</label>
              <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🍦" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createCat}>Criar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlansTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["site-plans"], queryFn: async () => (await supabase.from("plans").select("*").order("position")).data ?? [] });
  return (
    <div className="space-y-3">
      {(data ?? []).map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg font-semibold">{p.name}</div>
            <div className="flex items-center gap-2">
              <Switch checked={p.is_active} onCheckedChange={async (v) => {
                await supabase.from("plans").update({ is_active: v }).eq("id", p.id);
                qc.invalidateQueries({ queryKey: ["site-plans"] });
              }} />
              <Input type="number" defaultValue={p.price_cents / 100} className="w-28" onBlur={async (e) => {
                await supabase.from("plans").update({ price_cents: Math.round(Number(e.target.value) * 100) }).eq("id", p.id);
                qc.invalidateQueries({ queryKey: ["site-plans"] });
              }} />
              <span className="text-xs text-muted-foreground">R$</span>
            </div>
          </div>
          <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5">
            {p.benefits.map((b: string, i: number) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [title, setTitle] = useState(data?.hero_title ?? "");
  const [subtitle, setSubtitle] = useState(data?.hero_subtitle ?? "");
  const [terms, setTerms] = useState(data?.terms ?? "");
  const [privacy, setPrivacy] = useState(data?.privacy ?? "");

  async function save() {
    const { error } = await supabase.from("site_settings").upsert({
      id: 1, hero_title: title, hero_subtitle: subtitle, terms, privacy,
    });
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  }

  return (
    <div className="space-y-3">
      <Input placeholder="Hero title" defaultValue={data?.hero_title ?? ""} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="Hero subtitle" defaultValue={data?.hero_subtitle ?? ""} onChange={(e) => setSubtitle(e.target.value)} />
      <Textarea placeholder="Termos de uso" rows={5} defaultValue={data?.terms ?? ""} onChange={(e) => setTerms(e.target.value)} />
      <Textarea placeholder="Política de privacidade" rows={5} defaultValue={data?.privacy ?? ""} onChange={(e) => setPrivacy(e.target.value)} />
      <Button onClick={save}><Save className="mr-2 size-4" /> Salvar</Button>
    </div>
  );
}
