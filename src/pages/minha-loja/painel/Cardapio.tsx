import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { PainelSection, Gated } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Plus, Trash2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Cardapio() {
  const { ctx } = useActiveEstablishment();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const canOrder = !!ctx && canUseFeature(ctx, "category_ordering");

  const { data: cats = [] } = useQuery({
    queryKey: ["mc", ctx?.establishmentId],
    enabled: !!ctx,
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_categories")
        .select("id,name,position")
        .eq("establishment_id", ctx!.establishmentId)
        .order("position", { ascending: true });
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["mc", ctx?.establishmentId] });

  const add = async () => {
    if (!ctx || !newName.trim()) return;
    const pos = (cats.at(-1)?.position ?? 0) + 1;
    const { error } = await supabase.from("menu_categories").insert({
      establishment_id: ctx.establishmentId, name: newName.trim(), position: pos,
    });
    if (error) return toast.error(error.message);
    setNewName(""); refresh(); toast.success("Categoria adicionada");
  };
  const rename = async (id: string, name: string) => {
    const { error } = await supabase.from("menu_categories").update({ name }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { refresh(); toast.success("Removida"); }
  };
  const move = async (id: string, dir: -1 | 1) => {
    const i = cats.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cats.length) return;
    const a = cats[i], b = cats[j];
    await supabase.from("menu_categories").update({ position: b.position }).eq("id", a.id);
    await supabase.from("menu_categories").update({ position: a.position }).eq("id", b.id);
    refresh();
  };

  const { data: catProducts = [] } = useQuery({
    queryKey: ["mc-products", expanded],
    enabled: !!expanded,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,display_order,image,is_active,additional_menu_category_ids,menu_category_id")
        .eq("establishment_id", ctx!.establishmentId)
        .or(`menu_category_id.eq.${expanded},additional_menu_category_ids.cs.{${expanded}}`)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      return data ?? [];
    },
  });

  const refreshProducts = () => qc.invalidateQueries({ queryKey: ["mc-products", expanded] });

  const moveProduct = async (id: string, dir: -1 | 1) => {
    const i = catProducts.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= catProducts.length) return;
    const a = catProducts[i], b = catProducts[j];
    const posA = a.display_order ?? i;
    const posB = b.display_order ?? j;
    await supabase.from("products").update({ display_order: posB }).eq("id", a.id);
    await supabase.from("products").update({ display_order: posA }).eq("id", b.id);
    refreshProducts();
  };

  if (!ctx) return null;
  return (
    <PainelSection title="Cardápio" subtitle="Organize categorias e a ordem dos produtos exibidos aos clientes">
      <div className="space-y-4">
        {cats.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Você ainda não criou categorias. Produtos sem categoria aparecem na vitrine
            agrupados como <strong>"Cardápio"</strong>. Crie categorias para organizar melhor.
          </div>
        )}
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova categoria (ex: Pizzas Salgadas)" />
          <Button onClick={add}><Plus className="size-4 mr-1" />Adicionar</Button>
        </div>

        <div className="space-y-2">
          {cats.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria ainda.</p>}
          {cats.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-border/70 bg-card transition-shadow hover:shadow-sm">
              <div className="flex items-center gap-2 p-2">
                {canOrder ? (
                  <div className="flex flex-col">
                    <button disabled={i === 0} onClick={() => move(c.id, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="size-3" /></button>
                    <button disabled={i === cats.length - 1} onClick={() => move(c.id, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="size-3" /></button>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground w-6 text-center">{i + 1}</span>
                )}
                <button
                  type="button"
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  aria-label="Ver produtos desta categoria"
                >
                  {expanded === c.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <Input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
              {expanded === c.id && (
                <div className="border-t border-border/60 p-2 space-y-1 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground px-1 pb-1">
                    Ordem em que os produtos aparecem nesta categoria. Use as setas para reorganizar.
                  </p>
                  {catProducts.length === 0 && (
                    <div className="p-3 text-[11px] text-center text-muted-foreground italic flex flex-col items-center gap-1">
                      <Package className="size-4 opacity-30" />
                      Nenhum produto nesta categoria ainda.
                    </div>
                  )}
                  {catProducts.map((p, pi) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background p-1.5">
                      <div className="flex flex-col">
                        <button disabled={pi === 0} onClick={() => moveProduct(p.id, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="size-3" /></button>
                        <button disabled={pi === catProducts.length - 1} onClick={() => moveProduct(p.id, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="size-3" /></button>
                      </div>
                      <div className="size-8 rounded bg-muted bg-cover bg-center shrink-0" style={{ backgroundImage: p.image ? `url(${p.image})` : undefined }} />
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-xs truncate">{p.name}</span>
                        {!p.is_active && <Badge variant="outline" className="text-[9px]">inativo</Badge>}
                        {p.menu_category_id !== c.id && (
                          <Badge variant="secondary" className="text-[9px]">secundária</Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground pr-1">#{pi + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {!canOrder && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Ordenação manual</h3>
            <Gated feature="category_ordering">
              <p className="text-sm text-muted-foreground">Reordene categorias arrastando ou pelas setas — disponível em planos superiores.</p>
            </Gated>
          </section>
        )}
      </div>
    </PainelSection>
  );
}
