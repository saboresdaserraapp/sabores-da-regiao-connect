import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, type FeatureKey } from "@/lib/permissions";
import { LockedOverlay } from "@/components/owner/LockedOverlay";
import type { ReactNode } from "react";

export function PainelSection({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: ReactNode; action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="rounded-2xl border border-border bg-card p-6">{children}</div>
    </section>
  );
}

/**
 * Renderiza `children` (preview/editor da feature) sempre. Quando o plano da loja
 * não inclui a feature, sobrepõe um overlay bloqueado indicando o plano mínimo.
 * Todas as operações são feitas no próprio painel da loja — nunca redireciona pro admin.
 */
export function Gated({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { ctx } = useActiveEstablishment();
  if (!ctx) return null;
  if (canUseFeature(ctx, feature)) return <>{children}</>;
  return (
    <LockedOverlay feature={feature} establishmentId={ctx.establishmentId}>
      {children}
    </LockedOverlay>
  );
}
