import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Palette, Type, LayoutGrid, ImageIcon, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/media/MediaUploader";

interface Props {
  establishmentId: string;
  menuType: "essencial" | "exclusivo";
}

const FONT_PAIRS = [
  { value: "modern", label: "Modern" },
  { value: "rustic", label: "Rústico (serifa)" },
  { value: "elegant", label: "Elegante (Playfair)" },
  { value: "playful", label: "Divertido (Caveat)" },
];
const CARD_STYLES = [
  { value: "elevated", label: "Elevado (sombra)" },
  { value: "flat", label: "Plano" },
  { value: "outlined", label: "Contorno" },
];
const HEADER_STYLES = [
  { value: "gradient", label: "Gradiente" },
  { value: "solid", label: "Cor sólida" },
  { value: "image", label: "Imagem" },
];

export function ThemeEditor({ establishmentId, menuType }: Props) {
  const qc = useQueryClient();
  const { data: theme, isLoading } = useQuery({
    queryKey: ["theme-editor", establishmentId],
    queryFn: async () => {
      const { data } = await supabase.from("establishment_themes").select("*").eq("establishment_id", establishmentId).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    setForm(
      theme ?? {
        establishment_id: establishmentId,
        background_color: "",
        background_image: "",
        background_opacity: 100,
        background_blur: 0,
        accent_color: "",
        header_style: "gradient",
        font_pair: "modern",
        card_style: "elevated",
        show_story: true,
        show_gallery: true,
        show_reviews_inline: true,
        menu_banners: [],
      }
    );
  }, [theme, establishmentId]);

  if (menuType !== "exclusivo") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
        <Palette className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="font-medium">Personalização disponível apenas no Cardápio Premium.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Promova este estabelecimento a Premium na aba <strong>Configurações</strong>.
        </p>
      </div>
    );
  }

  if (isLoading || !form) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  function set<K extends string>(k: K, v: unknown) {
    setForm((s: any) => ({ ...s, [k]: v }));
  }

  async function save() {
    const { error } = await supabase.from("establishment_themes").upsert(form);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_action", {
      _action: "theme.update", _target_type: "establishment", _target_id: establishmentId, _meta: {} as never,
    });
    toast.success("Tema salvo");
    qc.invalidateQueries({ queryKey: ["theme-editor", establishmentId] });
  }

  const banners: any[] = form.menu_banners ?? [];

  function updateBanner(i: number, patch: any) {
    const next = [...banners];
    next[i] = { ...next[i], ...patch };
    set("menu_banners", next);
  }
  function addBanner() {
    set("menu_banners", [...banners, { image: "", link: "", position: banners.length }]);
  }
  function removeBanner(i: number) {
    set("menu_banners", banners.filter((_, idx) => idx !== i));
  }
  function moveBanner(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= banners.length) return;
    const next = [...banners];
    [next[i], next[j]] = [next[j], next[i]];
    set("menu_banners", next);
  }

  // Preview style
  const previewStyle: React.CSSProperties = {};
  if (form.background_color) previewStyle.backgroundColor = form.background_color;
  if (form.accent_color) (previewStyle as Record<string, string>)["--primary"] = form.accent_color;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Section title="Cores" icon={<Palette className="size-4" />}>
            <Row label="Cor de fundo">
              <Input type="color" value={form.background_color || "#ffffff"} onChange={(e) => set("background_color", e.target.value)} className="h-10 w-20 p-1" />
              <Input value={form.background_color || ""} onChange={(e) => set("background_color", e.target.value)} placeholder="Ex: #fef9f3 ou hsl(40 90% 95%)" />
            </Row>
            <Row label="Cor de destaque (botões/links)">
              <Input value={form.accent_color || ""} onChange={(e) => set("accent_color", e.target.value)} placeholder="Ex: 20 85% 45% (HSL sem hsl())" />
            </Row>
          </Section>

          <Section title="Imagem de fundo" icon={<ImageIcon className="size-4" />}>
            <MediaUploader
              value={form.background_image || ""}
              onChange={(url) => set("background_image", url)}
              bucket="public-media"
              folder={`themes/${establishmentId}/background`}
              aspect="aspect-[21/9]"
              label="Enviar imagem de fundo"
            />
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Opacidade ({form.background_opacity}%)</label>
              <Slider value={[form.background_opacity]} onValueChange={(v) => set("background_opacity", v[0])} min={0} max={100} step={5} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Desfoque ({form.background_blur}px)</label>
              <Slider value={[form.background_blur]} onValueChange={(v) => set("background_blur", v[0])} min={0} max={20} step={1} />
            </div>
          </Section>

          <Section title="Tipografia & layout" icon={<Type className="size-4" />}>
            <Row label="Par de fontes">
              <Select value={form.font_pair} onValueChange={(v) => set("font_pair", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_PAIRS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Estilo dos cards">
              <Select value={form.card_style} onValueChange={(v) => set("card_style", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CARD_STYLES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Header">
              <Select value={form.header_style} onValueChange={(v) => set("header_style", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{HEADER_STYLES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
          </Section>

          <Section title="Seções visíveis" icon={<LayoutGrid className="size-4" />}>
            <Toggle label="Nossa história" value={form.show_story} onChange={(v) => set("show_story", v)} />
            <Toggle label="Galeria de fotos" value={form.show_gallery} onChange={(v) => set("show_gallery", v)} />
            <Toggle label="Avaliações inline" value={form.show_reviews_inline} onChange={(v) => set("show_reviews_inline", v)} />
          </Section>

          <Section title="Banners internos no cardápio" icon={<ImageIcon className="size-4" />}>
            <p className="text-xs text-muted-foreground">Exibidos entre as categorias do cardápio.</p>
            {banners.length === 0 && <p className="text-sm text-muted-foreground">Nenhum banner. Clique abaixo para adicionar.</p>}
            <div className="space-y-3">
              {banners.map((b, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Banner #{i + 1}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => moveBanner(i, -1)}><ArrowUp className="size-3.5" /></Button>
                      <Button size="icon" variant="outline" onClick={() => moveBanner(i, 1)}><ArrowDown className="size-3.5" /></Button>
                      <Button size="icon" variant="outline" onClick={() => removeBanner(i)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                  <MediaUploader
                    value={b.image}
                    onChange={(url) => updateBanner(i, { image: url })}
                    bucket="public-media"
                    folder={`themes/${establishmentId}/banners`}
                    aspect="aspect-[21/9]"
                    label="Enviar imagem ou GIF do banner"
                  />
                  <Input value={b.link || ""} onChange={(e) => updateBanner(i, { link: e.target.value })} placeholder="Link de destino (opcional)" />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addBanner}><Plus className="mr-1 size-4" /> Adicionar banner</Button>
          </Section>

          <div className="flex justify-end">
            <Button onClick={save}><Save className="mr-2 size-4" /> Salvar tema</Button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Pré-visualização</div>
          <div className="overflow-hidden rounded-2xl border border-border" style={previewStyle}>
            {form.background_image && (
              <div
                className="h-32 w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${form.background_image})`,
                  opacity: form.background_opacity / 100,
                  filter: form.background_blur ? `blur(${form.background_blur}px)` : undefined,
                }}
              />
            )}
            <div className="p-4 space-y-3">
              <div className="font-display text-lg font-bold">Título exemplo</div>
              <div className="flex gap-2"><Badge>Aberto</Badge><Badge variant="secondary">Verificado</Badge></div>
              <div
                className={
                  form.card_style === "flat"
                    ? "rounded-xl bg-card p-3"
                    : form.card_style === "outlined"
                      ? "rounded-xl border border-border bg-card p-3"
                      : "rounded-xl bg-card p-3 shadow-card"
                }
              >
                <div className="text-sm font-semibold">Prato exemplo</div>
                <div className="text-xs text-muted-foreground">Descrição breve</div>
                <button className="mt-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">{icon} {title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-2">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
