import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { PainelSection, Gated } from "./_shared";
import { Check, X } from "lucide-react";

function Row({ enabled, label, plan }: { enabled: boolean; label: string; plan?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {enabled
        ? <Check className="size-4 text-primary mt-0.5" />
        : <X className="size-4 text-muted-foreground mt-0.5" />}
      <span className={enabled ? "" : "text-muted-foreground"}>
        {label}{!enabled && plan && <span className="text-[11px]"> — plano {plan}</span>}
      </span>
    </li>
  );
}

function RegionsMock() {
  return (
    <div className="space-y-2">
      {[
        { name: "Centro", fee: "R$ 6,00", time: "~25 min" },
        { name: "Vila Nova", fee: "R$ 9,00", time: "~35 min" },
        { name: "Jardim das Flores", fee: "R$ 12,00", time: "~45 min" },
      ].map((r) => (
        <div key={r.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <div className="font-medium">{r.name}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{r.time}</span>
            <span className="font-semibold text-primary">{r.fee}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Entrega() {
  const { ctx } = useActiveEstablishment();
  if (!ctx) return null;
  return (
    <PainelSection title="Entrega e atendimento" subtitle="Como sua loja atende os clientes">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Modos de atendimento</h3>
          <ul className="space-y-1">
            <Row enabled={canUseFeature(ctx, "delivery_to_confirm")} label="Entrega com taxa a confirmar" />
            <Row enabled={canUseFeature(ctx, "pickup_enabled")} label="Retirada no local" />
            <Row enabled={canUseFeature(ctx, "dine_in_enabled")} label="Consumo no salão (dine-in)" />
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Taxa fixa de entrega</h3>
          <Gated feature="delivery_fixed_fee">
            <div className="rounded-lg border border-border bg-card p-3 text-sm">
              Cobra uma taxa única, ex.: <strong>R$ 8,00</strong> para qualquer endereço dentro da área.
            </div>
          </Gated>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Regiões de entrega</h3>
          <Gated feature="delivery_regions">
            <RegionsMock />
          </Gated>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Regras avançadas por região</h3>
          <Gated feature="delivery_region_rules">
            <ul className="text-sm space-y-1 list-disc ml-5 text-muted-foreground">
              <li>Pedido mínimo por região (ex.: R$ 50 no Jardim)</li>
              <li>Confirmação manual obrigatória em bairros distantes</li>
              <li>Horários específicos por região</li>
              <li>Referência visual (foto/link) anexada ao pedido</li>
            </ul>
          </Gated>
        </section>

      </div>
    </PainelSection>
  );
}
