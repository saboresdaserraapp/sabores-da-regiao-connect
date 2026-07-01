import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingDown, Minus, Plus, RefreshCcw } from "lucide-react";
import { computeBreakdown, money } from "@/lib/pricing";

interface Props {
  productId: string;
  f: any;
}

export function PricePreview({ productId, f }: Props) {
  const [qty, setQty] = useState(1);

  // IMPORTANT: use the SAME queryKeys the editor uses so real-time cache
  // invalidations from ProductOptionGroupsEditor propagate here automatically.
  const { data: groups = [], isFetching: gLoading, refetch: refetchG } = useQuery({
    queryKey: ["product-option-groups", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_option_groups")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: opts = [], isFetching: oLoading, refetch: refetchO } = useQuery({
    queryKey: ["product-options", productId],
    enabled: groups.length > 0,
    queryFn: async () => {
      const groupIds = groups.map((g) => g.id);
      if (groupIds.length === 0) return [];
      const { data, error } = await supabase
        .from("product_options")
        .select("*")
        .in("option_group_id", groupIds)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const b = computeBreakdown(f, groups as any, opts as any, qty);

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="size-4 text-primary" />
        <h4 className="text-sm font-semibold">Prévia de preço para o cliente</h4>
        <Badge variant="outline" className="text-[9px]">tempo real</Badge>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto h-6 w-6"
          onClick={() => { refetchG(); refetchO(); }}
          aria-label="Atualizar"
          title="Recarregar adicionais"
        >
          <RefreshCcw className={`size-3 ${gLoading || oLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-background/60 border border-border/40">
        <Label className="text-[11px] text-muted-foreground">Quantidade:</Label>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir">
            <Minus className="size-3" />
          </Button>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-14 h-6 text-xs text-center px-1"
          />
          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setQty((q) => q + 1)} aria-label="Aumentar">
            <Plus className="size-3" />
          </Button>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">recalcula ao vivo</span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Preço base (unit.)</span>
          <span className={b.promoActive ? "line-through text-muted-foreground" : "font-medium"}>{money(b.basePrice)}</span>
        </div>

        {b.promoActive && (
          <>
            <div className="flex justify-between text-primary">
              <span className="flex items-center gap-1">
                <TrendingDown className="size-3" /> Desconto ({Math.round(b.discountPercent)}%)
              </span>
              <span>− {money(b.discountUnit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço promocional (unit.)</span>
              <span className="font-medium">{money(b.unitPrice)}</span>
            </div>
          </>
        )}

        {!b.promoActive && f.promo && f.promotional_price && (
          <p className="text-[10px] italic text-amber-600">
            Promoção configurada, mas fora do período ativo ou preço inválido.
          </p>
        )}

        {b.forcedAddons.length > 0 && (
          <>
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Adicionais obrigatórios (mais baratos)
              </p>
              {b.forcedAddons.map((a, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="truncate">
                    <span className="text-muted-foreground">{a.groupName}:</span> {a.optionName}
                  </span>
                  <span>+ {money(a.price)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Adicionais por unidade</span>
                <span>+ {money(b.addonsTotal)}</span>
              </div>
            </div>
          </>
        )}

        {qty > 1 && (
          <div className="pt-2 border-t border-border/50 space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Subtotal ({qty} × {money(b.unitPrice)})</span>
              <span>{money(b.subtotal)}</span>
            </div>
            {b.forcedAddons.length > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Adicionais ({qty} × {money(b.addonsTotal)})</span>
                <span>{money(b.addonsSubtotal)}</span>
              </div>
            )}
            {b.promoActive && (
              <div className="flex justify-between text-[11px] text-primary">
                <span>Você economiza</span>
                <span>− {money(b.discountTotal)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-primary/30 text-base">
          <span className="font-semibold">Total {qty > 1 ? `(${qty} un.)` : "mínimo"}</span>
          <span className="font-bold text-primary">{money(b.total)}</span>
        </div>

        <p className="text-[10px] text-muted-foreground pt-1">
          {b.forcedAddons.length > 0
            ? "Considera apenas os adicionais obrigatórios (opção mais barata). O cliente pode adicionar mais."
            : "Este produto não possui adicionais obrigatórios — o total é o preço final por unidade."}
        </p>
      </div>
    </Card>
  );
}