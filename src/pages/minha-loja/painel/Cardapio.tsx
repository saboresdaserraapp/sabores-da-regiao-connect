import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { PainelSection, Gated } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Cardapio() {
  const { ctx } = useActiveEstablishment();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
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

  if (!ctx) return null;
  return (
    <PainelSection title="Cardápio" subtitle="Categorias do seu cardápio — alterações aplicam-se em tempo real no app">
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
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
              {canOrder ? (
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={() => move(c.id, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="size-3" /></button>
                  <button disabled={i === cats.length - 1} onClick={() => move(c.id, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="size-3" /></button>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground w-6 text-center">{i + 1}</span>
              )}
              <Input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)} className="flex-1" />
              <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
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
