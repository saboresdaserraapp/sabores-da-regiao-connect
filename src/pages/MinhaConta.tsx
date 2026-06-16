import { useState, useEffect } from "react";
import { Navigate, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OrderDetailsPanel } from "@/components/orders/OrderDetailsPanel";
import { OrderStatusStepper, STATUS_LABEL } from "@/components/orders/OrderStatusStepper";
import { OrderChat } from "@/components/OrderChat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/useFavorites";
import { useAddresses, useAddressMutations, type Address } from "@/hooks/useAddresses";
import { useHouseReference, useHouseReferenceSave, type HouseReference } from "@/hooks/useHouseReference";
import { useUserOrders, useActiveOrders } from "@/hooks/useOrders";
import { PedidosTab } from "@/components/profile/PedidosTab";
import { toast } from "sonner";
import { Heart, MapPin, Home, Receipt, CreditCard, UserRound, Plus, Trash2, Loader2, LogOut, Star, Video, Info, ShoppingBag, MessageCircle, Store, AlertCircle } from "lucide-react";
import { brl } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/page-header";

export default function MinhaConta() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "perfil";

  return (
    <div className="min-h-screen bg-gradient-cream">
      <Header />
      <main className="container py-8">
        <PageHeader
          title="Minha conta"
          description={user.email ?? undefined}
          actions={
            <Button variant="outline" onClick={async () => { await signOut(); }}>
              <LogOut className="mr-2 size-4" /> Sair
            </Button>
          }
        />

        <Tabs value={currentTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="perfil"><UserRound className="mr-1.5 size-4" /> Perfil</TabsTrigger>
            <TabsTrigger value="favoritos"><Heart className="mr-1.5 size-4" /> Favoritos</TabsTrigger>
            <TabsTrigger value="enderecos"><MapPin className="mr-1.5 size-4" /> Endereços</TabsTrigger>
            <TabsTrigger value="casa"><Home className="mr-1.5 size-4" /> Referência global</TabsTrigger>
            <TabsTrigger value="pedidos"><Receipt className="mr-1.5 size-4" /> Histórico de Pedidos</TabsTrigger>
            <TabsTrigger value="pagamentos"><CreditCard className="mr-1.5 size-4" /> Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil"><PerfilTab /></TabsContent>
          <TabsContent value="favoritos"><FavoritosTab /></TabsContent>
          <TabsContent value="enderecos"><EnderecosTab /></TabsContent>
          <TabsContent value="casa"><ReferenciaCasaTab onSaved={() => toast.success("Referência global salva")} /></TabsContent>
          <TabsContent value="pedidos"><PedidosTab /></TabsContent>
          <TabsContent value="pagamentos"><PagamentosTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PerfilTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const [form, setForm] = useState<any>(null);
  const f = form ?? profile ?? { display_name: "", phone: "", avatar_url: "" };

  async function save() {
    const { error } = await supabase.from("profiles").update({
      display_name: f.display_name, phone: f.phone, avatar_url: f.avatar_url,
    }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    await supabase.from("notifications").insert({
      user_id: user!.id,
      type: "profile_update",
      title: "Perfil atualizado",
      message: "Suas informações de perfil foram salvas com sucesso.",
    });
    qc.invalidateQueries({ queryKey: ["my-profile", user!.id] });
  }

  return (
    <div className="space-y-6">
    <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-[200px_1fr]">
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Avatar</label>
        <MediaUploader
          value={f.avatar_url} onChange={(url) => setForm({ ...f, avatar_url: url })}
          bucket="user-media" folder="avatar" aspect="aspect-square" maxSizeMB={4} allowUrlInput={false}
          label="Foto de perfil"
        />
      </div>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome</label>
          <Input value={f.display_name || ""} onChange={(e) => setForm({ ...f, display_name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefone</label>
          <Input value={f.phone || ""} onChange={(e) => setForm({ ...f, phone: e.target.value })} placeholder="(11) 99999-0000" />
        </div>
        <Button onClick={save}>Salvar perfil</Button>
      </div>
    </div>
    <SenhaCard />
    </div>
  );
}

function SenhaCard() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadIdentities() {
    const { data } = await supabase.auth.getUser();
    const identities = (data.user?.identities ?? []) as Array<{ provider: string }>;
    setHasPassword(identities.some((i) => i.provider === "email"));
  }

  useEffect(() => { loadIdentities(); }, []);

  async function save() {
    if (pwd.length < 8) return toast.error("A senha deve ter pelo menos 8 caracteres");
    if (pwd !== pwd2) return toast.error("As senhas não coincidem");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(hasPassword ? "Senha alterada com sucesso" : "Senha definida com sucesso");
    setPwd(""); setPwd2("");
    loadIdentities();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold">
        {hasPassword === false ? "Definir senha de acesso" : "Alterar senha"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasPassword === false
          ? "Você entrou via Google. Defina uma senha para também poder acessar com e-mail + senha caso o login Google falhe."
          : "Atualize sua senha de acesso. Use no mínimo 8 caracteres."}
      </p>
      <div className="mt-4 grid gap-3 md:max-w-md">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nova senha</label>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Confirmar nova senha</label>
          <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <Button onClick={save} disabled={saving || hasPassword === null}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {hasPassword === false ? "Definir senha" : "Alterar senha"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FavoritosTab() {
  const { data: favs = [] } = useFavorites();
  const estabIds = favs.filter((f: any) => f.kind === "establishment").map((f: any) => f.target_id);
  const productIds = favs.filter((f: any) => f.kind === "product").map((f: any) => f.target_id);

  const { data: estabs = [] } = useQuery({
    queryKey: ["fav-estabs", estabIds],
    enabled: estabIds.length > 0,
    queryFn: async () => (await supabase.from("establishments").select("id,slug,name,logo,cover,category_label,rating,reviews_count").in("id", estabIds)).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["fav-products", productIds],
    enabled: productIds.length > 0,
    queryFn: async () => (await supabase.from("products").select("id,name,price,image,establishment_id,establishments(name,slug)").in("id", productIds)).data ?? [],
  });

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">Estabelecimentos favoritos</h3>
        {estabs.length === 0 ? <Empty msg="Você ainda não favoritou nenhum estabelecimento." /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {estabs.map((e: any) => (
              <Link key={e.id} to={`/e/${e.slug}`} className="overflow-hidden rounded-2xl border border-border bg-card hover:border-primary">
                <div className="aspect-[16/9] bg-muted"><img src={e.cover} alt="" className="size-full object-cover" /></div>
                <div className="p-3">
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.category_label}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs"><Star className="size-3 fill-primary text-primary" /> {Number(e.rating).toFixed(1)} ({e.reviews_count})</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">Produtos favoritos</h3>
        {products.length === 0 ? <Empty msg="Você ainda não favoritou nenhum produto." /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p: any) => (
              <Link key={p.id} to={`/e/${p.establishments?.slug}`} className="flex gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted"><img src={p.image} alt="" className="size-full object-cover" /></div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.establishments?.name}</div>
                  <div className="mt-1 font-semibold text-primary">{brl(Number(p.price))}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EnderecosTab() {
  const { data: addrs = [] } = useAddresses();
  const { save, remove } = useAddressMutations();
  const [editing, setEditing] = useState<any | null>(null);
  const [editingRef, setEditingRef] = useState<Address | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Endereços de entrega</h3>
        <Button size="sm" onClick={() => setEditing({})}><Plus className="mr-1.5 size-4" /> Novo</Button>
      </div>
      {addrs.length === 0 && <Empty msg="Adicione seu primeiro endereço." />}
      <div className="grid gap-3 sm:grid-cols-2">
        {addrs.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{a.label} {a.is_default && <Badge variant="secondary">Padrão</Badge>}</div>
                <div className="text-sm text-muted-foreground">
                  {a.street}, {a.number} {a.complement && `· ${a.complement}`}<br />
                  {a.neighborhood}{a.neighborhood && a.city ? ", " : ""}{a.city} {a.zip && `· ${a.zip}`}
                </div>
                {a.reference && <div className="mt-1 text-xs italic text-muted-foreground">Ref: {a.reference}</div>}
                
                <AddressReferenceStatus addressId={a.id} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Editar</Button>
                  <Button size="icon" variant="outline" onClick={() => remove(a.id)}><Trash2 className="size-3.5" /></Button>
                </div>
                <Button size="sm" variant="ghost" className="text-xs h-8 text-primary" onClick={() => setEditingRef(a)}>
                  <Home className="mr-1 size-3" /> Referência
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing !== null && (
        <AddressForm initial={editing} onClose={() => setEditing(null)} onSave={async (v: any) => { await save(v); setEditing(null); }} />
      )}
      {editingRef !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-card shadow-glow overflow-hidden">
             <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="font-display font-bold">Editando referência do endereço: {editingRef.label}</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingRef(null)}>Fechar</Button>
             </div>
             <div className="p-1">
                <ReferenciaCasaTab addressId={editingRef.id} onSaved={() => setEditingRef(null)} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddressReferenceStatus({ addressId }: { addressId: string }) {
  const { data: ref, isLoading } = useHouseReference(addressId);
  const { data: addresses } = useAddresses();
  const address = addresses?.find(a => a.id === addressId);
  
  if (isLoading) return null;
  
  // A reference is considered to exist if it has media (legacy or new), pins, instructions, or if the address itself has some fields.
  const hasContent = ref && (
    (ref.media_urls && ref.media_urls.length > 0) || 
    ref.video_url || 
    ref.instructions || 
    ref.pin_1_description ||
    ref.pin_2_description ||
    ref.pin_3_description ||
    address?.popular_location_name ||
    address?.reference ||
    address?.delivery_instructions
  );

  if (!hasContent) {
    return <div className="mt-2 text-[10px] text-muted-foreground">Nenhuma referência visual vinculada a este endereço.</div>;
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
        <Home className="size-3" /> Referência visual cadastrada
      </div>
      <div className="flex gap-1 flex-wrap">
        {ref?.media_urls?.slice(0, 5).map((url, i) => (
          <img key={i} src={url} alt="" className="size-8 rounded object-cover border border-border" />
        ))}
        {ref?.video_url && (
          <div className="size-8 rounded border border-border bg-muted flex items-center justify-center" title="Vídeo cadastrado">
            <Video className="size-4 text-primary" />
          </div>
        )}
        {(ref?.pin_1_description || ref?.pin_2_description || ref?.pin_3_description) && (
          <div className="size-8 rounded border border-border bg-primary/10 flex items-center justify-center" title="Pins cadastrados">
            <MapPin className="size-4 text-primary" />
          </div>
        )}
        {ref?.instructions && (
          <div className="size-8 rounded border border-border bg-indigo-50 flex items-center justify-center" title="Instruções cadastradas">
            <Info className="size-4 text-indigo-600" />
          </div>
        )}
      </div>
    </div>
  );
}

function AddressForm({ initial, onClose, onSave }: any) {
  const [f, setF] = useState({
    id: initial.id, label: initial.label || "Casa", zip: initial.zip || "",
    street: initial.street || "", number: initial.number || "", complement: initial.complement || "",
    neighborhood: initial.neighborhood || "", city: initial.city || "", reference: initial.reference || "",
    state: initial.state || "",
    is_default: initial.is_default || false,
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-card p-6 shadow-glow">
        <h3 className="mb-4 font-display text-xl font-semibold">{f.id ? "Editar" : "Novo"} endereço</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Apelido (ex: Casa)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          <Input placeholder="CEP" value={f.zip} onChange={(e) => setF({ ...f, zip: e.target.value })} />
          <Input className="md:col-span-2" placeholder="Rua *" value={f.street} onChange={(e) => setF({ ...f, street: e.target.value })} />
          <Input placeholder="Número" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} />
          <Input placeholder="Complemento" value={f.complement} onChange={(e) => setF({ ...f, complement: e.target.value })} />
          <Input placeholder="Bairro" value={f.neighborhood} onChange={(e) => setF({ ...f, neighborhood: e.target.value })} />
          <Input placeholder="Cidade" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          <Input placeholder="UF (ex: SP)" maxLength={2} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value.toUpperCase() })} />
          <Textarea className="md:col-span-2" placeholder="Ponto de referência (ex: portão azul, ao lado da padaria)" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
          <label className="md:col-span-2 flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm">Definir como endereço padrão</span>
            <Switch checked={f.is_default} onCheckedChange={(v) => setF({ ...f, is_default: v })} />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (!f.street.trim()) return toast.error("Informe a rua"); onSave(f); }}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function ReferenciaCasaTab({ addressId, onSaved }: { addressId?: string, onSaved?: () => void }) {
  const { data: ref, refetch } = useHouseReference(addressId);
  const { data: addresses } = useAddresses();
  const addressLabel = addresses?.find(a => a.id === addressId)?.label || "Principal";
  
  const save = useHouseReferenceSave(addressId);
  const [media, setMedia] = useState<string[] | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [pins, setPins] = useState<{ [key: string]: string } | null>(null);

  // Synchronize state when ref changes
  useEffect(() => {
    if (ref) {
      if (media === null) setMedia(ref.media_urls || []);
      if (video === null) setVideo(ref.video_url || "");
      if (instructions === null) setInstructions(ref.instructions || "");
    }
  }, [ref]);

  const mediaUrls = media ?? [];
  const videoUrl = video ?? "";
  const instr = instructions ?? "";
  
  const getPin = (i: number) => {
    if (pins && pins[`pin_${i}`] !== undefined) return pins[`pin_${i}`];
    return (ref as any)?.[`pin_${i}_description`] || "";
  };

  const handleSave = async () => {
    const mediaItems = [
      ...mediaUrls.map(url => ({ media_type: 'photo' as const, media_url: url })),
      ...(videoUrl ? [{ media_type: 'video' as const, media_url: videoUrl }] : [])
    ];

    await save({ 
      instructions: instr || null,
      pin_1_description: getPin(1) || null,
      pin_2_description: getPin(2) || null,
      pin_3_description: getPin(3) || null,
    }, mediaItems);
    
    await refetch();
    if (onSaved) onSaved();
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold">
          {addressId ? `Editando referência do endereço: ${addressLabel}` : "Ajude o entregador a achar sua casa"}
        </h3>
        <p className="text-sm text-muted-foreground italic">Suas fotos e vídeo ficam privados. Use para mostrar fachada, portão e referências visuais.</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Fotos de referência (até 5)</label>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {mediaUrls.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
              <img src={url} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
              <button 
                onClick={() => setMedia(mediaUrls.filter((_, j) => j !== i))} 
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                ×
              </button>
            </div>
          ))}
          {mediaUrls.length < 5 ? (
            <MediaUploader
              value=""
              onChange={(url) => url && setMedia([...mediaUrls, url])}
              bucket="user-media" folder="house" aspect="aspect-square" maxSizeMB={6} allowUrlInput={false}
              label="Adicionar foto"
            />
          ) : (
            <div className="aspect-square rounded-xl border border-dashed border-border flex items-center justify-center p-4 text-center text-[10px] text-muted-foreground bg-muted/20">
              Você pode adicionar até 5 fotos de referência.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="text-sm font-medium">Vídeo curto da fachada (opcional)</label>
          <MediaUploader
            value={videoUrl} 
            onChange={(url) => {
              if (url && videoUrl && url !== videoUrl) {
                toast.info("Substituindo vídeo anterior...");
              }
              setVideo(url);
            }}
            bucket="user-media" folder="house-video" aspect="aspect-video" maxSizeMB={20} allowVideo allowUrlInput={false}
            label="Enviar vídeo (mp4 até 20MB)"
          />
          {videoUrl && (
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground italic">
                Apenas 1 vídeo permitido. O novo substituirá o atual.
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setVideo("")}
              >
                <Trash2 className="mr-1 size-3" /> Remover vídeo
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Pins de Referência (Opcional)</label>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 items-center">
              <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 border border-primary/20">{i}</div>
              <Input 
                placeholder={`Descrição do pin ${i} (ex: Portão Social)`} 
                value={getPin(i)}
                onChange={(e) => setPins({ ...pins, [`pin_${i}`]: e.target.value })}
                className="bg-muted/30"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Instruções por escrito</label>
        <Textarea
          rows={3}
          placeholder="Ex: Casa amarela, portão azul. Tocar campainha de cima."
          value={instr}
          onChange={(e) => setInstructions(e.target.value)}
          className="bg-muted/30"
        />
      </div>

      <Button onClick={handleSave} className="w-full md:w-auto px-8">
        Salvar referência completa
      </Button>
    </div>
  );
}

// PedidosTab is now in its own file src/components/profile/PedidosTab.tsx


function PagamentosTab() {
  const { data: orders = [] } = useUserOrders();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
        Os pedidos hoje são finalizados via WhatsApp diretamente com o estabelecimento. Esta área lista os valores declarados em cada pedido.
      </div>
      {orders.length === 0 ? <Empty msg="Sem registros de pagamento." /> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Data</th><th className="p-3">Estabelecimento</th><th className="p-3">Método</th><th className="p-3 text-right">Total</th></tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">{o.establishments?.name}</td>
                  <td className="p-3 capitalize">{o.payment_method || "—"}</td>
                  <td className="p-3 text-right font-semibold">{brl(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}
