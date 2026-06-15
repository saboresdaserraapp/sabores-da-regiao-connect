import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { PainelSection, Gated } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Opt = { name: string; price: number; type?: "simple" | "variation" | "combo" };

export default function Adicionais() {
  const { ctx } = useActiveEstablishment();
  const qc = useQueryClient();
  const [pid, setPid] = useState<string>("");
  const canAdvanced = !!ctx && canUseFeature(ctx, "advanced_addons");

  const { data: products = [] } = useQuery({
    queryKey: ["prods-opt", ctx?.establishmentId],
    enabled: !!ctx,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,options").eq("establishment_id", ctx!.establishmentId).order("name");
      return data ?? [];
    },
  });

  const product = products.find((p) => p.id === pid);
  const options: Opt[] = Array.isArray(product?.options) ? (product!.options as any) : [];

  const save = async (opts: Opt[]) => {
    if (!product) return;
    const { error } = await supabase.from("products").update({ options: opts as any }).eq("id", product.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prods-opt", ctx?.establishmentId] });
    toast.success("Salvo");
  };

  const add = () => save([...options, { name: "Novo adicional", price: 0, type: "simple" }]);
  const upd = (i: number, patch: Partial<Opt>) => {
    const next = [...options]; next[i] = { ...next[i], ...patch }; save(next);
  };
  const del = (i: number) => save(options.filter((_, j) => j !== i));

  if (!ctx) return null;
  return (
    <PainelSection title="Adicionais e variações" subtitle="Adicione opcionais aos produtos — aplicado em tempo real">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Produto</label>
          <Select value={pid} onValueChange={setPid}>
            <SelectTrigger><SelectValue placeholder="Escolha um produto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {product && (
          <>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Adicionais simples</h3>
              <Gated feature="simple_addons">
                <div className="space-y-2">
                  {options.filter((o) => (o.type ?? "simple") === "simple").length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum adicional cadastrado.</p>
                  )}
                  {options.map((o, i) => (o.type ?? "simple") === "simple" && (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                      <Input value={o.name} onChange={(e) => upd(i, { name: e.target.value })} className="flex-1" />
                      <Input type="number" step="0.01" value={o.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} className="w-24" />
                      <Button variant="ghost" size="icon" onClick={() => del(i)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={add}><Plus className="size-4 mr-1" />Adicionar opcional</Button>
                </div>
              </Gated>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Variações e combos</h3>
              <Gated feature="advanced_addons">
                <div className="space-y-2">
                  {options.filter((o) => o.type === "variation" || o.type === "combo").map((o, idx) => {
                    const i = options.indexOf(o);
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                        <Select value={o.type} onValueChange={(v) => upd(i, { type: v as any })}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="variation">Variação</SelectItem>
                            <SelectItem value="combo">Combo</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input value={o.name} onChange={(e) => upd(i, { name: e.target.value })} className="flex-1" />
                        <Input type="number" step="0.01" value={o.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} className="w-24" />
                        <Button variant="ghost" size="icon" onClick={() => del(i)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    );
                  })}
                  {canAdvanced && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => save([...options, { name: "Tamanho P/M/G", price: 0, type: "variation" }])}><Plus className="size-4 mr-1" />Variação</Button>
                      <Button size="sm" variant="outline" onClick={() => save([...options, { name: "Combo família", price: 0, type: "combo" }])}><Plus className="size-4 mr-1" />Combo</Button>
                    </div>
                  )}
                </div>
              </Gated>
            </section>
          </>
        )}
      </div>
    </PainelSection>
  );
}
