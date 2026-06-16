import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { PainelSection, Gated } from "./_shared";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Promocoes() {
  const { ctx } = useActiveEstablishment();
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["promo-prods", ctx?.establishmentId],
    enabled: !!ctx,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,price,promo")
        .eq("establishment_id", ctx!.establishmentId).order("name");
      return data ?? [];
    },
  });

  const toggle = async (id: string, v: boolean) => {
    const { error } = await supabase.from("products").update({ promo: v }).eq("id", id);
    if (error) toast.error(error.message);
    else { qc.invalidateQueries({ queryKey: ["promo-prods", ctx?.establishmentId] }); toast.success(v ? "Marcado como promoção" : "Removido da promoção"); }
  };

  if (!ctx) return null;
  return (
    <PainelSection title="Promoções" subtitle="Marque produtos como promoção — aplicado no app imediatamente">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Promoções simples</h3>
          <Gated feature="simple_promotions">
            <div className="space-y-2">
              {products.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto.</p>}
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 transition-shadow hover:shadow-sm">
                  <div>
                    <div className="text-sm font-medium text-balance">{p.name}</div>
                    <div className="text-xs text-muted-foreground">R$ {Number(p.price).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.promo && <Badge className="text-[10px] bg-primary/15 text-primary border-0">Em promo</Badge>}
                    <Switch checked={!!p.promo} onCheckedChange={(v) => toggle(p.id, v)} />
                  </div>
                </div>
              ))}
            </div>
          </Gated>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Campanhas avançadas</h3>
          <Gated feature="advanced_promotions">
            <ul className="text-sm space-y-1 list-disc ml-5 text-muted-foreground">
              <li>Cupons com expiração (ex.: PRIMEIRA10)</li>
              <li>Happy hour com janelas de horário</li>
              <li>Compre 2 pague 1 em categorias específicas</li>
              <li>Frete grátis acima de um valor</li>
            </ul>
          </Gated>
        </section>
      </div>
    </PainelSection>
  );
}
