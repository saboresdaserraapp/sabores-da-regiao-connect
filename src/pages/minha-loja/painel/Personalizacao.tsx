import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { PainelSection, Gated } from "./_shared";
import { ThemeEditor } from "@/components/owner/ThemeEditor";

export default function Personalizacao() {
  const { ctx } = useActiveEstablishment();
  if (!ctx) return null;
  const canVisual = canUseFeature(ctx, "visual_customization");

  return (
    <PainelSection title="Personalização visual" subtitle="Cores, fontes, capa, logo e layout — alterações refletem no app">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Editor de tema</h3>
          <Gated feature="visual_customization">
            <ThemeEditor establishmentId={ctx.establishmentId} menuType={canVisual ? "exclusivo" : "essencial"} />
          </Gated>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Galeria premium</h3>
          <Gated feature="premium_gallery">
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-muted to-muted/40 grid place-items-center text-2xl">📸</div>
              ))}
            </div>
          </Gated>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Seção de vídeo</h3>
          <Gated feature="video_section">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-muted to-muted/40 grid place-items-center text-3xl">▶︎</div>
          </Gated>
        </section>
      </div>
    </PainelSection>
  );
}
