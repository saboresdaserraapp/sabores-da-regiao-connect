import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, planLabelForFeature } from "@/lib/permissions";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, ExternalLink, Image as ImageIcon, Video, MapPin, 
  FileText, Loader2, Smartphone, CheckSquare, Square, Link2, Copy, Trash2,
  Search, MessageCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HouseReference {
  id: string;
  media_urls: string[];
  video_url: string | null;
  instructions: string | null;
  pin_1_description: string | null;
  pin_2_description: string | null;
  pin_3_description: string | null;
  updated_at: string;
}

export function OrderReferencesPanel({ orderId }: { orderId: string }) {
  const { ctx } = useActiveEstablishment();
  const queryClient = useQueryClient();
  const [selectedMedias, setSelectedMedias] = useState<string[]>([]);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "logs">("visual");
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [customPhone, setCustomPhone] = useState("");
  const [driverSearch, setDriverSearch] = useState("");

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ["order-for-ref", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, address_id, tracking_code, customer_name, customer_phone, establishment_id,
          assigned_driver_id, assigned_driver_name, assigned_driver_phone, user_id
        `)
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const addressId = order?.address_id;
  const userId = order?.user_id;

  const { data: address } = useQuery({
    queryKey: ["address-for-ref", addressId],
    enabled: !!addressId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", addressId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 1. Buscar referência específica do endereço
  const { data: addressRef, isLoading: loadingAddrRef } = useQuery({
    queryKey: ["order-references-addr", addressId],
    enabled: !!addressId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("house_references")
        .select("*, media:house_reference_media(*)")
        .eq("address_id", addressId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const media = (data as any).media || [];
      const photos = media.filter((m: any) => m.media_type === 'photo').map((m: any) => m.media_url);
      const video = media.find((m: any) => m.media_type === 'video')?.media_url;

      return {
        ...data,
        media_urls: photos.length > 0 ? photos : (Array.isArray(data.media_urls) ? data.media_urls : []),
        video_url: video || data.video_url
      } as HouseReference | null;
    },
  });

  // 2. Buscar referência global do usuário (fallback)
  const { data: globalRef, isLoading: loadingGlobalRef } = useQuery({
    queryKey: ["order-references-global", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("house_references")
        .select("*, media:house_reference_media(*)")
        .eq("user_id", userId!)
        .is("address_id", null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const media = (data as any).media || [];
      const photos = media.filter((m: any) => m.media_type === 'photo').map((m: any) => m.media_url);
      const video = media.find((m: any) => m.media_type === 'video')?.media_url;

      return {
        ...data,
        media_urls: photos.length > 0 ? photos : (Array.isArray(data.media_urls) ? data.media_urls : []),
        video_url: video || data.video_url
      } as HouseReference | null;
    },
  });

  const ref = addressRef || globalRef;
  const refSource = addressRef ? "endereço" : (globalRef ? "global" : null);

  const { data: drivers } = useQuery({
    queryKey: ["drivers-for-ref", order?.establishment_id],
    enabled: !!order?.establishment_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("establishment_id", order!.establishment_id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: shareLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ["order-share-logs", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_reference_share_logs")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const canUseHistory = canUseFeature(ctx, "send_order_references");


  const { data: establishment } = useQuery({
    queryKey: ["establishment-config", order?.establishment_id],
    enabled: !!order?.establishment_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("establishments")
        .select("ref_link_expiration_hours")
        .eq("id", order!.establishment_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loadingOrder || loadingAddrRef || loadingGlobalRef) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }


  if (!addressId || !ref) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhuma referência visual cadastrada para este pedido.
      </div>
    );
  }

  const allMedias = [...(ref.media_urls || [])];
  if (ref.video_url) allMedias.push(ref.video_url);

  const hasMedia = ref.media_urls && ref.media_urls.length > 0;
  const hasVideo = !!ref.video_url;
  const hasPins = !!(ref.pin_1_description || ref.pin_2_description || ref.pin_3_description);
  const hasInstructions = !!ref.instructions;

  const toggleMedia = (url: string) => {
    setSelectedMedias(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const selectAll = () => setSelectedMedias(allMedias);
  const clearSelection = () => setSelectedMedias([]);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const downloadAll = async () => {
    const urls = selectedMedias.length > 0 ? selectedMedias : allMedias;
    if (urls.length === 0) return toast.error("Sem mídias para baixar");

    toast.info(`Iniciando download de ${urls.length} arquivos...`);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
        link.download = `referencia-${order?.tracking_code || "pedido"}-${i + 1}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Erro ao baixar arquivo:", err);
      }
    }
  };

  const handleSendToDriver = async () => {
    const phone = selectedDriver ? selectedDriver.whatsapp_phone : customPhone;
    if (!phone) {
      toast.error("Informe um número de WhatsApp");
      return;
    }

    try {
      // 0. Calcular expiração
      const expirationHours = establishment?.ref_link_expiration_hours || 24;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      // 1. Tentar encontrar um link existente para este pedido
      const { data: existingLink } = await supabase
        .from("order_reference_share_links")
        .select("private_token")
        .eq("order_id", orderId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      let privateToken = existingLink?.private_token;

      if (!privateToken) {
        // Criar novo link se não existir um válido
        const { data: shareLink, error: shareError } = await supabase
          .from("order_reference_share_links")
          .insert([{
            order_id: orderId,
            establishment_id: order!.establishment_id,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            selected_media_json: selectedMedias,
            recipient_driver_id: selectedDriver?.id || null,
            recipient_phone: phone,
            expires_at: expiresAt.toISOString()
          }])
          .select()
          .single();

        if (shareError) throw shareError;
        privateToken = shareLink.private_token;
      }


      const baseUrl = window.location.origin;
      const privateUrl = `${baseUrl}/referencias-entrega/${privateToken}`;

      // 2. Registrar Log de compartilhamento específico para motoboys
      await supabase.from("order_reference_share_logs").insert([{
        order_id: orderId,
        establishment_id: order?.establishment_id,
        driver_id: selectedDriver?.id || null,
        driver_name: selectedDriver?.name || "Manual",
        driver_phone: phone,
        selected_media_json: selectedMedias,
        private_url: privateUrl,
        sent_via: "whatsapp"
      }]);

      // 3. Atualizar pedido com motoboy (se selecionado)
      if (selectedDriver) {
        await supabase.from("orders").update({
          assigned_driver_id: selectedDriver.id,
          assigned_driver_name: selectedDriver.name,
          assigned_driver_phone: selectedDriver.whatsapp_phone,
          driver_reference_sent_at: new Date().toISOString()
        }).eq("id", orderId);
      }

      // 4. Gerar mensagem e abrir WhatsApp
      const driverName = selectedDriver ? selectedDriver.name : "Entregador";
      let msg = `Olá, *${driverName}*. Seguem as referências visuais para entrega do pedido *#${order?.tracking_code || "N/A"}*.\n\n`;
      msg += `👤 *Cliente:* ${order?.customer_name || "N/A"}\n`;
      msg += `📍 *Endereço:* ${address?.street || ""}, ${address?.number || ""}\n`;
      if (address?.neighborhood) msg += `🏘️ *Bairro:* ${address.neighborhood}\n`;
      if (address?.reference) msg += `🚩 *Ponto de Referência:* ${address.reference}\n`;
      
      if (ref.instructions) {
        msg += `\n📝 *Instruções:* ${ref.instructions}\n`;
      }
      
      const selectedPhotos = selectedMedias.filter(url => !url.includes('.mp4') && !url.includes('.mov') && !url.includes('.webm'));
      const selectedVideos = selectedMedias.filter(url => url.includes('.mp4') || url.includes('.mov') || url.includes('.webm'));

      if (selectedPhotos.length > 0 || selectedVideos.length > 0) {
        msg += `\n📦 *Mídias Selecionadas:*`;
        if (selectedPhotos.length > 0) msg += `\n🖼️ ${selectedPhotos.length} Foto(s)`;
        if (selectedVideos.length > 0) msg += `\n🎥 ${selectedVideos.length} Vídeo(s)`;
        msg += `\n`;
      }

      msg += `\n🔗 *Acesso Seguro às Fotos/Vídeos:* \n${privateUrl}\n\n`;
      msg += `⚠️ _Use essas informações apenas para localizar o endereço desta entrega._`;

      const encodedMsg = encodeURIComponent(msg);
      window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodedMsg}`, "_blank");
      
      setIsSendDialogOpen(false);
      toast.success("Referências enviadas!");
      queryClient.invalidateQueries({ queryKey: ["order-share-logs", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-for-ref", orderId] });
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    }
  };

  const filteredDrivers = drivers?.filter(d => 
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.whatsapp_phone.includes(driverSearch)
  );

  const canSendRef = canUseFeature(ctx, "send_order_references");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant={activeTab === "visual" ? "default" : "outline"} 
          className="rounded-full"
          onClick={() => setActiveTab("visual")}
        >
          Central Visual
        </Button>
        <Button 
          size="sm" 
          variant={activeTab === "logs" ? "default" : "outline"} 
          className="rounded-full"
          onClick={() => setActiveTab("logs")}
        >
          Histórico de Envio
        </Button>
      </div>

      {activeTab === "visual" ? (
        <Card className="overflow-hidden border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 bg-primary/10 px-4 py-3">
            <CardTitle className="text-sm font-bold flex flex-wrap items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              Central de Referências - #{order?.tracking_code}
              {refSource && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Origem: {refSource}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex flex-wrap gap-2 items-center justify-end">
              {order?.assigned_driver_name && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border text-[10px] font-medium mr-2">
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                  Responsável: {order.assigned_driver_name}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-4 ml-1 text-muted-foreground hover:text-destructive"
                    onClick={() => setIsSendDialogOpen(true)}
                    title="Trocar Responsável"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
              
              <Button size="sm" variant="outline" className="h-8 text-xs bg-white" onClick={downloadAll}>
                <Download className="size-3.5 mr-1" /> Baixar
              </Button>
              <Button 
                size="sm" 
                className="h-8 text-xs" 
                onClick={() => canSendRef ? setIsSendDialogOpen(true) : toast.info(`Envio via WhatsApp disponível no plano ${planLabelForFeature("send_order_references")}`)}
              >
                {canSendRef ? <Smartphone className="size-3.5 mr-1" /> : <Lock className="size-3.5 mr-1" />} 
                {order?.assigned_driver_id ? "Reenviar p/ Motoboy" : "Enviar p/ Motoboy"}
              </Button>
            </div>
          </CardHeader>
        <CardContent className="p-4 space-y-6">
          {/* Dados do Endereço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-muted-foreground uppercase tracking-wider">Endereço de Entrega</p>
              <p className="font-medium">{address?.street}, {address?.number}</p>
              <p className="text-muted-foreground">{address?.neighborhood}, {address?.city}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-muted-foreground uppercase tracking-wider">Ponto de Referência</p>
              <p className="font-medium">{address?.reference || "Não informado"}</p>
            </div>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button size="sm" variant="ghost" className="h-8 text-xs bg-white border" onClick={selectAll}>Selecionar todas</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs bg-white border" onClick={clearSelection}>Limpar seleção</Button>
          </div>

          {/* Galeria de Fotos */}
          {hasMedia && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="size-3.5" /> Fotos da Residência
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ref.media_urls.map((url, i) => (
                  <div key={i} className="group relative aspect-square">
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox 
                        checked={selectedMedias.includes(url)} 
                        onCheckedChange={() => toggleMedia(url)} 
                        className="bg-white"
                      />
                    </div>
                    <div className="size-full overflow-hidden rounded-xl bg-muted border border-border/50">
                      <img src={url} alt={`Referência ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <Button size="icon" variant="ghost" className="text-white size-8" onClick={() => window.open(url, "_blank")}>
                        <ExternalLink className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-white size-8" onClick={() => copyLink(url)}>
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vídeo */}
          {hasVideo && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Video className="size-3.5" /> Vídeo da Fachada
              </h4>
              <div className="relative rounded-xl overflow-hidden bg-black border border-border shadow-sm max-w-sm group">
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox 
                    checked={selectedMedias.includes(ref.video_url!)} 
                    onCheckedChange={() => toggleMedia(ref.video_url!)} 
                    className="bg-white"
                  />
                </div>
                <video src={ref.video_url!} controls className="w-full aspect-video" />
              </div>
            </div>
          )}

          {/* Instruções */}
          {hasInstructions && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5" /> Orientações
              </h4>
              <div className="rounded-xl bg-white p-4 text-sm border italic leading-relaxed">
                "{ref.instructions}"
              </div>
            </div>
          )}

          {/* Pins */}
          {hasPins && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Pontos de Referência
              </h4>
              <div className="grid gap-2">
                {[ref.pin_1_description, ref.pin_2_description, ref.pin_3_description].map((pin, i) => pin && (
                  <div key={i} className="flex items-center gap-3 text-sm rounded-lg bg-white p-3 border">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="text-foreground/80">{pin}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader className="px-4 py-3 bg-muted/30 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="size-4" /> Histórico de Envios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!canUseHistory ? (
              <div className="p-12 text-center space-y-4">
                <div className="size-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                  <Lock className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm">Histórico de Envios Bloqueado</h3>
                  <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                    Faça upgrade para o plano <strong>{planLabelForFeature("send_order_references")}</strong> para acompanhar quem recebeu as referências.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.href = `/minha-loja/${order?.establishment_id}/planos`}>
                  Ver Planos
                </Button>
              </div>
            ) : loadingLogs ? (
              <div className="p-8 text-center"><Loader2 className="size-5 animate-spin mx-auto text-primary" /></div>
            ) : shareLogs?.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground italic">Nenhum log de envio encontrado.</div>
            ) : (
              <div className="divide-y">
                {shareLogs?.map((log: any) => (
                  <div key={log.id} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {new Date(log.created_at).toLocaleString()}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          {log.driver_name || "Enviado manual"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="size-7" 
                          title="Reenviar"
                          onClick={() => {
                            setSelectedDriver(drivers?.find(d => d.id === log.driver_id) || null);
                            if (!log.driver_id) setCustomPhone(log.driver_phone || "");
                            setSelectedMedias(Array.isArray(log.selected_media_json) ? log.selected_media_json : []);
                            setIsSendDialogOpen(true);
                          }}
                        >
                          <Smartphone className="size-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="size-7" 
                          title="Copiar Link"
                          onClick={() => copyLink(log.private_url)}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="size-3" /> {log.sent_via === 'whatsapp' ? 'WhatsApp' : log.sent_via}
                      </span>
                      <span className="flex items-center gap-1">
                        <Smartphone className="size-3" /> {log.driver_phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <ImageIcon className="size-3" /> {Array.isArray(log.selected_media_json) ? log.selected_media_json.length : 0} mídias
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Envio */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Enviar Referências</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar motoboy..." 
                className="pl-9"
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
              {filteredDrivers?.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Nenhum motoboy ativo.</div>
              ) : filteredDrivers?.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => {
                    setSelectedDriver(driver);
                    setCustomPhone("");
                  }}
                  className={`w-full text-left p-3 rounded-md text-sm transition-colors flex items-center justify-between ${
                    selectedDriver?.id === driver.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <div>
                    <div className="font-medium">{driver.name}</div>
                    <div className={`text-[10px] ${selectedDriver?.id === driver.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {driver.whatsapp_phone}
                    </div>
                  </div>
                  {selectedDriver?.id === driver.id && <CheckSquare className="size-4" />}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Ou enviar para outro número</label>
              <Input 
                placeholder="WhatsApp (ex: 24999999999)" 
                value={customPhone}
                onChange={(e) => {
                  setCustomPhone(e.target.value);
                  setSelectedDriver(null);
                }}
              />
            </div>

            {selectedMedias.length > 0 ? (
              <Badge variant="secondary" className="w-full justify-center py-1">
                {selectedMedias.length} mídias selecionadas
              </Badge>
            ) : (
              <Badge variant="outline" className="w-full justify-center py-1 text-amber-600 border-amber-200 bg-amber-50">
                Nenhuma mídia selecionada (enviará apenas link completo)
              </Badge>
            )}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleSendToDriver}>
              <MessageCircle className="size-4 mr-2" /> Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
