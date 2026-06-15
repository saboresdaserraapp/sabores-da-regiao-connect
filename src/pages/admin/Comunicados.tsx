import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminComunicados() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("sent_at", { ascending: false })).data ?? [],
  });

  async function send() {
    if (!title.trim() || !body.trim()) return toast.error("Preencha título e mensagem");
    setSending(true);
    try {
      const filter: Record<string, string> = {};
      if (audience !== "all" && audienceFilter) filter[audience] = audienceFilter;

      const { data: ann, error } = await supabase.from("announcements").insert({
        title, body, audience, audience_filter: filter as never, send_email: sendEmail, created_by: user?.id,
      }).select().single();
      if (error) throw error;

      // Build recipients
      let q = supabase.from("establishments").select("id");
      if (audience === "category" && audienceFilter) q = q.eq("category", audienceFilter);
      else if (audience === "city" && audienceFilter) q = q.eq("city", audienceFilter);
      else if (audience === "plan" && audienceFilter) q = q.eq("plan_id", audienceFilter);
      const { data: targets } = await q;

      if (targets && targets.length) {
        await supabase.from("announcement_recipients").insert(
          targets.map((t) => ({ announcement_id: ann.id, establishment_id: t.id }))
        );
      }

      if (sendEmail) {
        try {
          await supabase.functions.invoke("send-announcement-email", { body: { announcement_id: ann.id } });
        } catch { /* silent */ }
      }

      await supabase.rpc("log_action", { _action: "announcement.create", _target_type: "announcement", _target_id: ann.id, _meta: { audience } as never });

      toast.success(`Comunicado enviado a ${targets?.length ?? 0} estabelecimento(s).`);
      setOpen(false); setTitle(""); setBody(""); setAudience("all"); setAudienceFilter(""); setSendEmail(false);
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar");
    } finally { setSending(false); }
  }

  return (
    <>
      <AdminHeader title="Comunicados" subtitle="Envie avisos aos estabelecimentos." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" /> Novo comunicado</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo comunicado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Título</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Atualização da plataforma" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mensagem (markdown)</label>
                <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Olá! Temos uma novidade…" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Audiência</label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="category">Por categoria</SelectItem>
                      <SelectItem value="city">Por cidade</SelectItem>
                      <SelectItem value="plan">Por plano (id)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Filtro</label>
                  <Input value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)} placeholder={audience === "all" ? "—" : "valor"} disabled={audience === "all"} />
                </div>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="inline-flex items-center gap-2 text-sm"><Mail className="size-4" /> Enviar também por e-mail</span>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </label>
              <Button onClick={send} disabled={sending} className="w-full">
                {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />} Enviar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      } />
      <div className="p-6 space-y-3">
        {isLoading ? <Loader2 className="size-5 animate-spin" /> : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum comunicado enviado.</p>
        ) : (data ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{a.title}</h3>
              <div className="text-xs text-muted-foreground">{new Date(a.sent_at).toLocaleString("pt-BR")}</div>
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Audiência: {a.audience}{a.send_email ? " · E-mail enviado" : ""}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
