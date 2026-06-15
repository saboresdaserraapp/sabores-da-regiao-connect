import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function AdminDenuncias() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("pendente");
  const [type, setType] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", status, type],
    queryFn: async () => {
      let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status as any);
      if (type !== "all") q = q.eq("target_type", type);
      return (await q).data ?? [];
    },
  });

  async function resolve(id: string, next: "resolvido" | "descartado") {
    const { error } = await supabase.from("reports").update({
      status: next,
      resolved_by: user?.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_action", { _action: `report.${next}`, _target_type: "report", _target_id: id, _meta: {} as never });
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  return (
    <>
      <AdminHeader title="Denúncias" actions={
        <>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="resolvido">Resolvidas</SelectItem>
              <SelectItem value="descartado">Descartadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="review">Avaliação</SelectItem>
              <SelectItem value="establishment">Estabelecimento</SelectItem>
              <SelectItem value="product">Produto</SelectItem>
            </SelectContent>
          </Select>
        </>
      } />
      <div className="p-6 space-y-3">
        {isLoading ? <Loader2 className="size-5 animate-spin" /> : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem denúncias.</p>
        ) : (data ?? []).map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm"><Badge variant="secondary">{r.target_type}</Badge> <span className="font-mono text-xs">{r.target_id}</span></div>
              <Badge>{r.status}</Badge>
            </div>
            <p className="mt-2 text-sm">{r.reason}</p>
            <div className="mt-3 text-xs text-muted-foreground">Recebido em {new Date(r.created_at).toLocaleString("pt-BR")}</div>
            {r.status === "pendente" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => resolve(r.id, "resolvido")}>Marcar resolvida</Button>
                <Button size="sm" variant="outline" onClick={() => resolve(r.id, "descartado")}>Descartar</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
