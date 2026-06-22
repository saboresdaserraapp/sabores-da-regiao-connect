import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { PainelSection, Gated } from "./_shared";
import { Lightbulb, Target, TrendingUp, type LucideIcon } from "lucide-react";

function Insight({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

export default function Inteligencia() {
  const { ctx } = useActiveEstablishment();
  if (!ctx) return null;
  return (
    <PainelSection title="Inteligência comercial" subtitle="Recomendações personalizadas para sua loja">
      <div className="space-y-6">
        <Gated feature="commercial_insights">
          <div className="grid gap-3 md:grid-cols-2">
            <Insight icon={Lightbulb} title="Aumente seu ticket médio em ~18%"
              desc="Crie um combo com Pizza Calabresa + Refri 2L. 64% dos clientes pedem ambos juntos." />
            <Insight icon={TrendingUp} title="Pico de demanda às quintas"
              desc="Considere abrir 30 min antes às 5ª-feira para capturar pedidos perdidos entre 18h-19h." />
            <Insight icon={Target} title="Bairro Centro tem 3x mais conversão"
              desc="Vale concentrar esforço de entrega/promo nessa região." />
            <Insight icon={Lightbulb} title="3 avaliações sem resposta há mais de 7 dias"
              desc="Responder eleva sua nota média em até 0,3 estrelas." />
          </div>
        </Gated>

        <Gated feature="benchmark">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="font-semibold">Benchmark vs categoria</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
              <div><div className="text-muted-foreground">Sua nota</div><div className="text-lg font-bold">4.8</div></div>
              <div><div className="text-muted-foreground">Média categoria</div><div className="text-lg font-bold">4.4</div></div>
              <div><div className="text-muted-foreground">Topo categoria</div><div className="text-lg font-bold">4.9</div></div>
            </div>
          </div>
        </Gated>

        <Gated feature="action_plan">
          <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
            <div className="font-semibold">Plano de ação sugerido para a semana</div>
            <ol className="ml-4 list-decimal text-xs text-muted-foreground space-y-1">
              <li>Publicar combo "Sexta da Calabresa" às 17h</li>
              <li>Responder 3 avaliações pendentes</li>
              <li>Atualizar foto da Pizza Margherita</li>
              <li>Ativar cupom PRIMEIRA10 por 7 dias</li>
            </ol>
          </div>
        </Gated>
      </div>
    </PainelSection>
  );
}
