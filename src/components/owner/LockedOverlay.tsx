import { Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { planLabelForFeature, type FeatureKey } from "@/lib/permissions";
import type { ReactNode } from "react";

/**
 * Renderiza o conteúdo (preview) atenuado/desfocado quando a feature está
 * bloqueada, sobrepondo um cartão com o plano mínimo necessário e um CTA
 * que abre o comparativo de planos já destacando o recurso desejado.
 */
export function LockedOverlay({
  feature,
  establishmentId,
  children,
  compact,
}: {
  feature: FeatureKey;
  establishmentId?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const plan = planLabelForFeature(feature);
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1.5px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className={`max-w-sm rounded-2xl border border-border bg-card/95 text-center shadow-soft backdrop-blur ${compact ? "p-4" : "p-5"}`}>
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </div>
          <div className="text-sm font-semibold">Recurso bloqueado</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Disponível a partir do plano <strong>{plan}</strong>.
          </p>
          {establishmentId && (
            <Button asChild size="sm" className="mt-3">
              <Link to={`/minha-loja/${establishmentId}/planos?from=${feature}`}>
                <Sparkles className="size-3.5 mr-1" /> Desbloquear
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
