import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, MapPin, Info, Loader2 } from "lucide-react";

/**
 * Customer-facing references card shown on the order tracking page.
 * Loads the order_visual_reference_links row for the given order_id and
 * joins the underlying house_references + house_reference_media.
 */
export function CustomerReferencesPanel({ orderId }: { orderId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["customer-ref", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data: link } = await supabase
        .from("order_visual_reference_links")
        .select("visual_reference_id")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!link?.visual_reference_id) return null;

      const { data: ref } = await supabase
        .from("house_references")
        .select("*, media:house_reference_media(*)")
        .eq("id", link.visual_reference_id)
        .maybeSingle();
      if (!ref) return null;

      const media = ((ref as any).media || []) as Array<{ media_type: string; media_url: string }>;
      const photosFromMedia = media.filter((m) => m.media_type === "photo").map((m) => m.media_url);
      const videoFromMedia = media.find((m) => m.media_type === "video")?.media_url;

      const legacyPhotos = [
        (ref as any).photo_1_url,
        (ref as any).photo_2_url,
        (ref as any).photo_3_url,
        (ref as any).photo_4_url,
        (ref as any).photo_5_url,
      ].filter(Boolean) as string[];

      let photos = photosFromMedia;
      if (photos.length === 0) photos = Array.isArray(ref.media_urls) ? (ref.media_urls as string[]) : [];
      if (photos.length === 0) photos = legacyPhotos;

      return {
        photos,
        video: videoFromMedia || (ref as any).video_url || null,
        instructions: (ref as any).instructions as string | null,
        pins: [
          (ref as any).pin_1_description,
          (ref as any).pin_2_description,
          (ref as any).pin_3_description,
        ].filter(Boolean) as string[],
      };
    },
  });

  if (isLoading) {
    return (
      <section className="rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando referências…
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { photos, video, instructions, pins } = data;
  const hasAny = photos.length > 0 || !!video || !!instructions || pins.length > 0;
  if (!hasAny) return null;

  return (
    <section className="rounded-3xl bg-card p-5 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="size-5 text-primary" />
        <h3 className="font-display text-base font-semibold">Referências enviadas para a entrega</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Estas fotos, vídeo e instruções foram compartilhadas com o estabelecimento para facilitar a entrega.
      </p>

      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <ImageIcon className="size-3.5" /> Fotos da residência
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((url, i) => (
              <a
                key={`${url}-${i}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square overflow-hidden rounded-xl border border-border bg-muted"
              >
                <img src={url} alt={`Referência ${i + 1}`} className="size-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {video && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vídeo</div>
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            <video src={video} controls className="w-full aspect-video" />
          </div>
        </div>
      )}

      {instructions && (
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Como encontrar</div>
          <p className="rounded-xl bg-muted/50 p-3 text-sm italic text-foreground/80 whitespace-pre-line">
            {instructions}
          </p>
        </div>
      )}

      {pins.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Info className="size-3.5" /> Pontos de referência
          </div>
          <ul className="space-y-1.5">
            {pins.map((pin, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-muted/40 p-2 text-sm">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-foreground/80">{pin}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}