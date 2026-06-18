import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Trash2, Plus, Minus, Truck, ShoppingBag, Utensils, AlertCircle, MapPin, Pencil, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { getEstablishment } from "@/data/mockData";
import { cart, useCart } from "@/store/cart";
import { brl } from "@/lib/format";
import { buildWhatsappMessage, whatsappLink, type OrderType, type CheckoutData, type V2DeliveryMessageInfo } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trackEvent } from "@/lib/track";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useAddresses, useAddressMutations, type Address } from "@/hooks/useAddresses";
import { useHouseReference } from "@/hooks/useHouseReference";
import { useDeliveryRegions, useDeliverySettings, type DeliveryRegion } from "@/hooks/useDeliverySettings";
import { resolveDeliveryFeeWithDistance, matchRegionByName } from "@/lib/deliveryFee";
import { INITIAL_ORDER_STATUS, whatsappSentTimestamps } from "@/lib/orderStatus";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { consumeReorderPrefill } from "@/lib/reorder";

const CheckoutPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cartState = useCart();
  const [type, setType] = useState<OrderType>("entrega");
  const [data, setData] = useState<CheckoutData>({ type: "entrega", name: "" });
  const [sending, setSending] = useState(false);

  const { data: est, isLoading: loadingEstab } = useQuery({
    queryKey: ["establishment", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase.from("establishments").select("*").eq("slug", slug!).maybeSingle();
      return data;
    },
  });

  const eMock = getEstablishment(slug || "");
  const e = est ? {
    ...eMock,
    id: est.id,
    slug: est.slug,
    name: est.name,
    whatsapp: est.whatsapp,
    services: est.services || [],
    deliveryFee: est.delivery_fee,
    neighborhood: est.neighborhood,
    menuType: est.menu_type,
    logo: est.logo || eMock?.logo,
    brandColor: est.brand_color || eMock?.brandColor,
    payments: est.payments || eMock?.payments || []
  } as any : eMock;

  const establishmentId = est?.id;

  const { data: settings } = useDeliverySettings(establishmentId);
  const { data: regions } = useDeliveryRegions(establishmentId, false);
  const v2 = !!settings?.delivery_v2_enabled;

  const { data: addresses } = useAddresses();
  const { save: saveAddress } = useAddressMutations();
  const { data: profile } = useProfile();
  const [selectedAddressId, setSelectedAddressId] = useState<string | "">("");
  const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [editContact, setEditContact] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [prefill] = useState(() => consumeReorderPrefill());
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Apply reorder prefill once — runs after addresses load so address_id can be honored.
  useEffect(() => {
    if (!prefill || prefillApplied) return;
    if (addresses === undefined) return;
    if (prefill.address_id && addresses?.some((a) => a.id === prefill.address_id)) {
      setSelectedAddressId(prefill.address_id);
    }
    setData((d) => ({
      ...d,
      payment: prefill.payment ?? d.payment,
      note: prefill.note ?? d.note,
    }));
    if (prefill.change_for) setChangeFor(String(prefill.change_for));
    setPrefillApplied(true);
    toast.success("Pedido pré-preenchido. Revise antes de confirmar.");
  }, [prefill, prefillApplied, addresses]);

  const { data: addressSpecificRef, isLoading: isLoadingAddrRef } = useHouseReference(selectedAddressId || undefined);
  const { data: globalRef, isLoading: isLoadingGlobalRef } = useHouseReference(undefined);

  const houseRef = addressSpecificRef || globalRef;
  const houseRefSource = addressSpecificRef ? "specific" : (globalRef ? "global" : null);
  const isLoadingHouseRef = isLoadingAddrRef || isLoadingGlobalRef;

  useEffect(() => {
    if (!addresses?.length || selectedAddressId) return;
    const def = addresses.find((a) => a.is_default) ?? addresses[0];
    setSelectedAddressId(def.id);
    setData((d) => ({
      ...d,
      name: def.customer_name || profile?.display_name || d.name,
      phone: def.customer_phone || profile?.phone || d.phone,
      neighborhood: def.neighborhood ?? "",
      street: def.street,
      number: def.number ?? "",
      complement: def.complement ?? "",
      reference: def.reference ?? "",
      zip: def.zip ?? "",
      popular_location_name: def.popular_location_name || "",
      delivery_instructions: def.delivery_instructions || "",
    }));
  }, [addresses, selectedAddressId, profile]);

  // Prefill name/phone from profile even without saved address (pickup/dine-in or guest first-time)
  useEffect(() => {
    if (!profile) return;
    setData((d) => ({
      ...d,
      name: d.name || profile.display_name || "",
      phone: d.phone || profile.phone || "",
    }));
  }, [profile]);

  const subtotal = cart.subtotal();

  // Auto-match region by neighborhood / popular location whenever the relevant inputs change
  useEffect(() => {
    if (type !== "entrega") return;
    const m = matchRegionByName(regions, data.neighborhood, data.popular_location_name);
    if (m && m.id !== selectedRegion) setSelectedRegion(m.id);
  }, [type, regions, data.neighborhood, data.popular_location_name, selectedAddressId]);

  const deliveryInfo = useMemo(() => {
    if (type !== "entrega") return null;
    const addr = addresses?.find((a) => a.id === selectedAddressId);
    return resolveDeliveryFeeWithDistance({
      settings,
      regions,
      fixedFee: e?.deliveryFee != null ? Number(e.deliveryFee) : null,
      subtotal,
      manualRegionId: selectedRegion || null,
      neighborhood: data.neighborhood,
      popularLocationName: data.popular_location_name,
      origin: { latitude: (est as any)?.latitude, longitude: (est as any)?.longitude },
      destination: { latitude: (addr as any)?.latitude, longitude: (addr as any)?.longitude },
    });
  }, [type, settings, regions, e?.deliveryFee, subtotal, selectedRegion, data.neighborhood, data.popular_location_name, addresses, selectedAddressId, est]);

  if (loadingEstab) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!e) return <div className="container py-20 text-center font-display text-xl">Estabelecimento não encontrado.</div>;

  const taxa = type === "entrega" ? (deliveryInfo?.fee ?? null) : 0;
  const total = subtotal + (taxa ?? 0);

  const update = (patch: Partial<CheckoutData>) => setData((d) => ({ ...d, ...patch }));
  const goBackToMenu = () => navigate(`/loja/${e.slug}`, { replace: true });

  const onSend = async () => {
    if (!data.name?.trim()) { toast.error("Informe seu nome"); return; }
    if (type !== "local" && !data.phone?.trim()) { toast.error("Informe seu telefone"); return; }
    if (type !== "local" && !data.payment) { toast.error("Selecione a forma de pagamento"); return; }
    if (type === "entrega") {
      if (deliveryInfo?.blocked) { toast.error(deliveryInfo.notice || "Não é possível entregar neste momento."); return; }
      if (!data.street || !data.number || !data.neighborhood) {
        toast.error("Preencha o endereço de entrega"); return;
      }
    }
    setSending(true);

    let trackingCode: string | undefined;
    let visualRefLink: string | undefined;
    let insertedOrder: any = null;

    try {
      if (establishmentId) {
        // Create order
        const orderData = {
          user_id: user?.id ?? null,
          establishment_id: establishmentId,
          address_id: selectedAddressId || null,
          customer_name: data.name,
          customer_phone: data.phone ?? null,
          subtotal,
          delivery_fee: taxa ?? 0,
          total,
          payment_method: data.payment ?? null,
          payment_method_intent: data.payment ?? null,
          notes: data.note ?? null,
          items: cartState.items.map((i) => ({
            product_id: i.product.id,
            product_name_snapshot: i.product.name,
            unit_price_snapshot: i.unitPrice,
            selected_options_snapshot_json: {
              options: i.options,
              removed: i.removed,
            },
            quantity: i.quantity,
            item_note: i.note,
            total_price: i.unitPrice * i.quantity,
          })) as never,
          status: INITIAL_ORDER_STATUS as any,
          ...whatsappSentTimestamps(),
          whatsapp_message: "", // Filled later
          delivery_fee_estimated: type === "entrega" ? (deliveryInfo?.fee ?? 0) : 0,
          total_estimated: total
        };

        const { data: inserted, error: orderError } = await supabase.from("orders").insert(orderData).select("id,tracking_code").maybeSingle();

        if (orderError) throw orderError;
        insertedOrder = inserted;
        trackingCode = inserted?.tracking_code ?? undefined;

        if (inserted?.id) {
          // Notify owner
          const { data: estabData } = await supabase.from("establishments").select("owner_id").eq("id", establishmentId).single();
          if (estabData?.owner_id) {
            await supabase.from("notifications").insert({
              user_id: estabData.owner_id,
              type: "new_order",
              title: "Novo pedido recebido!",
              message: `Você recebeu um novo pedido de ${data.name}.`,
              related_order_id: inserted.id,
              establishment_id: establishmentId,
              data: { order_id: inserted.id, establishment_id: establishmentId } as any,
            });
          }
        }

        if (inserted?.id && type === "entrega") {
          if (houseRef) {
            const { data: refLink } = await supabase.from("order_visual_reference_links").insert({
              order_id: inserted.id,
              user_id: user?.id ?? null,
              address_id: selectedAddressId || null,
              visual_reference_id: houseRef.id,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }).select("private_token").maybeSingle();
            
            if (refLink?.private_token) {
              visualRefLink = `${window.location.origin}/referencia/${refLink.private_token}`;
            }
          }

          if (deliveryInfo) {
            await supabase.from("checkout_delivery_info").insert({
              order_id: inserted.id,
              user_id: user?.id ?? null,
              establishment_id: establishmentId,
              address_id: selectedAddressId || null,
              selected_region_id: deliveryInfo.region?.id ?? null,
              selected_region_name: deliveryInfo.region?.name || "Não listada",
              delivery_fee_estimated: deliveryInfo.fee,
              delivery_fee_status: deliveryInfo.status,
              delivery_confidence_level: deliveryInfo.manual ? "medium" : "high",
              requires_manual_confirmation: deliveryInfo.manual,
              visual_reference_link: visualRefLink || null,
              address_snapshot_json: { ...data, selected_address_id: selectedAddressId } as any
            } as never);
          }
        }
      }
    } catch (err) {
      console.error("Order creation error:", err);
      toast.error("Erro ao registrar pedido. Tente novamente.");
      setSending(false);
      return;
    }

    const payload: CheckoutData = { ...data, type };
    const v2Msg: V2DeliveryMessageInfo | undefined = type === "entrega" ? {
      regionName: deliveryInfo?.region?.name || (deliveryInfo?.autoMatched ? data.neighborhood : "Não listada"),
      fee: deliveryInfo?.fee ?? null,
      feeToConfirm: !!deliveryInfo?.manual || deliveryInfo?.status === "to_confirm",
      deliveryInstructions: data.delivery_instructions || houseRef?.instructions || null,
      visualReferenceLink: visualRefLink || null,
      popularLocationName: data.popular_location_name || null,
      pontoReferencia: data.reference || null,
      visualReferenceData: houseRef ? {
        mediaCount: Array.isArray(houseRef.media_urls) ? houseRef.media_urls.length : 0,
        hasVideo: !!houseRef.video_url,
        hasInstructions: !!houseRef.instructions,
        hasPins: !!(houseRef.pin_1_description || houseRef.pin_2_description || houseRef.pin_3_description)
      } : null
    } : undefined;

    const msg = buildWhatsappMessage(e, cartState.items, payload, trackingCode, v2Msg);
    
    if (insertedOrder?.id) {
      await supabase.from("orders").update({ whatsapp_message: msg }).eq("id", insertedOrder.id);
    }

    window.open(whatsappLink(e.whatsapp, msg), "_blank");
    toast.success("Pedido enviado! Acompanhe o status aqui.");
    cart.clear();
    if (trackingCode) navigate(`/pedido/${trackingCode}`, { replace: true });
    else navigate(`/loja/${e.slug}`, { replace: true });
  };

  if (cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-cream">
        <div className="container py-20 text-center">
          <ShoppingBag className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl">Seu carrinho está vazio</h2>
          <Link to={`/loja/${e.slug}`} replace className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-primary-foreground">Voltar ao cardápio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-cream pb-32">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-14 items-center gap-3">
          <button onClick={goBackToMenu} className="grid size-9 place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-5" /></button>
          <div className="truncate font-display text-base font-semibold">{e.name}</div>
        </div>
      </header>

      <div className="container space-y-6 py-6">
        <section className="rounded-3xl bg-card p-4 shadow-card">
          <h2 className="mb-3 font-display text-lg font-semibold">Seu pedido</h2>
          <div className="divide-y divide-border">
            {cartState.items.map((i) => (
              <div key={i.uid} className="flex gap-3 py-3">
                <img src={i.product.image} alt="" className="size-16 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{i.product.name}</div>
                  <div className="text-xs text-muted-foreground">Qtd: {i.quantity} · {brl(i.unitPrice * i.quantity)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card p-4 shadow-card">
          <h2 className="mb-3 font-display text-lg font-semibold">Como deseja receber?</h2>
          <div className="grid grid-cols-3 gap-2">
            {[ { k: "entrega", l: "Entrega", icon: Truck }, { k: "retirada", l: "Retirada", icon: ShoppingBag }, { k: "local", l: "Local", icon: Utensils } ].map(({ k, l, icon: Icon }) => (
              <button key={k} onClick={() => setType(k as any)} disabled={!e.services.includes(k)} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs transition-all", type === k ? "border-primary bg-primary/5 text-primary" : "border-border")}>
                <Icon className="size-5" /> {l}
              </button>
            ))}
          </div>
        </section>

        {v2 && type === "entrega" && (
           <section className="rounded-3xl bg-card p-4 shadow-card space-y-4">
              <h2 className="font-display text-lg font-semibold">Endereço de entrega</h2>
              <div className="grid gap-2">
                {addresses?.map(a => (
                  <button key={a.id} onClick={() => {
                    setSelectedAddressId(a.id);
                    setData(d => ({
                      ...d,
                      street: a.street,
                      number: a.number ?? "",
                      neighborhood: a.neighborhood ?? "",
                      city: a.city ?? "",
                      complement: a.complement ?? "",
                      reference: a.reference ?? "",
                      zip: a.zip ?? "",
                      popular_location_name: a.popular_location_name || "",
                      delivery_instructions: a.delivery_instructions || "",
                      name: a.customer_name || profile?.display_name || d.name,
                      phone: a.customer_phone || profile?.phone || d.phone,
                    }));
                    const m = matchRegionByName(regions, a.neighborhood, a.popular_location_name);
                    setSelectedRegion(m?.id ?? "");
                  }} className={cn("text-left p-3 border rounded-2xl", selectedAddressId === a.id ? "border-primary bg-primary/5" : "border-border")}>
                    <div className="font-bold text-sm">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.street}, {a.number} · {a.neighborhood}</div>
                  </button>
                ))}
                <Button size="sm" variant="outline" onClick={() => setEditingAddress({ label: "Casa" })}><Plus className="mr-1 size-4" /> Novo endereço</Button>
              </div>
              <h2 className="font-display text-lg font-semibold mt-4">Região de entrega</h2>
              <div className="grid gap-2">
                {regions?.map(r => (
                  <button key={r.id} onClick={() => setSelectedRegion(r.id)} className={cn("text-left p-3 border rounded-2xl flex justify-between", selectedRegion === r.id ? "border-primary bg-primary/5" : "border-border")}>
                    <span className="text-sm">{r.name}</span>
                    <span className="text-sm font-bold">{brl(Number(r.fee))}</span>
                  </button>
                ))}
              </div>
           </section>
        )}

        {(() => {
          const hasContact = !!(data.name?.trim() && data.phone?.trim());
          const addrSelected = type === "entrega" && !!selectedAddressId;
          const contactPrefilled = !!user && hasContact && (addrSelected || type !== "entrega") && !editContact;
          const addressPrefilled = addrSelected && !editContact;
          const basePayments: string[] = (e.payments && e.payments.length > 0)
            ? e.payments
            : ["Pix", "Dinheiro"];
          // Ensure card options are always available so customers can flag
          // when the motoboy needs to bring the card machine, and so the
          // establishment can track payment methods financially.
          const paymentOptions: string[] = Array.from(new Set([
            ...basePayments,
            "Cartão de crédito",
            "Cartão de débito",
          ]));
          return (
            <section className="rounded-3xl bg-card p-4 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Seus dados</h2>
                {(contactPrefilled || addressPrefilled) && (
                  <button type="button" onClick={() => setEditContact(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Pencil className="size-3" /> Editar
                  </button>
                )}
              </div>

              {contactPrefilled ? (
                <div className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm">
                  <div className="font-medium">{data.name}</div>
                  <div className="text-xs text-muted-foreground">{data.phone}</div>
                </div>
              ) : (
                <>
                  <Field label="Nome" value={data.name} onChange={(v: string) => update({ name: v })} />
                  <Field label="WhatsApp" value={data.phone || ""} onChange={(v: string) => update({ phone: v })} />
                </>
              )}

              {type === "entrega" && (
                addressPrefilled ? (
                  <div className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm">
                    <div className="text-xs font-bold uppercase text-muted-foreground">Endereço</div>
                    <div>{data.street}, {data.number}</div>
                    <div className="text-xs text-muted-foreground">{data.neighborhood}{data.city ? ` · ${data.city}` : ""}</div>
                  </div>
                ) : (
                  <>
                    <Field label="Rua" value={data.street || ""} onChange={(v: string) => update({ street: v })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Número" value={data.number || ""} onChange={(v: string) => update({ number: v })} />
                      <Field label="Bairro" value={data.neighborhood || ""} onChange={(v: string) => update({ neighborhood: v })} />
                    </div>
                  </>
                )
              )}

              {type !== "local" && (
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase text-muted-foreground">Forma de pagamento</label>
                  <RadioGroup
                    value={data.payment || ""}
                    onValueChange={(v) => update({ payment: v })}
                    className="grid grid-cols-2 gap-2"
                  >
                    {paymentOptions.map((p) => (
                      <Label key={p} htmlFor={`pay-${p}`} className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-2xl border p-3 text-sm transition-all",
                        data.payment === p ? "border-primary bg-primary/5 text-primary" : "border-border"
                      )}>
                        <RadioGroupItem id={`pay-${p}`} value={p} />
                        <span className="font-medium">{p}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                  {data.payment?.toLowerCase() === "dinheiro" && (
                    <div className="mt-2">
                      <Field
                        label="Troco para (opcional)"
                        placeholder="Ex.: R$ 50,00"
                        value={changeFor}
                        onChange={(v: string) => {
                          setChangeFor(v);
                          update({ note: v ? `Troco para ${v}` : "" });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        <section className="rounded-3xl bg-card p-4 shadow-card">
          <Row label="Subtotal" value={brl(subtotal)} />
          <Row label="Taxa" value={taxa ? brl(taxa) : "a confirmar"} />
          <div className="my-2 border-t border-border" />
          <Row label="Total estimado" value={brl(total)} strong />
          {type === "entrega" && (
            <div className="mt-2 text-[11px] font-medium text-amber-700">
              Valor final sujeito à confirmação do estabelecimento.
            </div>
          )}
          {type === "entrega" && deliveryInfo?.notice && (
            <div className={cn(
              "mt-3 rounded-xl px-3 py-2 text-xs flex items-start gap-2",
              deliveryInfo.blocked ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}>
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <span>{deliveryInfo.notice}</span>
            </div>
          )}
          {type === "entrega" && deliveryInfo?.region && deliveryInfo.autoMatched && !deliveryInfo.blocked && (
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3" /> Região detectada: <strong className="text-foreground">{deliveryInfo.region.name}</strong>
            </div>
          )}
          {type === "entrega" && deliveryInfo?.manual && deliveryInfo.fee != null && !deliveryInfo.blocked && (
            <div className="mt-2 text-[11px] text-amber-700">
              Valor estimado — o estabelecimento confirmará pelo WhatsApp.
            </div>
          )}
        </section>

        {type === "entrega" && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
            <div className="font-semibold mb-1">Atenção sobre a taxa de entrega</div>
            A taxa de entrega exibida é uma estimativa inicial. O estabelecimento poderá revisar o valor
            conforme o endereço, acesso ao local, distância real, estrada ruim, chuva, tempestade ou
            outras adversidades. Caso haja reajuste, você receberá uma proposta com o valor final e o
            pedido só seguirá após sua confirmação.
          </section>
        )}

        {type === "entrega" && (
          <section className="rounded-3xl bg-card p-4 shadow-card">
            <h2 className="mb-2 font-display text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" /> Referências da entrega
            </h2>
            {isLoadingHouseRef ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Carregando suas referências…
              </div>
            ) : houseRef ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {houseRefSource === "specific"
                    ? "Referência específica deste endereço será enviada."
                    : "Sua referência global será enviada."}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(houseRef.media_urls) && houseRef.media_urls.length > 0 && (
                    <Badge variant="secondary" className="gap-1"><ImageIcon className="size-3" /> {houseRef.media_urls.length} foto(s)</Badge>
                  )}
                  {houseRef.video_url && (
                    <Badge variant="secondary" className="gap-1"><Video className="size-3" /> Vídeo</Badge>
                  )}
                  {houseRef.instructions && (
                    <Badge variant="secondary">Instruções</Badge>
                  )}
                  {(houseRef.pin_1_description || houseRef.pin_2_description || houseRef.pin_3_description) && (
                    <Badge variant="secondary">Pins</Badge>
                  )}
                </div>
                <Link to="/minha-conta" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Pencil className="size-3" /> Editar referências
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Nenhuma referência cadastrada. Você pode adicionar fotos da fachada e instruções para facilitar futuras entregas.
                </p>
                <Link to="/minha-conta" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus className="size-3" /> Adicionar referência
                </Link>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur shadow-glow">
        <button
          onClick={onSend}
          disabled={sending || (type === "entrega" && isLoadingHouseRef)}
          title={type === "entrega" && isLoadingHouseRef ? "Carregando referências…" : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <MessageCircle className="size-5" />}
          {sending
            ? "Enviando…"
            : type === "entrega" && isLoadingHouseRef
            ? "Carregando referências…"
            : "Enviar pedido para confirmação no WhatsApp"}
        </button>
      </div>

      <Dialog open={!!editingAddress} onOpenChange={() => setEditingAddress(null)}>
        <DialogContent>
           <h2 className="font-bold">Novo Endereço</h2>
           <div className="space-y-2">
              <Field label="Rua" value={editingAddress?.street || ""} onChange={v => setEditingAddress({ ...editingAddress, street: v })} />
              <Field label="Bairro" value={editingAddress?.neighborhood || ""} onChange={v => setEditingAddress({ ...editingAddress, neighborhood: v })} />
           </div>
           <Button onClick={async () => { await saveAddress(editingAddress as any); setEditingAddress(null); }}>Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Field({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold text-muted-foreground uppercase">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function Row({ label, value, strong }: any) {
  return (
    <div className={cn("flex items-center justify-between py-1 text-sm", strong && "font-bold text-lg")}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default CheckoutPage;
