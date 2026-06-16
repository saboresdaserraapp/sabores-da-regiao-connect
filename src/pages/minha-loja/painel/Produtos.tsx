import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, planLabelForFeature } from "@/lib/permissions";
import { PainelSection, Gated } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

type Product = {
  id: string; name: string; description: string | null; price: number;
  image: string | null; featured: boolean; promo: boolean; menu_category_id: string | null;
  // V2 fields (optional to keep compatibility)
  short_description?: string | null;
  promotional_price?: number | null;
  promotion_label?: string | null;
  is_available?: boolean;
  is_active?: boolean;
  track_stock?: boolean;
  stock_quantity?: number | null;
  options?: any;
  availability_rules_json?: any;
};

type Opt = { name: string; price: number; type?: "simple" | "variation" | "combo"; min?: number; max?: number };

function ProductForm({ ctx, initial, onDone }: { ctx: any; initial?: Partial<Product>; onDone: () => void }) {
  const [f, setF] = useState<any>({
    name: initial?.name ?? "", 
    description: initial?.description ?? "",
    price: initial?.price ?? 0, 
    image: initial?.image ?? "",
    featured: !!initial?.featured, 
    promo: !!initial?.promo,
    menu_category_id: initial?.menu_category_id ?? null,
    // Novos campos v2 iniciais
    is_available: initial?.is_available ?? true,
    is_active: initial?.is_active ?? true,
    track_stock: !!initial?.track_stock,
    stock_quantity: initial?.stock_quantity ?? 0,
    short_description: initial?.short_description ?? "",
    options: Array.isArray(initial?.options) ? initial.options : [],
    availability_rules_json: initial?.availability_rules_json ?? null,
  });
  
  const canPhoto = canUseFeature(ctx, "product_photos");
  const canFeatured = canUseFeature(ctx, "featured_products");
  const canPromo = canUseFeature(ctx, "simple_promotions");
  const canSimpleAddons = canUseFeature(ctx, "simple_addons");
  const canAdvancedAddons = canUseFeature(ctx, "advanced_addons");

  const { data: cats = [] } = useQuery({
    queryKey: ["mc-select", ctx.establishmentId],
    queryFn: async () => {
      const { data } = await supabase.from("menu_categories").select("id,name").eq("establishment_id", ctx.establishmentId).order("position");
      return data ?? [];
    },
  });

  const save = async () => {
    if (f.options?.some((o: any) => (o.min ?? 0) > (o.max ?? 1))) {
      return toast.error("O mínimo não pode ser maior que o máximo nos adicionais");
    }
    
    if (!f.name) return toast.error("Nome é obrigatório");
    
    const payload: any = {
      establishment_id: ctx.establishmentId,
      name: f.name, 
      description: f.description || null,
      price: Number(f.price) || 0,
      image: canPhoto ? (f.image || null) : (initial?.image ?? null),
      featured: canFeatured ? !!f.featured : false,
      promo: canPromo ? !!f.promo : false,
      menu_category_id: f.menu_category_id,
      // Novos campos v2
      is_available: f.is_available,
      is_active: f.is_active,
      track_stock: f.track_stock,
      stock_quantity: Number(f.stock_quantity) || 0,
      short_description: f.short_description || null,
      options: f.options,
      availability_rules_json: f.availability_rules_json,
    };
    const q = initial?.id
      ? supabase.from("products").update(payload).eq("id", initial.id)
      : supabase.from("products").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Salvo"); 
    onDone();
  };

  const addOption = (type: Opt["type"] = "simple") => {
    const newOpt: Opt = { name: "Novo adicional", price: 0, type };
    setF({ ...f, options: [...f.options, newOpt] });
  };

  const updateOption = (index: number, patch: Partial<Opt>) => {
    const next = [...f.options];
    next[index] = { ...next[index], ...patch };
    setF({ ...f, options: next });
  };

  const removeOption = (index: number) => {
    setF({ ...f, options: f.options.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4 max-h-[85vh] overflow-y-auto px-1">
      <div className="grid gap-3">
        <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex: X-Salada Especial" /></div>
        <div><Label>Descrição Curta</Label><Input value={f.short_description} onChange={(e) => setF({ ...f, short_description: e.target.value })} placeholder="Resumo rápido..." /></div>
        <div><Label>Descrição Completa</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Detalhes do produto..." /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        <div>
          <Label>Categoria</Label>
          <Select value={f.menu_category_id ?? "none"} onValueChange={(v) => setF({ ...f, menu_category_id: v === "none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Adicionais</Label>
          {!canSimpleAddons && (
            <Badge variant="secondary" className="text-[9px] gap-1"><Lock className="size-2" /> Essencial</Badge>
          )}
        </div>
        
        {canSimpleAddons ? (
          <div className="space-y-2">
            {f.options.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhum adicional cadastrado.</p>
            )}
            {f.options.map((o: Opt, i: number) => (
              <div key={i} className="rounded-lg border border-border bg-card p-2 animate-in fade-in slide-in-from-left-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Input 
                    value={o.name} 
                    onChange={(e) => updateOption(i, { name: e.target.value })} 
                    className="flex-1 h-8 text-xs" 
                    placeholder="Nome do opcional"
                  />
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={o.price} 
                    onChange={(e) => updateOption(i, { price: Number(e.target.value) })} 
                    className="w-16 h-8 text-xs text-center" 
                    placeholder="R$"
                  />
                  {canAdvancedAddons && (
                    <Select value={o.type ?? "simple"} onValueChange={(v: any) => updateOption(i, { type: v })}>
                      <SelectTrigger className="w-20 h-8 text-[9px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple" className="text-[10px]">Simple</SelectItem>
                        <SelectItem value="variation" className="text-[10px]">Var</SelectItem>
                        <SelectItem value="combo" className="text-[10px]">Combo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(i)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Mín:</span>
                    <Input 
                      type="number" 
                      min="0"
                      value={o.min ?? 0} 
                      onChange={(e) => updateOption(i, { min: parseInt(e.target.value) || 0 })} 
                      className="w-12 h-6 text-[10px] text-center px-1" 
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Máx:</span>
                    <Input 
                      type="number" 
                      min="1"
                      value={o.max ?? 1} 
                      onChange={(e) => updateOption(i, { max: parseInt(e.target.value) || 1 })} 
                      className="w-12 h-6 text-[10px] text-center px-1" 
                    />
                  </div>
                  {(o.min ?? 0) > (o.max ?? 1) && (
                    <span className="text-[9px] text-destructive animate-pulse">Mín &gt; Máx!</span>
                  )}
                </div>
              </div>
            ))}
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => addOption("simple")}>
                <Plus className="size-3 mr-1" /> Opcional
              </Button>
              {canAdvancedAddons && (
                <>
                  <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => addOption("variation")}>
                    <Plus className="size-3 mr-1" /> Variação
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => addOption("combo")}>
                    <Plus className="size-3 mr-1" /> Combo
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center">
            <p className="text-[10px] text-muted-foreground">Opcionais permitem que clientes personalizem o pedido.</p>
            <Button variant="link" className="h-auto p-0 text-[10px]" onClick={() => (window.location.href = `../../planos`)}>Ver planos</Button>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4 p-2 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <Switch checked={f.track_stock} onCheckedChange={(v) => setF({ ...f, track_stock: v })} />
          <Label className="text-xs">Controlar estoque</Label>
        </div>
        {f.track_stock && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Qtd:</Label>
            <Input type="number" className="w-20 h-8" value={f.stock_quantity} onChange={(e) => setF({ ...f, stock_quantity: e.target.value })} />
          </div>
        )}
      </div>

      {canPhoto && (
        <div><Label>URL da foto</Label><Input value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} placeholder="https://..." /></div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {canFeatured && (
          <div className="flex items-center gap-2 p-2 border rounded-lg"><Switch checked={f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} /><span className="text-[10px] font-medium">Destaque</span></div>
        )}
        {canPromo && (
          <div className="flex items-center gap-2 p-2 border rounded-lg"><Switch checked={f.promo} onCheckedChange={(v) => setF({ ...f, promo: v })} /><span className="text-[10px] font-medium">Promoção</span></div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 border rounded-lg"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /><span className="text-[10px] font-medium">Ativo</span></div>
        <div className="flex items-center gap-2 p-2 border rounded-lg"><Switch checked={f.is_available} onCheckedChange={(v) => setF({ ...f, is_available: v })} /><span className="text-[10px] font-medium">Disponível</span></div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-sm font-semibold">Disponibilidade</Label>
        <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
          <p className="text-[10px] text-muted-foreground">
            {f.availability_rules_json 
              ? "Regras personalizadas configuradas." 
              : "Segue o horário padrão da loja."}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[10px] w-full"
            onClick={() => toast.info("Configure detalhes na edição completa do produto.")}
          >
            Configurar horários
          </Button>
        </div>
      </div>

      <Button onClick={save} className="w-full">Salvar</Button>
      <p className="text-[10px] text-center text-muted-foreground italic">Após salvar, você poderá configurar limites avançados na edição completa.</p>
    </div>
  );
}

export default function Produtos() {
  const { ctx } = useActiveEstablishment();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["prods", ctx?.establishmentId],
    enabled: !!ctx,
    queryFn: async (): Promise<Product[]> => {
      const { data } = await supabase
        .from("products")
        .select(`
          id,name,description,price,image,featured,promo,menu_category_id,
          short_description,promotional_price,promotion_label,is_available,is_active,track_stock,stock_quantity,
          options, availability_rules_json
        `)
        .eq("establishment_id", ctx!.establishmentId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Product[];
    },
  });

  const onDone = () => { qc.invalidateQueries({ queryKey: ["prods", ctx?.establishmentId] }); setOpen(false); setEditing(null); };
  const del = async (id: string) => {
    if (!confirm("Excluir produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { qc.invalidateQueries({ queryKey: ["prods", ctx?.establishmentId] }); toast.success("Removido"); }
  };

  if (!ctx) return null;

  return (
    <PainelSection
      title="Produtos"
      subtitle="Crie e edite produtos — visíveis no app em tempo real"
      action={
        <Dialog open={open && !editing} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />Novo produto</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Novo produto</DialogTitle></DialogHeader>
            <ProductForm ctx={ctx} onDone={onDone} />
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-2">
        {products.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>}
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-shadow hover:shadow-sm">
            <div className="size-12 rounded-lg bg-muted bg-cover bg-center" style={{ backgroundImage: p.image ? `url(${p.image})` : undefined }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="font-medium text-sm truncate text-balance">{p.name}</div>
                {p.featured && <Badge variant="secondary" className="text-[9px]">Destaque</Badge>}
                {p.promo && <Badge className="text-[9px] bg-primary/15 text-primary border-0">Promo</Badge>}
              </div>
              <div className="text-xs font-semibold text-primary">R$ {Number(p.price).toFixed(2)}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate(`${p.id}/editar`)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}

        {!canUseFeature(ctx, "product_photos") && (
          <section className="pt-4">
            <h3 className="mb-2 text-sm font-semibold">Fotos de produto</h3>
            <Gated feature="product_photos"><p className="text-sm text-muted-foreground">Anexe fotos aos seus produtos.</p></Gated>
          </section>
        )}
        {!canUseFeature(ctx, "featured_products") && (
          <section className="pt-4">
            <h3 className="mb-2 text-sm font-semibold">Produtos em destaque</h3>
            <Gated feature="featured_products"><p className="text-sm text-muted-foreground">Destaque produtos no topo do cardápio.</p></Gated>
          </section>
        )}
      </div>
    </PainelSection>
  );
}
