import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import { ROLE_LABEL, type AppRole } from "@/hooks/useAuth";

export default function AdminAuditoria() {
  const [action, setAction] = useState("");
  const [type, setType] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", type, action],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (type !== "all") q = q.eq("target_type", type);
      if (action) q = q.ilike("action", `%${action}%`);
      return (await q).data ?? [];
    },
  });

  return (
    <>
      <AdminHeader title="Auditoria" subtitle="Histórico de ações administrativas." actions={
        <>
          <Input placeholder="Filtrar ação…" value={action} onChange={(e) => setAction(e.target.value)} className="w-56" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="establishment">Estabelecimento</SelectItem>
              <SelectItem value="review">Avaliação</SelectItem>
              <SelectItem value="report">Denúncia</SelectItem>
              <SelectItem value="announcement">Comunicado</SelectItem>
            </SelectContent>
          </Select>
        </>
      } />
      <div className="p-6">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {isLoading ? <div className="p-10"><Loader2 className="size-5 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tipo / alvo</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs">{l.action}</TableCell>
                    <TableCell className="text-xs">{l.target_type} <span className="text-muted-foreground">{l.target_id?.slice(0, 8)}</span></TableCell>
                    <TableCell className="text-xs">{l.actor_role ? ROLE_LABEL[l.actor_role as AppRole] : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild><Button size="icon" variant="ghost"><Eye className="size-4" /></Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
                          <pre className="text-xs overflow-auto rounded bg-muted p-3">{JSON.stringify(l.meta, null, 2)}</pre>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Sem registros.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
