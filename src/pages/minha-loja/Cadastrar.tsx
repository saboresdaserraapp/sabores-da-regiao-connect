import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaUploader } from "@/components/media/MediaUploader";

const STEPS = ["Dados básicos", "Localização", "Atendimento", "Identidade visual", "Plano"];
const DRAFT_KEY = "minha-loja:cadastro-rascunho:v1";

type FormState = {
  name: string; category: string; secondary_categories: string; description: string; story: string;
  owner_name: string; owner_phone: string; owner_email: string; whatsapp: string; instagram: string;
  city: string; neighborhood: string; street: string; number: string; complement: string;
  reference: string; popular_place: string; location_link: string; access_note: string;
  delivery: boolean; pickup: boolean; dine_in: boolean;
  hours: string; days: string; prep_time: string; payments: string; delivery_rules: string;
  fee_model: "to_confirm" | "fixed" | "by_region"; fixed_fee: string;
  logo: string; cover: string; gallery: string; brand_color: string; tagline: string;
  plan_slug: "presenca" | "essencial" | "exclusivo" | "gestao";
};

const DEFAULTS: FormState = {
  name: "", category: "", secondary_categories: "", description: "", story: "",
  owner_name: "", owner_phone: "", owner_email: "", whatsapp: "", instagram: "",
  city: "", neighborhood: "", street: "", number: "", complement: "",
  reference: "", popular_place: "", location_link: "", access_note: "",
  delivery: true, pickup: true, dine_in: false,
  hours: "", days: "", prep_time: "", payments: "Pix, Dinheiro", delivery_rules: "",
  fee_model: "to_confirm", fixed_fee: "",
  logo: "", cover: "", gallery: "", brand_color: "", tagline: "",
  plan_slug: "presenca",
};

