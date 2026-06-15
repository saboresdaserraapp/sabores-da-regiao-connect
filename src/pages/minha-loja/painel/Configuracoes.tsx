import { PainelSection } from "./_shared";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { ROLE_LABEL, type EstablishmentRole } from "@/lib/permissions";

export default function Configuracoes() {
  const { ctx } = useActiveEstablishment();
  if (!ctx) return null;
  return (
    <PainelSection title="Configurações" subtitle="Preferências gerais desta loja">
      <ul className="text-sm space-y-2">
        <li>Seu papel nesta loja: <strong>{ctx.userRoleInEstablishment ? ROLE_LABEL[ctx.userRoleInEstablishment as EstablishmentRole] : "—"}</strong></li>
        <li>Status: <strong>{ctx.establishmentStatus}</strong></li>
        <li>Plano: <strong>{ctx.activePlan.name ?? "—"}</strong></li>
      </ul>
    </PainelSection>
  );
}
