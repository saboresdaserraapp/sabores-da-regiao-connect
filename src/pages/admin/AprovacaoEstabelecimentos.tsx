import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Pencil, Pause, Play } from "lucide-react";
import { toast } from "sonner";

type Req = {
  id: string; establishment_id: string; owner_id: string; status: string;
  submitted_data_json: any; admin_notes: string | null; rejection_reason: string | null;
  correction_requested_fields_json: any; created_at: string;
  establishments?: { name: string; slug: string; logo: string | null; cover: string | null; status: string; approval_status: string | null; plan_id: string | null } | null;
};

export default function AprovacaoEstabelecimentos() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending_approval");
  const [openReq, setOpenReq] = useState<Req | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "correction" | null>(null);
  const [note, setNote] = useState("");

  const { data: reqs, isLoading } = useQuery({
    queryKey: ["approval-reqs", statusFilter],
    queryFn: async (): Promise<Req[]> => {
      const { data } = await supabase
        .from("establishment_approval_requests")
        .select("*, establishments(name,slug,logo,cover,status,approval_status,plan_id)")
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });
      return (data ?? []) as any;
    },
  });

  const apply = async () => {
    if (!openReq || !action) return;
    let newReqStatus = openReq.status;
    let newEstabStatus: any = null;
    let newApproval: string | null = null;

    if (action === "approve") { newReqStatus = "approved"; newEstabStatus = "ativo"; newApproval = "approved"; }
    if (action === "reject") { newReqStatus = "rejected"; newApproval = "rejected"; }
    if (action === "correction") { newReqStatus = "correction_requested"; newApproval = "correction_requested"; }

    const upd: any = { status: newReqStatus, reviewed_at: new Date().toISOString() };
    if (action === "reject") upd.rejection_reason = note;
    if (action === "correction") {
      upd.admin_notes = note;
      upd.correction_requested_fields_json = note.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    }
    if (action === "approve") upd.admin_notes = note || null;

    const { error: e1 } = await supabase.from("establishment_approval_requests").update(upd).eq("id", openReq.id);
    if (e1) return toast.error(e1.message);

    const estabUpd: any = { approval_status: newApproval };
    if (newEstabStatus) estabUpd.status = newEstabStatus;
    const { error: e2 } = await supabase.from("establishments").update(estabUpd).eq("id", openReq.establishment_id);
    if (e2) return toast.error(e2.message);

    toast.success("Atualizado");
    setOpenReq(null); setAction(null); setNote("");
    qc.invalidateQueries({ queryKey: ["approval-reqs"] });
  };

  const setApproval = async (estabId: string, approval: string, status?: string) => {
    const upd: any = { approval_status: approval };
    if (status) upd.status = status;
    const { error } = await supabase.from("establishments").update(upd).eq("id", estabId);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["approval-reqs"] });
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Aprovação de Estabelecimentos</h1>
        <p className="text-sm text-muted-foreground">Revise cadastros enviados pelos donos das lojas.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["pending_approval", "correction_requested", "approved", "rejected", "suspended"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs ${statusFilter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando…</div>}
        {!isLoading && (reqs ?? []).length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum pedido neste status.</div>}
        {(reqs ?? []).map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <div className="grid size-10 place-items-center rounded-lg bg-muted overflow-hidden">
              {r.establishments?.logo ? <img src={r.establishments.logo} className="size-full object-cover" alt="" /> : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{r.establishments?.name ?? "(sem nome)"}</div>
              <div className="text-xs text-muted-foreground">/{r.establishments?.slug} · enviado {new Date(r.created_at).toLocaleString("pt-BR")}</div>
            </div>
            <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
            <Button size="sm" variant="outline" onClick={() => setOpenReq(r)}>Abrir</Button>
            {r.establishments?.approval_status === "approved" && (
              <Button size="sm" variant="ghost" onClick={() => setApproval(r.establishment_id, "suspended", "suspenso")} title="Suspender">
                <Pause className="size-4" />
              </Button>
            )}
            {r.establishments?.approval_status === "suspended" && (
              <Button size="sm" variant="ghost" onClick={() => setApproval(r.establishment_id, "approved", "ativo")} title="Reativar">
                <Play className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!openReq} onOpenChange={(o) => !o && (setOpenReq(null), setAction(null))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{openReq?.establishments?.name}</DialogTitle></DialogHeader>
          {openReq && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs max-h-72 overflow-auto">
                <pre className="whitespace-pre-wrap">{JSON.stringify(openReq.submitted_data_json, null, 2)}</pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setAction("approve")} variant={action === "approve" ? "default" : "outline"}><Check className="mr-1 size-4" /> Aprovar e publicar loja</Button>
                <Button size="sm" onClick={() => setAction("correction")} variant={action === "correction" ? "default" : "outline"}><Pencil className="mr-1 size-4" /> Solicitar correção</Button>
                <Button size="sm" onClick={() => setAction("reject")} variant={action === "reject" ? "destructive" : "outline"}><X className="mr-1 size-4" /> Reprovar</Button>
              </div>
              {action === "approve" && (
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-xs text-foreground">
                  Ao aprovar, a loja será publicada, o cardápio público será criado e ela passará a aparecer na busca do app.
                </div>
              )}
              {action && (
                <Textarea rows={3} placeholder={
                  action === "reject" ? "Motivo da recusa (obrigatório)"
                    : action === "correction" ? "Campos/itens a corrigir (vírgula ou linha)"
                    : "Observações (opcional)"
                } value={note} onChange={(e) => setNote(e.target.value)} />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenReq(null); setAction(null); }}>Fechar</Button>
            <Button onClick={apply} disabled={!action || (action !== "approve" && !note.trim())}>
              {action === "approve" ? "Aprovar e publicar" : "Aplicar"}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
