import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ExternalLink, Check, Ban, Power, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Status = "pendente" | "ativo" | "suspenso" | "inativo";

export default function AdminEstabelecimentos() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [category, setCategory] = useState<string>("all");

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

  const categories = useMemo(() => Array.from(new Set((data ?? []).map((e) => e.category))).sort(), [data]);
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
        <div className="flex flex-wrap gap-2">
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
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
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
    </>
  );
}
