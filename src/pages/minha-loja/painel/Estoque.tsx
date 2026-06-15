import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection, Gated } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, History, Package } from "lucide-react";

type Product = { id: string; name: string };
type Stock = {
  id?: string; product_id: string; quantity: number;
  min_quantity: number; pause_on_zero: boolean;
};

type StockMovement = {
  id: string; product_id: string; delta: number;
  reason: string | null; created_at: string;
  user_id: string | null;
  product?: { name: string };
};

export default function Estoque() {
  const { ctx } = useActiveEstablishment();
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Record<string, Stock>>({});
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const canAdvanced = ctx ? canUseFeature(ctx, "stock_advanced") : false;

  async function refresh() {
    if (!ctx) return;
    setLoading(true);
    const { data: ps } = await supabase.from("products").select("id,name")
      .eq("establishment_id", ctx.establishmentId).order("name");
    const { data: st } = await supabase.from("product_stock").select("*")
      .eq("establishment_id", ctx.establishmentId);
    
    let mv: any[] = [];
    if (canAdvanced) {
      const { data: mvData } = await supabase.from("stock_movements")
        .select("id,product_id,delta,reason,created_at,user_id, product:products(name)")
        .eq("establishment_id", ctx.establishmentId)
        .order("created_at", { ascending: false }).limit(50);
      mv = mvData ?? [];
    }

    setProducts(ps ?? []);
    setMovements(mv);
    const map: Record<string, Stock> = {};
    (st ?? []).forEach((s: any) => { map[s.product_id] = s; });
    setStock(map);
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ctx?.establishmentId]);

  async function save(p: Product, partial: Partial<Stock>) {
    if (!ctx) return;
    const current = stock[p.id] ?? { product_id: p.id, quantity: 0, min_quantity: 0, pause_on_zero: false };
    const next = { ...current, ...partial };
    const payload = {
      ...next,
      establishment_id: ctx.establishmentId,
      product_id: p.id,
    };
    const { error } = await supabase.from("product_stock")
      .upsert(payload, { onConflict: "product_id" });
    if (error) { toast.error(error.message); return; }
    setStock(s => ({ ...s, [p.id]: next as Stock }));
    if (canAdvanced && typeof partial.quantity === "number" && partial.quantity !== current.quantity) {
      await supabase.from("stock_movements").insert({
        establishment_id: ctx.establishmentId,
        product_id: p.id,
        delta: partial.quantity - (current.quantity ?? 0),
        reason: "Ajuste manual",
      });
    }
  }

  if (!ctx) return null;

  return (
    <PainelSection
      title="Estoque"
      subtitle="Controle a quantidade disponível de cada produto e receba alertas de estoque baixo."
      action={<Button size="sm" variant="outline" onClick={refresh} disabled={loading}>Atualizar</Button>}
    >
      <Gated feature="stock_basic">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="text-xs gap-1.5"><Package className="size-3.5" /> Lista de produtos</TabsTrigger>
            {canAdvanced && <TabsTrigger value="history" className="text-xs gap-1.5"><History className="size-3.5" /> Histórico</TabsTrigger>}
          </TabsList>

          <TabsContent value="list">
            <div className="space-y-2">
              {products.length === 0 && <p className="text-sm text-muted-foreground">Cadastre produtos primeiro para controlar estoque.</p>}
              {products.map(p => {
                const s = stock[p.id];
                const qty = s?.quantity ?? 0;
                const min = s?.min_quantity ?? 0;
                const low = qty <= min && (qty > 0 || min > 0);
                const zero = qty === 0;
                return (
                  <div key={p.id} className="rounded-lg border border-border p-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="flex gap-1 mt-1">
                        {zero && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="size-3 mr-0.5" /> Esgotado</Badge>}
                        {!zero && low && <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">Estoque baixo</Badge>}
                      </div>
                    </div>
                    <label className="text-xs flex items-center gap-1">
                      Qtd
                      <Input type="number" className="w-20" value={qty}
                        onChange={e => save(p, { quantity: Number(e.target.value) })} />
                    </label>
                    <label className="text-xs flex items-center gap-1">
                      Mín
                      <Input type="number" className="w-20" value={min}
                        onChange={e => save(p, { min_quantity: Number(e.target.value) })} />
                    </label>
                    <label className="text-xs flex items-center gap-2">
                      <Switch checked={!!s?.pause_on_zero}
                        onCheckedChange={(v) => save(p, { pause_on_zero: v })} />
                      Pausar ao zerar
                    </label>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {canAdvanced && (
            <TabsContent value="history">
              <div className="space-y-2">
                {movements.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>}
                {movements.map(m => (
                  <div key={m.id} className="rounded-lg border border-border p-3 text-xs flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium">{(m.product as any)?.name ?? "Produto removido"}</div>
                      <div className="text-muted-foreground">{m.reason ?? "Ajuste"} · {new Date(m.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`font-mono font-bold text-sm ${m.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {m.delta > 0 ? "+" : ""}{m.delta}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {!canAdvanced && (
          <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            <strong>Estoque avançado:</strong> Histórico de movimentação detalhado disponível no plano <strong>Profissional</strong>.
          </div>
        )}
      </Gated>
    </PainelSection>
  );
}
