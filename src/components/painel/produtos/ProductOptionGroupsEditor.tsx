import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Package, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  type FieldError = {
    field: "name" | "min" | "max" | "type" | "options" | "option-name" | "option-price";
    rule: "Obrigatório" | "Min/Max" | "Tipo" | "Preço" | "Nome" | "Duplicado";
    message: string;
    optionId?: string;
  };

  const validateGroup = (g: OptionGroup, opts: OptionRow[]): FieldError[] => {
    const errs: FieldError[] = [];
    if (!g.name || g.name.trim().length < 2)
      errs.push({ field: "name", rule: "Nome", message: "Dê um nome ao grupo (mín. 2 caracteres)." });
    const min = g.min_choices ?? 0;
    const max = g.max_choices ?? 1;
    if (min < 0) errs.push({ field: "min", rule: "Min/Max", message: "Mínimo não pode ser negativo." });
    if (max < 1) errs.push({ field: "max", rule: "Min/Max", message: "Máximo deve ser pelo menos 1." });
    if (min > max)
      errs.push({ field: "min", rule: "Min/Max", message: `Mínimo (${min}) não pode ser maior que máximo (${max}).` });
    if (g.is_required && min < 1)
      errs.push({ field: "min", rule: "Obrigatório", message: "Grupo obrigatório precisa ter mínimo ≥ 1." });
    if (g.type === "radio" && max > 1)
      errs.push({ field: "type", rule: "Tipo", message: 'Grupo "Escolha única" só permite máximo 1.' });
    if (opts.length === 0)
      errs.push({ field: "options", rule: "Obrigatório", message: "Adicione ao menos uma opção neste grupo." });
    if (opts.length > 0 && max > opts.length)
      errs.push({ field: "max", rule: "Min/Max", message: `Máximo (${max}) excede o número de opções (${opts.length}).` });
    const availableCount = opts.filter((o) => o.is_available !== false).length;
    if (g.is_required && availableCount < min)
      errs.push({ field: "options", rule: "Obrigatório", message: `Só há ${availableCount} opção(ões) disponível(is), mínimo é ${min}.` });
    opts.forEach((o) => {
      if (!o.name || o.name.trim().length < 1)
        errs.push({ field: "option-name", rule: "Nome", message: "Uma opção está sem nome.", optionId: o.id });
      if (Number(o.price) < 0)
        errs.push({ field: "option-price", rule: "Preço", message: `A opção "${o.name || "sem nome"}" tem preço negativo.`, optionId: o.id });
    });
    const names = opts.map((o) => o.name?.trim().toLowerCase()).filter(Boolean);
    const dupes = Array.from(new Set(names.filter((n, i) => names.indexOf(n) !== i)));
    dupes.forEach((d) => errs.push({ field: "option-name", rule: "Duplicado", message: `Existe mais de uma opção chamada "${d}".` }));
    return errs;
  };

  const ruleTone: Record<FieldError["rule"], string> = {
    "Obrigatório": "bg-amber-500/15 text-amber-600 border-amber-500/30",
    "Min/Max": "bg-blue-500/15 text-blue-600 border-blue-500/30",
    "Tipo": "bg-purple-500/15 text-purple-600 border-purple-500/30",
    "Preço": "bg-destructive/10 text-destructive border-destructive/30",
    "Nome": "bg-orange-500/15 text-orange-600 border-orange-500/30",
    "Duplicado": "bg-pink-500/15 text-pink-600 border-pink-500/30",
  };

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

  // Parses a Postgres error message like "... (field=min_choices)" and shows a
  // targeted toast so users know exactly which input the backend rejected.
  const handleDbError = (error: any, context: "group" | "option") => {
    const msg = error?.message ?? String(error);
    const m = msg.match(/\(field=([a-z_]+)\)/);
    const clean = msg.replace(/\s*\(field=[a-z_]+\)\s*/, "").trim();
    if (m) {
      const label = m[1];
      toast.error(`Backend rejeitou o campo "${label}"`, {
        description: clean,
      });
    } else {
      toast.error(clean || `Erro ao salvar ${context === "group" ? "grupo" : "opção"}`);
    }
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
    if (error) handleDbError(error, "group");
    else invalidate();
  };

  const updateGroup = async (id: string, patch: Partial<OptionGroup>) => {
    const { error } = await supabase.from("product_option_groups").update(patch).eq("id", id);
    if (error) handleDbError(error, "group");
    else invalidate();
  };

  const removeGroup = async (id: string) => {
    if (!confirm("Remover este grupo e todas as suas opções?")) return;
    await supabase.from("product_options").delete().eq("option_group_id", id);
    const { error } = await supabase.from("product_option_groups").delete().eq("id", id);
    if (error) handleDbError(error, "group");
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
    if (error) handleDbError(error, "option");
    else invalidate();
  };

  const updateOption = async (id: string, patch: Partial<OptionRow>) => {
    const { error } = await supabase.from("product_options").update(patch).eq("id", id);
    if (error) handleDbError(error, "option");
    else invalidate();
  };

  const removeOption = async (id: string) => {
    const { error } = await supabase.from("product_options").delete().eq("id", id);
    if (error) handleDbError(error, "option");
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

      {(() => {
        const totalErrors = groups.reduce((acc, g) => {
          const opts = options.filter((o) => o.option_group_id === g.id);
          return acc + validateGroup(g, opts).length;
        }, 0);
        if (totalErrors === 0 || groups.length === 0) return null;
        return (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              <strong>{totalErrors}</strong> problema(s) precisam ser corrigidos abaixo. Grupos inválidos
              podem quebrar a experiência do cliente no cardápio.
            </AlertDescription>
          </Alert>
        );
      })()}

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
          const errors = validateGroup(g, groupOptions);
          const invalid = errors.length > 0;
          const hasErr = (field: FieldError["field"], optionId?: string) =>
            errors.some((e) => e.field === field && (!optionId || e.optionId === optionId));
          return (
            <Card key={g.id} className={invalid ? "border-destructive/50" : "border-border/70"}>
              <CardContent className="pt-4 space-y-3">
                {invalid && (
                  <div className="rounded-md bg-destructive/5 border border-destructive/20 p-2 space-y-1">
                    {errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px]">
                        <Badge variant="outline" className={`text-[9px] font-semibold shrink-0 px-1.5 py-0 ${ruleTone[err.rule]}`}>
                          {err.rule}
                        </Badge>
                        <span className="text-destructive leading-tight pt-0.5">{err.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2 space-y-1">
                    <Label className={`text-[11px] ${hasErr("name") ? "text-destructive" : ""}`}>
                      Nome do grupo {hasErr("name") && "*"}
                    </Label>
                    <Input
                      defaultValue={g.name}
                      onBlur={(e) => e.target.value !== g.name && updateGroup(g.id, { name: e.target.value })}
                      aria-invalid={hasErr("name")}
                      className={hasErr("name") ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={`text-[11px] ${hasErr("type") ? "text-destructive" : ""}`}>Tipo</Label>
                    <Select
                      value={g.type ?? "checkbox"}
                      onValueChange={(v) => updateGroup(g.id, { type: v })}
                    >
                      <SelectTrigger className={hasErr("type") ? "border-destructive" : ""}><SelectValue /></SelectTrigger>
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
                    <Label className={`text-[11px] ${hasErr("min") ? "text-destructive font-semibold" : ""}`}>Mín:</Label>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={g.min_choices ?? 0}
                      onBlur={(e) => updateGroup(g.id, { min_choices: parseInt(e.target.value) || 0 })}
                      className={`w-16 h-8 text-xs text-center ${hasErr("min") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      aria-invalid={hasErr("min")}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className={`text-[11px] ${hasErr("max") ? "text-destructive font-semibold" : ""}`}>Máx:</Label>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={g.max_choices ?? 1}
                      onBlur={(e) => updateGroup(g.id, { max_choices: parseInt(e.target.value) || 1 })}
                      className={`w-16 h-8 text-xs text-center ${hasErr("max") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      aria-invalid={hasErr("max")}
                    />
                  </div>
                </div>

                <div className={`pl-2 border-l-2 space-y-2 ${hasErr("options") ? "border-destructive/60" : "border-primary/20"}`}>
                  {groupOptions.length === 0 && (
                    <p className={`text-[11px] italic ${hasErr("options") ? "text-destructive" : "text-muted-foreground"}`}>
                      {hasErr("options") ? "Este grupo precisa de pelo menos uma opção." : "Nenhuma opção neste grupo."}
                    </p>
                  )}
                  {groupOptions.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Input
                        defaultValue={o.name}
                        onBlur={(e) => e.target.value !== o.name && updateOption(o.id, { name: e.target.value })}
                        className={`flex-1 h-8 text-xs ${hasErr("option-name", o.id) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        placeholder="Nome da opção"
                        aria-invalid={hasErr("option-name", o.id)}
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-[10px] text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={Number(o.price)}
                          onBlur={(e) => updateOption(o.id, { price: Number(e.target.value) || 0 })}
                          className={`w-24 h-8 text-xs pl-7 ${hasErr("option-price", o.id) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          aria-invalid={hasErr("option-price", o.id)}
                          min={0}
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