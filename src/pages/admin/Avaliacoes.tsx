import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminAvaliacoes() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", status],
    queryFn: async () => {
      let q = supabase.from("reviews").select("*, establishments(name)").order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status as any);
      return (await q).data ?? [];
    },
  });

  async function setReviewStatus(id: string, next: string) {
    const { error } = await supabase.from("reviews").update({ status: next as any }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_action", { _action: `review.${next}`, _target_type: "review", _target_id: id, _meta: {} as never });
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  return (
    <>
      <AdminHeader title="Avaliações" subtitle="Modere avaliações deixadas por clientes." actions={
        <>
          <Input placeholder="Buscar autor, texto ou loja…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovado">Aprovadas</SelectItem>
              <SelectItem value="reprovado">Reprovadas</SelectItem>
            </SelectContent>
          </Select>
        </>
      } />
      <div className="p-6 space-y-3">
        {isLoading ? <Loader2 className="size-5 animate-spin" /> : (() => {
          const term = search.trim().toLowerCase();
          const filtered = (data ?? []).filter((r: any) => !term ||
            r.author?.toLowerCase().includes(term) ||
            r.text?.toLowerCase().includes(term) ||
            r.establishments?.name?.toLowerCase().includes(term));
          if (filtered.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma avaliação.</p>;
          return filtered.map((r: any) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.author} · {"★".repeat(r.rating)} <span className="text-xs text-muted-foreground">em {r.establishments?.name}</span></div>
              <div className="flex items-center gap-2">
                {r.reported_count > 0 && <Badge variant="destructive">{r.reported_count} denúncias</Badge>}
                <Badge variant="secondary">{r.status}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            <div className="mt-3 flex gap-2">
              {r.status !== "aprovado" && <Button size="sm" onClick={() => setReviewStatus(r.id, "aprovado")}>Aprovar</Button>}
              {r.status !== "reprovado" && <Button size="sm" variant="outline" onClick={() => setReviewStatus(r.id, "reprovado")}>Ocultar</Button>}
              <Button size="sm" variant="destructive" onClick={async () => {
                await supabase.from("reviews").delete().eq("id", r.id);
                qc.invalidateQueries({ queryKey: ["admin-reviews"] });
              }}>Excluir</Button>
            </div>
          </div>
          ));
        })()}
      </div>
    </>
  );
}
