import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, ROLE_LABEL, type EstablishmentRole } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection, Gated } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Member = { id: string; user_id: string; role: EstablishmentRole; created_at: string; email?: string };

export default function Equipe() {
  const { ctx } = useActiveEstablishment();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EstablishmentRole>("manager");
  const [loading, setLoading] = useState(false);
  const canPermissions = ctx ? canUseFeature(ctx, "team_permissions") : false;

  async function refresh() {
    if (!ctx) return;
    const { data } = await supabase.from("establishment_owners")
      .select("id,user_id,role,created_at")
      .eq("establishment_id", ctx.establishmentId);
    setMembers((data ?? []) as any);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ctx?.establishmentId]);

  async function invite() {
    if (!ctx || !email.trim()) return;
    setLoading(true);
    // procurar profile pelo email/display_name (limitação: precisamos user_id)
    const { data: prof } = await supabase.from("profiles")
      .select("id, display_name").ilike("display_name", email.trim()).maybeSingle();
    if (!prof) {
      toast.error("Usuário não encontrado. Peça para a pessoa criar conta primeiro com este e-mail.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("establishment_owners").insert({
      establishment_id: ctx.establishmentId,
      user_id: prof.id,
      role,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Membro adicionado");
    setEmail("");
    refresh();
  }

  async function changeRole(m: Member, newRole: EstablishmentRole) {
    const { error } = await supabase.from("establishment_owners")
      .update({ role: newRole }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  async function remove(m: Member) {
    if (m.role === "owner") { toast.error("Não é possível remover o dono."); return; }
    const { error } = await supabase.from("establishment_owners").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  if (!ctx) return null;

  return (
    <PainelSection title="Equipe e permissões" subtitle="Convide colaboradores para a operação desta loja. Cada papel libera apenas as áreas pertinentes.">
      <Gated feature="team_basic">
        <div className="rounded-xl border border-border p-3 mb-4">
          <div className="text-xs font-semibold mb-2">Convidar membro</div>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-[220px] flex-1" placeholder="Nome do perfil (display_name)"
              value={email} onChange={e => setEmail(e.target.value)} />
            <Select value={role} onValueChange={(v) => setRole(v as EstablishmentRole)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">{ROLE_LABEL.manager}</SelectItem>
                <SelectItem value="attendant" disabled={!canPermissions}>{ROLE_LABEL.attendant}{!canPermissions && " (Premium)"}</SelectItem>
                <SelectItem value="menu_editor" disabled={!canPermissions}>{ROLE_LABEL.menu_editor}{!canPermissions && " (Premium)"}</SelectItem>
                <SelectItem value="finance" disabled={!canPermissions}>{ROLE_LABEL.finance}{!canPermissions && " (Premium)"}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={invite} disabled={loading}><UserPlus className="size-4 mr-1" /> Adicionar</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Papéis avançados (atendente, editor de cardápio, financeiro) exigem plano <strong>Gestão Premium</strong>.
          </p>
        </div>

        <div className="space-y-2">
          {members.length === 0 && <p className="text-sm text-muted-foreground">Apenas o dono nesta loja.</p>}
          {members.map(m => (
            <div key={m.id} className="rounded-lg border border-border p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">{m.user_id}</div>
                <Badge variant="outline" className="mt-1 text-[10px]">{ROLE_LABEL[m.role] ?? m.role}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select value={m.role} disabled={m.role === "owner"} onValueChange={(v) => changeRole(m, v as EstablishmentRole)}>
                  <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {m.role === "owner" && <SelectItem value="owner">{ROLE_LABEL.owner}</SelectItem>}
                    <SelectItem value="manager">{ROLE_LABEL.manager}</SelectItem>
                    <SelectItem value="attendant" disabled={!canPermissions}>{ROLE_LABEL.attendant}</SelectItem>
                    <SelectItem value="menu_editor" disabled={!canPermissions}>{ROLE_LABEL.menu_editor}</SelectItem>
                    <SelectItem value="finance" disabled={!canPermissions}>{ROLE_LABEL.finance}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" disabled={m.role === "owner"} onClick={() => remove(m)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Gated>
    </PainelSection>
  );
}
