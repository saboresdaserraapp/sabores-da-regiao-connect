import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection, Gated } from "./_shared";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type EstabMedia = {
  logo: string | null; cover: string | null;
  gallery: string[]; ambient_photos: any;
  video_url: string | null;
};

export default function Midia() {
  const { ctx } = useActiveEstablishment();
  const [data, setData] = useState<EstabMedia | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!ctx) return;
    const { data: e } = await supabase.from("establishments")
      .select("logo,cover,gallery,ambient_photos,video_url")
      .eq("id", ctx.establishmentId).maybeSingle();
    setData(e as any);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ctx?.establishmentId]);

  async function save(patch: Partial<EstabMedia>) {
    if (!ctx || !data) return;
    setSaving(true);
    const next = { ...data, ...patch };
    setData(next);
    const { error } = await supabase.from("establishments")
      .update(patch as any).eq("id", ctx.establishmentId);
    setSaving(false);
    if (error) { toast.error(error.message); load(); return; }
    toast.success("Mídia atualizada");
  }

  if (!ctx || !data) return null;
  const gallery = data.gallery ?? [];
  const ambient: string[] = Array.isArray(data.ambient_photos) ? data.ambient_photos : [];

  return (
    <PainelSection title="Mídia da loja" subtitle="Logo, capa, galeria, vídeo e fotos do ambiente — refletem direto na página pública.">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold mb-2">Logo</h3>
            <MediaUploader value={data.logo ?? ""} onChange={(url) => save({ logo: url })} folder="estab/logo" aspect="aspect-square" />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Imagem de capa</h3>
            <MediaUploader value={data.cover ?? ""} onChange={(url) => save({ cover: url })} folder="estab/cover" aspect="aspect-[21/9]" />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">Galeria da loja</h3>
          <Gated feature="media_gallery">
            <GalleryEditor
              urls={gallery}
              onChange={(urls) => save({ gallery: urls })}
              folder="estab/gallery"
            />
          </Gated>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">Fotos do ambiente / fachada / pratos</h3>
          <Gated feature="media_gallery">
            <GalleryEditor
              urls={ambient}
              onChange={(urls) => save({ ambient_photos: urls as any })}
              folder="estab/ambient"
            />
          </Gated>
        </section>

        <section>
          <h3 className="text-sm font-semibold mb-2">Vídeo institucional</h3>
          <Gated feature="media_video">
            <div className="space-y-2">
              <MediaUploader
                value={data.video_url ?? ""}
                onChange={(url) => save({ video_url: url })}
                folder="estab/video"
                allowVideo
                aspect="aspect-video"
                label="Enviar vídeo (mp4)"
              />
              <Input placeholder="ou cole uma URL (YouTube, Vimeo)"
                defaultValue={data.video_url ?? ""}
                onBlur={(e) => { if (e.target.value !== data.video_url) save({ video_url: e.target.value || null }); }} />
            </div>
          </Gated>
        </section>

        {!canUseFeature(ctx, "media_video") && (
          <p className="text-xs text-muted-foreground">
            Galeria avançada disponível no plano <strong>Profissional</strong>. Vídeo institucional no plano <strong>Gestão Premium</strong>.
          </p>
        )}
      </div>
    </PainelSection>
  );
}

function GalleryEditor({ urls, onChange, folder }: { urls: string[]; onChange: (urls: string[]) => void; folder: string }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {urls.map((url, i) => (
          <div key={url + i} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
            <img src={url} alt={`Galeria ${i+1}`} className="w-full h-full object-cover" />
            <Button size="icon" variant="destructive" className="absolute top-1 right-1 size-7"
              onClick={() => onChange(urls.filter((_, j) => j !== i))}><Trash2 className="size-3" /></Button>
          </div>
        ))}
        {!adding && (
          <Button variant="outline" className="aspect-square h-auto flex-col gap-1" onClick={() => setAdding(true)}>
            <Plus className="size-5" /> <span className="text-xs">Adicionar</span>
          </Button>
        )}
      </div>
      {adding && (
        <div className="rounded-lg border border-dashed border-border p-3">
          <MediaUploader folder={folder} aspect="aspect-square"
            onChange={(url) => { onChange([...urls, url]); setAdding(false); }} />
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAdding(false)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}
