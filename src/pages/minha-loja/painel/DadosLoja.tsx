import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EyeOff, Loader2, RefreshCw } from "lucide-react";

function friendlyPublishError(err: any): string {
  const msg = String(err?.message ?? err ?? "");
  const code = String(err?.code ?? "");
  if (code === "42501" || /permission|rls|denied|acesso negado/i.test(msg)) {
    return "Você não tem permissão para alterar a visibilidade desta loja. Apenas o dono autenticado pode publicar ou despublicar.";
  }
  if (/network|fetch|timeout/i.test(msg)) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }
  return msg || "Não foi possível atualizar a visibilidade da loja.";
}

export default function DadosLoja() {
  const { ctx } = useActiveEstablishment();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [pendingNext, setPendingNext] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ctx) return;
    supabase.from("establishments").select("*").eq("id", ctx.establishmentId).maybeSingle()
      .then(({ data }) => setForm(data));
  }, [ctx?.establishmentId]);

  if (!ctx || !form) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("establishments").update({
      name: form.name, tagline: form.tagline, description: form.description,
      category: form.category, category_label: form.category_label,
      whatsapp: form.whatsapp, address: form.address,
      neighborhood: form.neighborhood, city: form.city,
    }).eq("id", ctx.establishmentId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Dados salvos");
  };

  const isApproved = form.approval_status === "approved";
  const isAtivo = form.status === "ativo";
  const isPublic = !!form.is_public;
  const canTogglePublic = isApproved && isAtivo;
  const approvedButHidden = isApproved && isAtivo && !isPublic;

  const runTogglePublic = async (nextValue: boolean) => {
    if (!canTogglePublic) return;
    setTogglingPublic(true);
    setPublishError(null);
    setPendingNext(nextValue);
    const next = nextValue;
    const { error } = await supabase
      .from("establishments")
      .update({ is_public: next, ...(next && !form.published_at ? { published_at: new Date().toISOString() } : {}) })
      .eq("id", ctx.establishmentId);
    setTogglingPublic(false);
    if (error) {
      const friendly = friendlyPublishError(error);
      setPublishError(friendly);
      toast.error(friendly, {
        action: {
          label: "Tentar novamente",
          onClick: () => runTogglePublic(nextValue),
        },
      });
      return;
    }
    setPendingNext(null);
    setForm((f: any) => ({ ...f, is_public: next, published_at: next && !form.published_at ? new Date().toISOString() : form.published_at }));
    toast.success(next ? "Loja publicada — já aparece nas listagens." : "Loja despublicada — não aparece mais nas listagens.");
  };

  const togglePublic = () => runTogglePublic(!isPublic);
  const retryPublish = () => {
    if (pendingNext !== null) runTogglePublic(pendingNext);
    else runTogglePublic(!isPublic);
  };

  return (
    <PainelSection title="Dados da loja" subtitle="Informações públicas exibidas no app">
      {canTogglePublic && (
        <div className="mb-4 space-y-3" data-testid="store-publish-section">
          {approvedButHidden && (
            <Alert variant="destructive" data-testid="store-hidden-warning">
              <EyeOff className="h-4 w-4" />
              <AlertTitle>Sua loja está aprovada, mas oculta</AlertTitle>
              <AlertDescription>
                <div className="space-y-1">
                  <p>Clientes não conseguem ver sua loja nas listagens. Publique para aparecer na home e na loja.</p>
                  <ul className="text-xs list-disc list-inside opacity-90">
                    <li>Status do cadastro: <strong>Aprovada</strong></li>
                    <li>Operação: <strong>{isAtivo ? "Ativa" : "Inativa"}</strong></li>
                    <li>Visibilidade pública: <strong>Oculta</strong></li>
                    <li>Motivo: você (ou um administrador) marcou como despublicada. Clique em <em>Publicar loja</em> para reverter.</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {publishError && (
            <Alert variant="destructive" data-testid="store-publish-error">
              <AlertTitle>Não foi possível atualizar a visibilidade</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{publishError}</p>
                <Button
                  data-testid="store-publish-retry"
                  size="sm"
                  variant="outline"
                  onClick={retryPublish}
                  disabled={togglingPublic}
                >
                  {togglingPublic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="text-sm">
              <div className="font-medium">Visibilidade pública</div>
              <div className="text-muted-foreground">
                {isPublic
                  ? "Sua loja está visível para os clientes."
                  : "Sua loja está oculta das listagens."}
                {" "}
                <span data-testid="store-publish-status" className="font-medium">
                  ({isApproved ? "Aprovada" : "—"} · {isAtivo ? "Ativa" : "Inativa"} · {isPublic ? "Visível" : "Oculta"})
                </span>
              </div>
            </div>
            <Button
              data-testid="toggle-public-btn"
              variant={isPublic ? "outline" : "default"}
              onClick={togglePublic}
              disabled={togglingPublic}
              aria-busy={togglingPublic || undefined}
            >
              {togglingPublic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {togglingPublic
                ? (pendingNext ? "Publicando…" : "Despublicando…")
                : (isPublic ? "Despublicar loja" : "Publicar loja")}
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Nome</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Categoria</Label><Input value={form.category_label ?? ""} onChange={(e) => set("category_label", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Slogan</Label><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></div>
        <div><Label>Endereço</Label><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div><Label>Bairro</Label><Input value={form.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} /></div>
        <div><Label>Cidade</Label><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
      </div>
      <Button onClick={save} disabled={saving} className="mt-4">{saving ? "Salvando…" : "Salvar"}</Button>
    </PainelSection>
  );
}
