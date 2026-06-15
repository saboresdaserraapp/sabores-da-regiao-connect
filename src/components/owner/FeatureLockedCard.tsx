import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { planLabelForFeature, type FeatureKey } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export function FeatureLockedCard({ feature, establishmentId, compact }: {
  feature: FeatureKey; establishmentId?: string; compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-dashed border-border bg-muted/30 text-center ${compact ? "p-4" : "p-8"}`}>
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </div>
      <p className="text-sm">
        Disponível no plano <strong>{planLabelForFeature(feature)}</strong>.
      </p>
      {establishmentId && (
        <Button asChild className="mt-3" size="sm" variant="outline">
          <Link to={`/minha-loja/${establishmentId}/planos?from=${feature}`}>Desbloquear</Link>
        </Button>
      )}
    </div>
  );
}

export function FeatureSavedButLocked({ feature }: { feature: FeatureKey }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
      Este recurso está salvo, mas a edição está disponível apenas no plano{" "}
      <strong>{planLabelForFeature(feature)}</strong>.
    </div>
  );
}
