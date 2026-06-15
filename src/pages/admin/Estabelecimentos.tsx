import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ExternalLink, Check, Ban, Power, Sparkles, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type Status = "pendente" | "ativo" | "suspenso" | "inativo";

export default function AdminEstabelecimentos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-estabs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("establishments")
        .select("id,slug,name,category,category_label,city,neighborhood,status,plan_id,rating,reviews_count,last_menu_update_at,menu_type,plans(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: siteCats } = useQuery({
    queryKey: ["site-cats-select"],
    queryFn: async () => (await supabase.from("site_categories").select("key,label,emoji").order("position")).data ?? [],
  });
  const { data: plans } = useQuery({
    queryKey: ["plans-select"],
    queryFn: async () => (await supabase.from("plans").select("id,name").order("position")).data ?? [],
  });
  const categories = useMemo(() => (siteCats ?? []).map((c) => c.key), [siteCats]);
  const filtered = (data ?? []).filter((e) => {
    if (status !== "all" && e.status !== status) return false;
    if (category !== "all" && e.category !== category) return false;
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function setEstabStatus(id: string, next: Status) {
    const { error } = await supabase.from("establishments").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_action", { _action: `establishment.${next}`, _target_type: "establishment", _target_id: id, _meta: {} as never });
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin-estabs"] });
  }

  async function toggleMenuType(id: string, current: string) {
    const next = current === "exclusivo" ? "essencial" : "exclusivo";
    const { error } = await supabase.from("establishments").update({ menu_type: next }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_action", { _action: `establishment.menu_type.${next}`, _target_type: "establishment", _target_id: id, _meta: {} as never });
    toast.success(next === "exclusivo" ? "Promovido a Premium" : "Rebaixado para Essencial");
    qc.invalidateQueries({ queryKey: ["admin-estabs"] });
  }

  return (
    <>
      <AdminHeader title="Estabelecimentos" subtitle={`${filtered.length} resultado(s)`} />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {(siteCats ?? []).map((c) => <SelectItem key={c.key} value={c.key}>{c.emoji ? `${c.emoji} ` : ""}{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4 mr-1" /> Nova loja</Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Cardápio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <Link to={`/admin/estabelecimentos/${e.id}`} className="hover:text-primary inline-flex items-center gap-1">
                        {e.name} <ExternalLink className="size-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{e.category_label || e.category}</TableCell>
                    <TableCell className="text-xs">{e.city}{e.neighborhood ? ` · ${e.neighborhood}` : ""}</TableCell>
                    <TableCell>{e.plans?.name ?? "—"}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleMenuType(e.id, e.menu_type)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:border-primary"
                        title={e.menu_type === "exclusivo" ? "Rebaixar para Essencial" : "Promover a Premium"}
                      >
                        {e.menu_type === "exclusivo" ? (
                          <><Sparkles className="size-3 text-primary" /> Premium</>
                        ) : (
                          <>Essencial</>
                        )}
                      </button>
                    </TableCell>
                    <TableCell><Badge variant={e.status === "ativo" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                    <TableCell>{Number(e.rating ?? 0).toFixed(1)} ({e.reviews_count})</TableCell>
                    <TableCell className="text-right space-x-1">
                      {e.status !== "ativo" && <Button size="sm" variant="outline" onClick={() => setEstabStatus(e.id, "ativo")}><Check className="size-3.5" /></Button>}
                      {e.status !== "suspenso" && <Button size="sm" variant="outline" onClick={() => setEstabStatus(e.id, "suspenso")}><Ban className="size-3.5" /></Button>}
                      {e.status !== "inativo" && <Button size="sm" variant="outline" onClick={() => setEstabStatus(e.id, "inativo")}><Power className="size-3.5" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Nenhum estabelecimento.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <NovaLojaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        siteCats={siteCats ?? []}
        plans={plans ?? []}
        onCreated={(id) => { qc.invalidateQueries({ queryKey: ["admin-estabs"] }); navigate(`/admin/estabelecimentos/${id}`); }}
      />
    </>
  );
}

function NovaLojaDialog({ open, onOpenChange, siteCats, plans, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  siteCats: { key: string; label: string; emoji: string | null }[];
  plans: { id: string; name: string }[];
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({ name: "", category: "", city: "", neighborhood: "", whatsapp: "", plan_id: "", owner_email: "" });
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!form.name || !form.category) { toast.error("Nome e categoria são obrigatórios."); return; }
    setLoading(true);
    try {
      let owner_id: string | null = null;
      if (form.owner_email.trim()) {
        const { data: uid, error: e1 } = await supabase.rpc("admin_find_user_by_email", { _email: form.owner_email.trim() });
        if (e1) { toast.error(e1.message); setLoading(false); return; }
        if (!uid) { toast.error("Usuário com este e-mail não foi encontrado."); setLoading(false); return; }
        owner_id = uid as string;
      }
      const cat = siteCats.find((c) => c.key === form.category);
      const { data: ins, error } = await supabase.from("establishments").insert({
        name: form.name,
        category: form.category,
        category_label: cat?.label ?? form.category,
        city: form.city || null,
        neighborhood: form.neighborhood || null,
        whatsapp: form.whatsapp || null,
        plan_id: form.plan_id || null,
        owner_id,
        approval_status: "approved",
        is_public: true,
        status: "ativo",
      } as never).select("id").single();
      if (error) throw error;
      toast.success("Loja criada");
      onOpenChange(false);
      onCreated((ins as { id: string }).id);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar loja");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova loja</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Categoria">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {siteCats.map((c) => <SelectItem key={c.key} value={c.key}>{c.emoji ? `${c.emoji} ` : ""}{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Bairro"><Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></Field>
          </div>
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999990000" /></Field>
          <Field label="Plano">
            <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
              <SelectTrigger><SelectValue placeholder="Sem plano definido" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="E-mail do dono (opcional)"><Input value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} placeholder="dono@exemplo.com" /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Criar loja"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
