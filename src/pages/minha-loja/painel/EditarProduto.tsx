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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Adicionais (Opcionais)</h3>
                  <p className="text-[10px] text-muted-foreground">Personalize o produto com extras, variações ou combos.</p>
                </div>
                {!canUseFeature(ctx, "simple_addons") && (
                  <Badge variant="secondary" className="text-[9px] gap-1"><Lock className="size-2" /> Essencial</Badge>
                )}
              </div>

              {canUseFeature(ctx, "simple_addons") ? (
                <div className="space-y-3">
                  {(!f.options || f.options.length === 0) && (
                    <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20">
                      <p className="text-xs text-muted-foreground italic">Nenhum adicional cadastrado.</p>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    {Array.isArray(f.options) && f.options.map((o: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 animate-in fade-in slide-in-from-left-2">
                        <Input 
                          value={o.name} 
                          onChange={(e) => {
                            const next = [...f.options];
                            next[i] = { ...next[i], name: e.target.value };
                            setF({ ...f, options: next });
                          }} 
                          className="flex-1 h-8 text-xs" 
                          placeholder="Nome do opcional"
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] text-muted-foreground">R$</span>
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={o.price} 
                            onChange={(e) => {
                              const next = [...f.options];
                              next[i] = { ...next[i], price: Number(e.target.value) || 0 };
                              setF({ ...f, options: next });
                            }} 
                            className="w-24 h-8 text-xs pl-7" 
                            placeholder="0,00"
                          />
                        </div>
                        {canUseFeature(ctx, "advanced_addons") && (
                          <Select 
                            value={o.type ?? "simple"} 
                            onValueChange={(v: any) => {
                              const next = [...f.options];
                              next[i] = { ...next[i], type: v };
                              setF({ ...f, options: next });
                            }}
                          >
                            <SelectTrigger className="w-28 h-8 text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple" className="text-[10px]">Simples</SelectItem>
                              <SelectItem value="variation" className="text-[10px]">Variação</SelectItem>
                              <SelectItem value="combo" className="text-[10px]">Combo</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-muted-foreground">Mín:</span>
                            <Input 
                              type="number" 
                              min="0"
                              value={o.min ?? 0} 
                              onChange={(e) => {
                                const next = [...f.options];
                                next[i] = { ...next[i], min: parseInt(e.target.value) || 0 };
                                setF({ ...f, options: next });
                              }} 
                              className="w-10 h-6 text-[9px] text-center px-1" 
                            />
                            <span className="text-[9px] text-muted-foreground ml-1">Máx:</span>
                            <Input 
                              type="number" 
                              min="1"
                              value={o.max ?? 1} 
                              onChange={(e) => {
                                const next = [...f.options];
                                next[i] = { ...next[i], max: parseInt(e.target.value) || 1 };
                                setF({ ...f, options: next });
                              }} 
                              className="w-10 h-6 text-[9px] text-center px-1" 
                            />
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                          onClick={() => {
                            setF({ ...f, options: f.options.filter((_: any, idx: number) => idx !== i) });
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-[11px] flex-1 border-dashed" 
                      onClick={() => {
                        const next = Array.isArray(f.options) ? [...f.options] : [];
                        next.push({ name: "Novo adicional", price: 0, type: "simple" });
                        setF({ ...f, options: next });
                      }}
                    >
                      <Plus className="size-3 mr-1" /> Opcional Simples
                    </Button>
                    
                    {canUseFeature(ctx, "advanced_addons") ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[11px] flex-1 border-dashed" 
                          onClick={() => {
                            const next = Array.isArray(f.options) ? [...f.options] : [];
                            next.push({ name: "Nova variação", price: 0, type: "variation" });
                            setF({ ...f, options: next });
                          }}
                        >
                          <Plus className="size-3 mr-1" /> Variação (P, M, G)
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[11px] flex-1 border-dashed" 
                          onClick={() => {
                            const next = Array.isArray(f.options) ? [...f.options] : [];
                            next.push({ name: "Novo combo", price: 0, type: "combo" });
                            setF({ ...f, options: next });
                          }}
                        >
                          <Plus className="size-3 mr-1" /> Item de Combo
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 opacity-50 cursor-not-allowed">
                        <Lock className="size-3" />
                        <span className="text-[10px]">Variações e Combos (Gold+)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed rounded-xl bg-muted/20 text-center">
                  <Package className="size-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground mb-4">Adicionais permitem que seus clientes personalizem os itens, aumentando o ticket médio.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/minha-loja/${establishmentId}/planos`)}>
                    Liberar Adicionais
                  </Button>
                </div>
              )}

              <Separator className="my-6" />
              
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="size-4 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold">Grupos de Adicionais Avançados (Breve)</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Em breve você poderá criar grupos complexos com limites de seleção mínima/máxima e categorias de adicionais compartilhadas entre produtos.
                </p>
              </div>
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
