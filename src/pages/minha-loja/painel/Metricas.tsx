import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { PainelSection, Gated } from "./_shared";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Bars() {
  const data = [40, 65, 32, 78, 90, 55, 70];
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((h, i) => (
        <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export default function Metricas() {
  const { ctx } = useActiveEstablishment();
  if (!ctx) return null;
  return (
    <PainelSection title="Métricas" subtitle="Acompanhe seu desempenho">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Métricas básicas</h3>
          <Gated feature="basic_metrics">
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label="Cliques no WhatsApp" value="184" hint="últimos 7 dias" />
              <StatCard label="Visualizações de produto" value="1.247" hint="últimos 7 dias" />
              <StatCard label="Pedidos enviados" value="38" hint="últimos 7 dias" />
            </div>
          </Gated>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Métricas intermediárias</h3>
          <Gated feature="intermediate_metrics">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground mb-2">Horários de pico (qua)</div>
                <Bars />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>18h</span><span>00h</span></div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="text-xs text-muted-foreground">Carrinhos abandonados</div>
                <div className="text-2xl font-bold">12</div>
                <div className="text-[11px] text-muted-foreground">Valor médio: R$ 64,20</div>
              </div>
            </div>
          </Gated>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Métricas avançadas</h3>
          <Gated feature="advanced_metrics">
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label="Ticket médio" value="R$ 78,40" />
              <StatCard label="Taxa de retorno" value="32%" hint="clientes recorrentes" />
              <StatCard label="NPS estimado" value="68" />
            </div>
          </Gated>
        </section>
      </div>
    </PainelSection>
  );
}
