import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Lock, Image as ImageIcon, Plus, Trash2, Package, Calendar } from "lucide-react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, planLabelForFeature, type FeatureKey } from "@/lib/permissions";
import { MediaUploader } from "@/components/media/MediaUploader";
import { ProductGalleryEditor } from "@/components/painel/produtos/ProductGalleryEditor";
import { ProductOptionGroupsEditor } from "@/components/painel/produtos/ProductOptionGroupsEditor";
import { TagEditor } from "@/components/painel/produtos/TagEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

export default function EditarProduto() {
  const { establishmentId, productId } = useParams();
  const navigate = useNavigate();
  const { ctx } = useActiveEstablishment();
  const [f, setF] = useState<any>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["prod", productId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("id", productId).single();
      setF(data);
      return data;
    },
    enabled: !!productId
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["mc-select", establishmentId],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("id,name").eq("establishment_id", establishmentId).order("position");
      return data ?? [];
    },
    enabled: !!establishmentId
  });

  if (isLoading || !f) return <div className="p-8 text-center">Carregando...</div>;

  const save = async () => {
    // Basic validation
    if (f.promo && f.promotional_price && Number(f.promotional_price) >= Number(f.price)) {
      return toast.error("O preço promocional deve ser menor que o preço normal.");
    }
    if (!f.name || String(f.name).trim().length < 2) {
      return toast.error("Dê um nome ao produto (mín. 2 caracteres).");
    }
    if (Number(f.price) < 0) {
      return toast.error("O preço não pode ser negativo.");
    }
    // Validar opcionais do produto (se existirem grupos, precisam estar íntegros)
    try {
      const [{ data: groups }, { data: opts }] = await Promise.all([
        supabase.from("product_option_groups").select("*").eq("product_id", productId!),
        supabase
          .from("product_options")
          .select("*, product_option_groups!inner(product_id)")
          .eq("product_option_groups.product_id", productId!),
      ]);
      const groupErrs: string[] = [];
      (groups ?? []).forEach((g: any) => {
        const gOpts = (opts ?? []).filter((o: any) => o.option_group_id === g.id);
        const min = g.min_choices ?? 0;
        const max = g.max_choices ?? 1;
        if (min > max) groupErrs.push(`Grupo "${g.name}": mínimo > máximo.`);
        if (g.is_required && min < 1) groupErrs.push(`Grupo "${g.name}" é obrigatório mas o mínimo é 0.`);
        if (g.type === "radio" && max > 1) groupErrs.push(`Grupo "${g.name}" é escolha única mas o máximo é > 1.`);
        if (gOpts.length === 0) groupErrs.push(`Grupo "${g.name}" está sem opções.`);
        if (gOpts.some((o: any) => Number(o.price) < 0)) groupErrs.push(`Grupo "${g.name}" tem opção com preço negativo.`);
      });
      if (groupErrs.length > 0) {
        return toast.error("Corrija os grupos de opcionais antes de salvar", {
          description: groupErrs.slice(0, 3).join(" • "),
        });
      }
    } catch (e) {
      console.warn("Falha ao validar grupos de opcionais", e);
    }

    const { error } = await supabase.from("products").update(f).eq("id", productId);
    if (error) toast.error(error.message);
    else {
      toast.success("Produto atualizado!");
      navigate(`/minha-loja/${establishmentId}/produtos`);
    }
  };

  const FeatureLock = ({ feature, children }: { feature: FeatureKey, children: React.ReactNode }) => {
    const allowed = canUseFeature(ctx, feature);
    if (allowed) return <>{children}</>;
    return (
      <div className="relative opacity-60 pointer-events-none grayscale">
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
          <Badge variant="secondary" className="flex items-center gap-1.5 shadow-sm border border-border/50">
            <Lock className="size-3" /> Disponível no plano {planLabelForFeature(feature)}
          </Badge>
        </div>
        {children}
      </div>
    );
  };

  const TAGS = [
    { id: "mais-vendido", label: "Mais vendido" },
    { id: "promo", label: "Promoção" },
    { id: "novo", label: "Novo" },
    { id: "vegetariano", label: "Vegetariano" },
    { id: "sem-lactose", label: "Sem lactose" },
    { id: "apimentado", label: "Apimentado" },
    { id: "serve-2", label: "Serve 2 pessoas" },
    { id: "recomendado", label: "Recomendado da casa" },
  ];

  const additionalIds: string[] = Array.isArray(f.additional_menu_category_ids) ? f.additional_menu_category_ids : [];
  const toggleAdditionalCategory = (id: string) => {
    if (id === f.menu_category_id) return; // é a principal, não duplica
    const next = additionalIds.includes(id)
      ? additionalIds.filter((x) => x !== id)
      : [...additionalIds, id];
    setF({ ...f, additional_menu_category_ids: next });
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 sticky top-0 bg-background/80 backdrop-blur-md z-20 py-4 border-b border-border/50 px-1">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-xl font-bold truncate max-w-[300px]">{f.name}</h1>
            <p className="text-xs text-muted-foreground">ID: {productId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={save} className="shadow-lg shadow-primary/20"><Save className="size-4 mr-2" /> Salvar alterações</Button>
        </div>
      </div>

      <Tabs defaultValue="basico" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
            <TabsTrigger value="basico" className="py-2 px-4">1. Básico</TabsTrigger>
            <TabsTrigger value="midia" className="py-2 px-4">2. Mídia</TabsTrigger>
            <TabsTrigger value="preco" className="py-2 px-4">3. Preço e Promoção</TabsTrigger>
            <TabsTrigger value="estoque" className="py-2 px-4">4. Estoque</TabsTrigger>
            <TabsTrigger value="adicionais" className="py-2 px-4">5. Adicionais</TabsTrigger>
            <TabsTrigger value="exibicao" className="py-2 px-4">6. Exibição</TabsTrigger>
            <TabsTrigger value="disponibilidade" className="py-2 px-4">7. Disponibilidade</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basico" className="space-y-6 pt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do produto</Label>
                  <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex: X-Salada Especial" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={f.menu_category_id ?? "none"} onValueChange={(v) => setF({ ...f, menu_category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição completa (cardápio)</Label>
                <Textarea 
                  value={f.description ?? ""} 
                  onChange={(e) => setF({ ...f, description: e.target.value })} 
                  placeholder="Detalhe os ingredientes e diferenciais do produto..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição curta (opcional)</Label>
                <Input 
                  value={f.short_description ?? ""} 
                  onChange={(e) => setF({ ...f, short_description: e.target.value })} 
                  placeholder={f.description ? "Fallback: " + f.description.substring(0, 40) + "..." : "Resumo rápido..."} 
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Ativo</Label>
                    <p className="text-[10px] text-muted-foreground">Visível para clientes</p>
                  </div>
                  <Switch checked={f.is_active !== false} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Disponível</Label>
                    <p className="text-[10px] text-muted-foreground">Pronto para venda</p>
                  </div>
                  <Switch checked={f.is_available !== false} onCheckedChange={(v) => setF({ ...f, is_available: v })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Observação</Label>
                    <p className="text-[10px] text-muted-foreground">Permitir notas do cliente</p>
                  </div>
                  <Switch checked={f.allows_notes !== false} onCheckedChange={(v) => setF({ ...f, allows_notes: v })} />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label>Tags de busca e filtros</Label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <Badge 
                      key={tag.id} 
                      variant={(f.tags_json as string[])?.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = (f.tags_json as string[]) || [];
                        const next = current.includes(tag.id) ? current.filter(t => t !== tag.id) : [...current, tag.id];
                        setF({ ...f, tags_json: next });
                      }}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="midia" className="space-y-6 pt-6">
          <FeatureLock feature="product_photos">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <Label>Imagem principal</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Foto principal exibida no cardápio. Arraste ou clique para enviar (jpg, png, webp, até 8MB).
                  </p>
                  <div className="max-w-md">
                    <MediaUploader
                      value={f.image ?? ""}
                      onChange={(url) => setF({ ...f, image: url || null })}
                      bucket="public-media"
                      folder={`establishments/${establishmentId}/products/${productId}`}
                      aspect="aspect-square"
                      label="Enviar foto principal"
                      allowUrlInput
                    />
                  </div>
                </div>

                <Separator />

                <FeatureLock feature="gallery">
                  <ProductGalleryEditor
                    productId={productId!}
                    establishmentId={establishmentId!}
                    max={5}
                  />
                </FeatureLock>
              </CardContent>
            </Card>
          </FeatureLock>
        </TabsContent>

        <TabsContent value="preco" className="space-y-6 pt-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Preço normal (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={f.price} 
                    onChange={(e) => setF({ ...f, price: e.target.value })} 
                    className={f.promo && f.promotional_price && Number(f.promotional_price) >= Number(f.price) ? "border-destructive" : ""}
                  />
                </div>
                <div className="space-y-4 p-4 border rounded-xl bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-primary">Ativar Promoção</Label>
                      <p className="text-[10px] text-muted-foreground">Ativa o selo e preço especial</p>
                    </div>
                    <Switch checked={!!f.promo} onCheckedChange={(v) => setF({ ...f, promo: v })} />
                  </div>
                  
                  {f.promo && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Preço promocional (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={f.promotional_price ?? ""} 
                          onChange={(e) => setF({ ...f, promotional_price: e.target.value })} 
                          placeholder="Menor que o preço normal"
                          className={f.promotional_price && Number(f.promotional_price) >= Number(f.price) ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {f.promotional_price && Number(f.promotional_price) >= Number(f.price) && (
                          <p className="text-[10px] text-destructive font-medium">O preço promocional deve ser menor que o preço normal.</p>
                        )}
                        {!f.promotional_price && (
                          <p className="text-[10px] text-amber-500 font-medium italic">Insira um valor para o selo aparecer no cardápio.</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Texto curto (ex: "Oferta")</Label>
                        <Input value={f.promotion_label ?? ""} onChange={(e) => setF({ ...f, promotion_label: e.target.value })} placeholder="Ex: Oferta do Dia" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Início (opcional)</Label>
                          <Input
                            type="datetime-local"
                            value={f.promotion_starts_at ? new Date(f.promotion_starts_at).toISOString().slice(0, 16) : ""}
                            onChange={(e) => setF({ ...f, promotion_starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Fim (opcional)</Label>
                          <Input
                            type="datetime-local"
                            value={f.promotion_ends_at ? new Date(f.promotion_ends_at).toISOString().slice(0, 16) : ""}
                            onChange={(e) => setF({ ...f, promotion_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          />
                        </div>
                      </div>
                      {f.promotional_price && Number(f.promotional_price) > 0 && Number(f.price) > 0 && Number(f.promotional_price) < Number(f.price) && (
                        <p className="text-[11px] text-primary font-medium">
                          Desconto: {Math.round((1 - Number(f.promotional_price) / Number(f.price)) * 100)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-6 pt-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div className="space-y-1">
                  <Label>Gerenciar estoque deste produto</Label>
                  <p className="text-xs text-muted-foreground">O sistema reduzirá a quantidade a cada venda</p>
                </div>
                <Switch checked={!!f.track_stock} onCheckedChange={(v) => setF({ ...f, track_stock: v })} />
              </div>

              {f.track_stock && (
                <div className="grid gap-6 md:grid-cols-2 animate-in fade-in">
                  <div className="space-y-2">
                    <Label>Quantidade atual em estoque</Label>
                    <Input type="number" value={f.stock_quantity ?? 0} onChange={(e) => setF({ ...f, stock_quantity: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estoque mínimo (alerta)</Label>
                    <Input type="number" value={f.stock_min ?? 0} onChange={(e) => setF({ ...f, stock_min: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg col-span-full">
                    <div className="space-y-0.5">
                      <Label>Pausar venda automaticamente</Label>
                      <p className="text-[10px] text-muted-foreground">Torna o produto indisponível quando o estoque chegar a zero</p>
                    </div>
                    <Switch checked={!!f.auto_pause_when_zero} onCheckedChange={(v) => setF({ ...f, auto_pause_when_zero: v })} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adicionais" className="space-y-6 pt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {canUseFeature(ctx, "simple_addons") ? (
                <ProductOptionGroupsEditor productId={productId!} />
              ) : (
                <div className="p-8 border-2 border-dashed rounded-xl bg-muted/20 text-center">
                  <Package className="size-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground mb-4">
                    Adicionais e acompanhamentos permitem que seus clientes personalizem os itens, aumentando o ticket médio.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/minha-loja/${establishmentId}/planos`)}>
                    Liberar adicionais
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exibicao" className="space-y-6 pt-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Produto em Destaque</Label>
                    <p className="text-[10px] text-muted-foreground">Aparece no topo do cardápio</p>
                  </div>
                  <Switch checked={!!f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Produto Popular</Label>
                    <p className="text-[10px] text-muted-foreground">Selo de mais pedido</p>
                  </div>
                  <Switch checked={!!f.popular} onCheckedChange={(v) => setF({ ...f, popular: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Ordem de exibição</Label>
                  <Input type="number" value={f.position ?? 0} onChange={(e) => setF({ ...f, position: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disponibilidade" className="space-y-6 pt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
               <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="space-y-1">
                     <Label>Regras de Disponibilidade</Label>
                     <p className="text-sm text-muted-foreground">Defina em quais dias e horários este produto ficará visível.</p>
                   </div>
                   <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const current = f.availability_rules_json || { days: [], notes: "" };
                      setF({ ...f, availability_rules_json: { ...current, days: current.days.length > 0 ? [] : [1, 2, 3, 4, 5, 6, 0] } });
                    }}
                   >
                     {f.availability_rules_json?.days?.length > 0 ? "Limpar Regras" : "Ativar Horários"}
                   </Button>
                 </div>

                 {f.availability_rules_json?.days ? (
                   <div className="space-y-4 animate-in fade-in">
                     <div className="grid grid-cols-7 gap-2">
                       {[
                         { id: 1, label: "Seg" },
                         { id: 2, label: "Ter" },
                         { id: 3, label: "Qua" },
                         { id: 4, label: "Qui" },
                         { id: 5, label: "Sex" },
                         { id: 6, label: "Sáb" },
                         { id: 0, label: "Dom" },
                       ].map((day) => (
                         <Button
                           key={day.id}
                           variant={f.availability_rules_json.days.includes(day.id) ? "default" : "outline"}
                           className="h-10 p-0 text-xs"
                           onClick={() => {
                             const days = f.availability_rules_json.days;
                             const next = days.includes(day.id) 
                               ? days.filter((d: number) => d !== day.id) 
                               : [...days, day.id];
                             setF({ ...f, availability_rules_json: { ...f.availability_rules_json, days: next } });
                           }}
                         >
                           {day.label}
                         </Button>
                       ))}
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label className="text-xs">Início</Label>
                         <Input 
                           type="time" 
                           value={f.availability_rules_json.start_time || "00:00"} 
                           onChange={(e) => setF({ ...f, availability_rules_json: { ...f.availability_rules_json, start_time: e.target.value } })} 
                         />
                       </div>
                       <div className="space-y-2">
                         <Label className="text-xs">Fim</Label>
                         <Input 
                           type="time" 
                           value={f.availability_rules_json.end_time || "23:59"} 
                           onChange={(e) => setF({ ...f, availability_rules_json: { ...f.availability_rules_json, end_time: e.target.value } })} 
                         />
                       </div>
                     </div>

                     <div className="space-y-2">
                       <Label className="text-xs">Observações / Motivo (Ex: Apenas no Almoço)</Label>
                       <Input 
                         value={f.availability_rules_json.notes || ""} 
                         onChange={(e) => setF({ ...f, availability_rules_json: { ...f.availability_rules_json, notes: e.target.value } })} 
                         placeholder="Ex: Produto disponível apenas durante o horário de almoço"
                       />
                     </div>
                   </div>
                 ) : (
                   <div className="p-8 text-center border border-dashed rounded-xl bg-muted/20">
                     <Calendar className="size-8 mx-auto mb-2 opacity-20" />
                     <p className="text-sm text-muted-foreground">Este produto segue o horário padrão de funcionamento da loja.</p>
                   </div>
                 )}
               </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
