import { Lock } from "lucide-react";
import { type ReactNode } from "react";
import { FEATURE_LABEL, FEATURE_MIN_PLAN, PLAN_LABEL, type FeatureKey } from "@/lib/planFeatures";
import { hasFeature } from "@/hooks/useEstablishmentFeatures";

export function FeatureGate({
  features, feature, children, mode = "lock",
}: {
  features: Record<string, any>;
  feature: FeatureKey;
  children: ReactNode;
  mode?: "lock" | "hide";
}) {
  if (hasFeature(features, feature)) return <>{children}</>;
  if (mode === "hide") return null;
  const minPlan = FEATURE_MIN_PLAN[feature];
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
      <div className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </div>
      <div className="text-sm font-medium">{FEATURE_LABEL[feature]}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Disponível no plano <strong>{minPlan ? PLAN_LABEL[minPlan] : "Exclusivo"}</strong>.
      </p>
    </div>
  );
}
