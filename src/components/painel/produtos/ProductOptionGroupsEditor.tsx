import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

interface Props {
  productId: string;
}

type OptionGroup = {
  id: string;
  product_id: string;
  name: string;
  type: string;
  is_required: boolean | null;
  min_choices: number | null;
  max_choices: number | null;
  display_order: number | null;
};

type OptionRow = {
  id: string;
  option_group_id: string;
  name: string;
  price: number;
  is_available: boolean | null;
  display_order: number | null;
};

export function ProductOptionGroupsEditor({ productId }: Props) {
  const qc = useQueryClient();
  const gKey = ["product-option-groups", productId];
  const oKey = ["product-options", productId];

  const { data: groups = [] } = useQuery({
    queryKey: gKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_option_groups")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OptionGroup[];
    },
  });

  const { data: options = [] } = useQuery({
    queryKey: oKey,
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
      return (data ?? []) as OptionRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: gKey });
    qc.invalidateQueries({ queryKey: oKey });
  };

  const addGroup = async () => {
    const { error } = await supabase.from("product_option_groups").insert({
      product_id: productId,
      name: "Novo grupo",
      type: "checkbox",
      is_required: false,
      min_choices: 0,
      max_choices: 1,
      display_order: groups.length,
    });
    if (error) toast.error(error.message);
    else invalidate();
  };

  const updateGroup = async (id: string, patch: Partial<OptionGroup>) => {
    const { error } = await supabase.from("product_option_groups").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const removeGroup = async (id: string) => {
    if (!confirm("Remover este grupo e todas as suas opções?")) return;
    await supabase.from("product_options").delete().eq("option_group_id", id);
    const { error } = await supabase.from("product_option_groups").delete().eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const addOption = async (groupId: string) => {
    const groupOptions = options.filter((o) => o.option_group_id === groupId);
    const { error } = await supabase.from("product_options").insert({
      option_group_id: groupId,
      name: "Nova opção",
      price: 0,
      is_available: true,
      display_order: groupOptions.length,
    });
    if (error) toast.error(error.message);
    else invalidate();
  };

  const updateOption = async (id: string, patch: Partial<OptionRow>) => {
    const { error } = await supabase.from("product_options").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  const removeOption = async (id: string) => {
    const { error } = await supabase.from("product_options").delete().eq("id", id);
    if (error) toast.error(error.message);
    else invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Grupos de opcionais e acompanhamentos</h3>
          <p className="text-[11px] text-muted-foreground">
            Ex: "Escolha o tamanho" (obrigatório, 1 escolha) ou "Adicionais" (opcional, até 5).
          </p>
        </div>
        <Button size="sm" onClick={addGroup}>
          <Plus className="size-3.5 mr-1" /> Novo grupo
        </Button>
      </div>

      {groups.length === 0 && (
        <div className="p-8 border border-dashed rounded-xl bg-muted/20 text-center">
          <Package className="size-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            Nenhum grupo cadastrado. Crie um para oferecer variações, acompanhamentos ou adicionais.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((g) => {
          const groupOptions = options.filter((o) => o.option_group_id === g.id);
          return (
            <Card key={g.id} className="border-border/70">
              <CardContent className="pt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px]">Nome do grupo</Label>
                    <Input
                      defaultValue={g.name}
                      onBlur={(e) => e.target.value !== g.name && updateGroup(g.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Tipo</Label>
                    <Select
                      value={g.type ?? "checkbox"}
                      onValueChange={(v) => updateGroup(g.id, { type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkbox">Múltipla escolha</SelectItem>
                        <SelectItem value="radio">Escolha única</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeGroup(g.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!g.is_required}
                      onCheckedChange={(v) => updateGroup(g.id, { is_required: v })}
                    />
                    <Label className="text-[11px]">Obrigatório</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px]">Mín:</Label>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={g.min_choices ?? 0}
                      onBlur={(e) => updateGroup(g.id, { min_choices: parseInt(e.target.value) || 0 })}
                      className="w-16 h-8 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px]">Máx:</Label>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={g.max_choices ?? 1}
                      onBlur={(e) => updateGroup(g.id, { max_choices: parseInt(e.target.value) || 1 })}
                      className="w-16 h-8 text-xs text-center"
                    />
                  </div>
                </div>

                <div className="pl-2 border-l-2 border-primary/20 space-y-2">
                  {groupOptions.length === 0 && (
                    <p className="text-[11px] italic text-muted-foreground">Nenhuma opção neste grupo.</p>
                  )}
                  {groupOptions.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Input
                        defaultValue={o.name}
                        onBlur={(e) => e.target.value !== o.name && updateOption(o.id, { name: e.target.value })}
                        className="flex-1 h-8 text-xs"
                        placeholder="Nome da opção"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-[10px] text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={Number(o.price)}
                          onBlur={(e) => updateOption(o.id, { price: Number(e.target.value) || 0 })}
                          className="w-24 h-8 text-xs pl-7"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={o.is_available !== false}
                          onCheckedChange={(v) => updateOption(o.id, { is_available: v })}
                        />
                        <Label className="text-[10px] text-muted-foreground">Disp.</Label>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOption(o.id)}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="h-7 text-[11px] w-full border-dashed" onClick={() => addOption(g.id)}>
                    <Plus className="size-3 mr-1" /> Adicionar opção
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}