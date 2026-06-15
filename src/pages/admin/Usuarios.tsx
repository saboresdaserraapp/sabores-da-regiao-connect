import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ROLE_LABEL, useAuth, type AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Trash2, Pencil, KeyRound, Search } from "lucide-react";

const ROLES: AppRole[] = ["super_admin", "admin_operacional", "analista_comercial", "suporte", "establishment_owner"];

export default function AdminUsuarios() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const isSuper = hasRole("super_admin");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [editing, setEditing] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profiles, roles, fav, ord] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("favorites").select("user_id"),
        supabase.from("orders").select("user_id"),
      ]);
      const roleMap = new Map<string, AppRole[]>();
      (roles.data ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        roleMap.set(r.user_id, arr);
      });
      const favCount = new Map<string, number>();
      (fav.data ?? []).forEach((f: any) => favCount.set(f.user_id, (favCount.get(f.user_id) ?? 0) + 1));
      const ordCount = new Map<string, number>();
      (ord.data ?? []).forEach((o: any) => o.user_id && ordCount.set(o.user_id, (ordCount.get(o.user_id) ?? 0) + 1));
      return (profiles.data ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
        favorites_count: favCount.get(p.id) ?? 0,
        orders_count: ordCount.get(p.id) ?? 0,
      }));
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((u: any) => {
      if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (!(u.display_name ?? "").toLowerCase().includes(needle) && !(u.phone ?? "").includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, roleFilter]);

  async function addRole(uid: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success("Papel atribuído");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function removeRole(uid: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Papel removido");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function sendReset(u: any) {
    const email = u.display_name && u.display_name.includes("@") ? u.display_name : prompt("Informe o e-mail do usuário:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("E-mail de redefinição enviado");
  }

  async function saveProfile(form: { id: string; display_name: string; phone: string }) {
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name,
      phone: form.phone,
    }).eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <>
      <AdminHeader title="Usuários & papéis" subtitle={`${filtered.length} usuário(s)${isSuper ? "" : " · visualização apenas"}`} />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Buscar nome ou telefone…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64 pl-8" />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | "all")}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Papel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {isLoading ? <div className="p-10"><Loader2 className="size-5 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Favoritos</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.display_name || u.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="text-xs">{u.phone ?? "—"}</TableCell>
                    <TableCell>{u.orders_count}</TableCell>
                    <TableCell>{u.favorites_count}</TableCell>
                    <TableCell className="space-x-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {u.roles.map((r: AppRole) => (
                        <Badge key={r} variant="secondary" className="inline-flex items-center gap-1">
                          {ROLE_LABEL[r]}
                          {isSuper && <button onClick={() => removeRole(u.id, r)}><Trash2 className="size-3" /></button>}
                        </Badge>
                      ))}
                      {isSuper && (
                        <Select onValueChange={(v) => addRole(u.id, v as AppRole)}>
                          <SelectTrigger className="mt-1 w-40 h-7 text-xs"><SelectValue placeholder="+ Adicionar" /></SelectTrigger>
                          <SelectContent>
                            {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(u)}><Pencil className="size-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => sendReset(u)} title="Enviar redefinição de senha"><KeyRound className="size-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Nome</label>
                <Input defaultValue={editing.display_name ?? ""} onChange={(e) => (editing.display_name = e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Telefone</label>
                <Input defaultValue={editing.phone ?? ""} onChange={(e) => (editing.phone = e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && saveProfile({ id: editing.id, display_name: editing.display_name ?? "", phone: editing.phone ?? "" })}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
