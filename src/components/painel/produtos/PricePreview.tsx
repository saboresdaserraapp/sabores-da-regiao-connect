import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown } from "lucide-react";

interface Props {
  productId: string;
  f: any;
}

function money(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function isPromoActive(f: any) {
  if (!f.promo || !f.promotional_price) return false;
  const now = Date.now();
  if (f.promotion_starts_at && new Date(f.promotion_starts_at).getTime() > now) return false;
  if (f.promotion_ends_at && new Date(f.promotion_ends_at).getTime() < now) return false;
  return Number(f.promotional_price) > 0 && Number(f.promotional_price) < Number(f.price);
}

export function PricePreview({ productId, f }: Props) {
  const { data: groups = [] } = useQuery({
    queryKey: ["preview-groups", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_option_groups")
        .select("id,name,is_required,min_choices,max_choices,type")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const { data: opts = [] } = useQuery({
    queryKey: ["preview-opts", productId, groups.map((g) => g.id).join(",")],
    enabled: groups.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_options")
        .select("id,option_group_id,name,price,is_available")
        .in("option_group_id", groups.map((g) => g.id))
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const base = Number(f.price) || 0;
  const promoActive = isPromoActive(f);
  const unit = promoActive ? Number(f.promotional_price) : base;
  const discount = promoActive ? base - unit : 0;

  // Simulate: pick minimum required (cheapest) options to satisfy each required group.
  const forcedAdds: Array<{ groupName: string; optionName: string; price: number }> = [];
  groups.forEach((g) => {
    const min = g.min_choices ?? 0;
    if (!g.is_required || min < 1) return;
    const available = opts
      .filter((o) => o.option_group_id === g.id && o.is_available !== false)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, min);
    available.forEach((o) =>
      forcedAdds.push({ groupName: g.name, optionName: o.name, price: Number(o.price) || 0 })
    );
  });
  const addonsTotal = forcedAdds.reduce((acc, a) => acc + a.price, 0);
  const total = unit + addonsTotal;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="size-4 text-primary" />
        <h4 className="text-sm font-semibold">Prévia de preço para o cliente</h4>
        <Badge variant="outline" className="text-[9px] ml-auto">simulação</Badge>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Preço base</span>
          <span className={promoActive ? "line-through text-muted-foreground" : "font-medium"}>{money(base)}</span>
        </div>

        {promoActive && (
          <>
            <div className="flex justify-between text-primary">
              <span className="flex items-center gap-1">
                <TrendingDown className="size-3" /> Desconto ({Math.round((discount / base) * 100)}%)
              </span>
              <span>− {money(discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço promocional</span>
              <span className="font-medium">{money(unit)}</span>
            </div>
          </>
        )}

        {!promoActive && f.promo && f.promotional_price && (
          <p className="text-[10px] italic text-amber-600">
            Promoção configurada, mas fora do período ativo ou preço inválido.
          </p>
        )}

        {forcedAdds.length > 0 && (
          <>
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Adicionais obrigatórios (mais baratos)
              </p>
              {forcedAdds.map((a, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="truncate">
                    <span className="text-muted-foreground">{a.groupName}:</span> {a.optionName}
                  </span>
                  <span>+ {money(a.price)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Subtotal adicionais</span>
                <span>+ {money(addonsTotal)}</span>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between pt-2 border-t border-primary/30 text-base">
          <span className="font-semibold">Total mínimo</span>
          <span className="font-bold text-primary">{money(total)}</span>
        </div>

        <p className="text-[10px] text-muted-foreground pt-1">
          {forcedAdds.length > 0
            ? "Considera apenas os adicionais obrigatórios (opção mais barata). O cliente pode adicionar mais."
            : "Este produto não possui adicionais obrigatórios — o total é o preço final."}
        </p>
      </div>
    </Card>
  );
}