export default function MinhaLojaCadastrar() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState<FormState>(() => {
    try { const r = localStorage.getItem(DRAFT_KEY); if (r) return { ...DEFAULTS, ...JSON.parse(r) }; } catch {}
    return DEFAULTS;
  });
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch {} }, [f]);

  const { data: cats } = useQuery({
    queryKey: ["site-cats"],
    queryFn: async () => (await supabase.from("site_categories").select("key,label,emoji").eq("visible", true).order("position")).data ?? [],
  });
  const { data: plans } = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => (await supabase.from("plans").select("id,name,slug,price_cents,benefits,features_json").eq("is_active", true).order("position")).data ?? [],
  });

  const u = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }));
  const tierUnlocks = useMemo(() => ({
    branding: ["exclusivo", "gestao"].includes(f.plan_slug),
  }), [f.plan_slug]);

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!f.name.trim()) return "Informe o nome do estabelecimento";
      if (!f.category) return "Selecione a categoria principal";
      if (!f.owner_name.trim()) return "Informe o nome do responsável";
      if (!f.whatsapp.trim()) return "Informe o WhatsApp de pedidos";
    }
    if (step === 1) {
      if (!f.city.trim() || !f.neighborhood.trim() || !f.street.trim()) return "Preencha cidade, bairro e rua";
    }
    return null;
  };

  const next = () => { const err = validateStep(); if (err) return toast.error(err); setStep((s) => Math.min(STEPS.length - 1, s + 1)); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    if (!user) return toast.error("Faça login para enviar o cadastro");
    setSubmitting(true);
    try {
      const slug = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

      const catLabel = cats?.find((c: any) => c.key === f.category)?.label ?? f.category;
      const planRow = plans?.find((p: any) => p.slug === f.plan_slug);

      const { data: ins, error } = await supabase.from("establishments").insert({
        slug, name: f.name, tagline: f.tagline || null, description: f.description || null, story: f.story || null,
        category: f.category, category_label: catLabel,
        cover: f.cover || null, logo: f.logo || null,
        gallery: f.gallery ? f.gallery.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : [],
        address: [f.street, f.number].filter(Boolean).join(", ") || null,
        neighborhood: f.neighborhood, city: f.city,
        whatsapp: f.whatsapp.replace(/\D/g, ""),
        services: [f.delivery && "entrega", f.pickup && "retirada", f.dine_in && "local"].filter(Boolean) as string[],
        payments: f.payments.split(",").map((p) => p.trim()).filter(Boolean),
        delivery_fee: f.fee_model === "fixed" ? Number(f.fixed_fee || 0) : null,
        hours: f.hours || null, eta_min: Number(f.prep_time) || null,
        brand_color: tierUnlocks.branding ? f.brand_color || null : null,
        plan_id: planRow?.id ?? null,
        status: "pendente" as any,
        approval_status: "pending_approval",
        owner_id: user.id,
      } as any).select("id").single();
      if (error) throw error;

      await supabase.from("establishment_approval_requests").insert({
        establishment_id: ins.id, owner_id: user.id, status: "pending_approval",
        submitted_data_json: f as any,
      } as any);

      if (planRow?.id) {
        await supabase.from("establishment_subscriptions").insert({
          establishment_id: ins.id, plan_id: planRow.id, status: "active",
        } as any);
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success("Cadastro enviado para análise");
      nav("/minha-loja/status", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Falha ao enviar cadastro");
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Header />
      <div className="container max-w-3xl py-8 space-y-6">
        <header>
          <h1 className="font-display text-2xl font-bold">Cadastrar minha loja</h1>
          <p className="text-sm text-muted-foreground">Após enviar, o administrador da plataforma irá revisar antes da publicação.</p>
        </header>

        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
              i === step ? "border-primary bg-primary/10 text-primary"
                : i < step ? "border-border text-foreground" : "border-border text-muted-foreground")}>
              {i < step ? <Check className="size-3" /> : <span className="grid size-4 place-items-center rounded-full bg-muted text-[10px]">{i + 1}</span>}
              {s}
            </li>
          ))}
        </ol>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card space-y-3">
          {step === 0 && <>
            <F label="Nome do estabelecimento *"><Input value={f.name} onChange={(e) => u({ name: e.target.value })} /></F>
            <F label="Categoria principal *">
              <select value={f.category} onChange={(e) => u({ category: e.target.value })} className="w-full rounded-xl border border-border bg-background p-2 text-sm">
                <option value="">Selecione…</option>
                {(cats ?? []).map((c: any) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
              </select>
            </F>
            <F label="Categorias secundárias (separadas por vírgula)"><Input value={f.secondary_categories} onChange={(e) => u({ secondary_categories: e.target.value })} /></F>
            <F label="Descrição curta"><Input value={f.description} onChange={(e) => u({ description: e.target.value })} maxLength={200} /></F>
            <F label="História do estabelecimento (opcional)"><Textarea rows={3} value={f.story} onChange={(e) => u({ story: e.target.value })} /></F>
            <div className="grid gap-3 md:grid-cols-2">
              <F label="Nome do responsável *"><Input value={f.owner_name} onChange={(e) => u({ owner_name: e.target.value })} /></F>
              <F label="Telefone do responsável"><Input value={f.owner_phone} onChange={(e) => u({ owner_phone: e.target.value })} /></F>
              <F label="E-mail do responsável"><Input value={f.owner_email} onChange={(e) => u({ owner_email: e.target.value })} /></F>
              <F label="WhatsApp de pedidos *"><Input value={f.whatsapp} onChange={(e) => u({ whatsapp: e.target.value })} placeholder="55 11 99999-9999" /></F>
              <F label="Instagram (opcional)"><Input value={f.instagram} onChange={(e) => u({ instagram: e.target.value })} placeholder="@minhaloja" /></F>
            </div>
          </>}

          {step === 1 && <>
            <div className="grid gap-3 md:grid-cols-2">
              <F label="Cidade *"><Input value={f.city} onChange={(e) => u({ city: e.target.value })} /></F>
              <F label="Bairro *"><Input value={f.neighborhood} onChange={(e) => u({ neighborhood: e.target.value })} /></F>
              <F label="Rua ou localidade *"><Input value={f.street} onChange={(e) => u({ street: e.target.value })} /></F>
              <F label="Número (se houver)"><Input value={f.number} onChange={(e) => u({ number: e.target.value })} /></F>
              <F label="Complemento"><Input value={f.complement} onChange={(e) => u({ complement: e.target.value })} /></F>
              <F label="Ponto de referência"><Input value={f.reference} onChange={(e) => u({ reference: e.target.value })} /></F>
              <F label="Nome popular da localidade"><Input value={f.popular_place} onChange={(e) => u({ popular_place: e.target.value })} /></F>
              <F label="Link de localização (opcional)"><Input value={f.location_link} onChange={(e) => u({ location_link: e.target.value })} placeholder="https://maps…" /></F>
            </div>
            <F label="Observação de acesso"><Textarea rows={2} value={f.access_note} onChange={(e) => u({ access_note: e.target.value })} /></F>
          </>}

          {step === 2 && <>
            <div className="grid grid-cols-3 gap-2">
              <Toggle label="Entrega" v={f.delivery} on={(v) => u({ delivery: v })} />
              <Toggle label="Retirada" v={f.pickup} on={(v) => u({ pickup: v })} />
              <Toggle label="Comer no local" v={f.dine_in} on={(v) => u({ dine_in: v })} />
            </div>
            <F label="Horários de funcionamento"><Input value={f.hours} onChange={(e) => u({ hours: e.target.value })} placeholder="Ex: 18h-23h" /></F>
            <F label="Dias de funcionamento"><Input value={f.days} onChange={(e) => u({ days: e.target.value })} placeholder="Ex: Ter a Dom" /></F>
            <F label="Tempo médio de preparo (min)"><Input value={f.prep_time} onChange={(e) => u({ prep_time: e.target.value })} /></F>
            <F label="Formas de pagamento aceitas"><Input value={f.payments} onChange={(e) => u({ payments: e.target.value })} placeholder="Pix, Crédito, Débito, Dinheiro" /></F>
            <F label="Regras de entrega (escritas pela loja)"><Textarea rows={3} value={f.delivery_rules} onChange={(e) => u({ delivery_rules: e.target.value })} /></F>
            <F label="Taxa de entrega">
              <div className="grid gap-2 md:grid-cols-3">
                {(["to_confirm", "fixed", "by_region"] as const).map((k) => (
                  <button key={k} onClick={() => u({ fee_model: k })}
                    className={cn("rounded-xl border p-3 text-left text-sm",
                      f.fee_model === k ? "border-primary bg-primary/5" : "border-border")}>
                    <div className="font-medium">{k === "to_confirm" ? "A confirmar (padrão)" : k === "fixed" ? "Taxa fixa" : "Por bairro/região"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {k === "to_confirm" ? "Sem cálculo automático" : k === "fixed" ? "Mesmo valor para todos" : "Configura depois no painel"}
                    </div>
                  </button>
                ))}
              </div>
              {f.fee_model === "fixed" && <Input className="mt-2" value={f.fixed_fee} onChange={(e) => u({ fixed_fee: e.target.value })} placeholder="Ex: 8.00" />}
            </F>
          </>}

          {step === 3 && <>
            <F label="Logo">
              <MediaUploader value={f.logo} onChange={(url) => u({ logo: url })} folder="establishments/logo" aspect="aspect-square" label="Enviar logo" maxSizeMB={4} />
            </F>
            <F label="Foto de capa">
              <MediaUploader value={f.cover} onChange={(url) => u({ cover: url })} folder="establishments/cover" aspect="aspect-[21/9]" label="Enviar capa" maxSizeMB={8} />
            </F>
            <F label="Galeria inicial (opcional)">
              <GalleryUploader value={f.gallery} onChange={(v) => u({ gallery: v })} />
            </F>
            <F label={<span className="flex items-center gap-1">Cor da marca {!tierUnlocks.branding && <Lock className="size-3 text-muted-foreground" />}</span>}>
              <Input value={f.brand_color} onChange={(e) => u({ brand_color: e.target.value })} disabled={!tierUnlocks.branding} placeholder="Ex: 20 85% 45%" />
              {!tierUnlocks.branding && <p className="mt-1 text-[11px] text-muted-foreground">Disponível no plano Exclusivo ou superior.</p>}
            </F>
            <F label={<span className="flex items-center gap-1">Slogan {!tierUnlocks.branding && <Lock className="size-3 text-muted-foreground" />}</span>}>
              <Input value={f.tagline} onChange={(e) => u({ tagline: e.target.value })} disabled={!tierUnlocks.branding} />
            </F>
          </>}

          {step === 4 && <>
            <p className="text-sm text-muted-foreground">Escolha o plano desejado. Você poderá pedir upgrade no painel a qualquer momento.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {(plans ?? []).map((p: any) => {
                const sel = f.plan_slug === p.slug;
                return (
                  <button key={p.id} onClick={() => u({ plan_slug: p.slug })}
                    className={cn("rounded-2xl border p-4 text-left", sel ? "border-primary bg-primary/5" : "border-border")}>
                    <div className="flex items-center justify-between">
                      <div className="font-display text-lg font-bold">{p.name}</div>
                      <Badge variant="outline">R$ {(p.price_cents / 100).toFixed(2)}</Badge>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(p.benefits ?? []).slice(0, 6).map((b: string) => <li key={b}>• {b}</li>)}
                    </ul>
                  </button>
                );
              })}
            </div>
          </>}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={back} disabled={step === 0}><ChevronLeft className="mr-1 size-4" /> Voltar</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Avançar <ChevronRight className="ml-1 size-4" /></Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Enviar para análise
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function F({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button onClick={() => on(!v)} className={cn("flex items-center justify-between rounded-xl border p-3 text-sm", v ? "border-primary bg-primary/5" : "border-border")}>
      <span>{label}</span>
      <Switch checked={v} onCheckedChange={on} />
    </button>
  );
}

function GalleryUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const urls = value ? value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : [];
  const setUrls = (next: string[]) => onChange(next.join(","));
  return (
    <div className="space-y-2">
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {urls.map((u, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg border border-border aspect-square">
              <img src={u} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white text-xs"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <MediaUploader
        value=""
        onChange={(url) => { if (url) setUrls([...urls, url]); }}
        folder="establishments/gallery"
        aspect="aspect-[16/6]"
        label="Adicionar foto à galeria"
        maxSizeMB={6}
      />
    </div>
  );
}
