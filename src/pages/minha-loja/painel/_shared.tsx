import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, type FeatureKey } from "@/lib/permissions";
import { LockedOverlay } from "@/components/owner/LockedOverlay";
import type { ReactNode } from "react";

export function PainelSection({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: ReactNode; action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-2xl font-bold leading-tight text-balance sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground text-pretty sm:max-w-2xl">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">{children}</div>
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
