import { useEffect, useMemo, useState } from "react";
import { MessageCircle, X, Loader2, Store, Headphones, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChatPanel } from "@/components/support/ChatPanel";
import { OrderChat } from "@/components/OrderChat";
import { useAuth } from "@/hooks/useAuth";
import { useMyOpenChat, useOpenChat, useCloseChat } from "@/hooks/useSupportChat";
import { useMyChatOrders, type ChatOrderRow } from "@/hooks/useMyChatOrders";
import { useGuestChatOrders, useGuestOrderMessages } from "@/hooks/useGuestChatOrders";
import { markGuestSeen } from "@/lib/guestSeenMessages";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function OrderListItem({
  o, onOpen,
}: { o: ChatOrderRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-lg border border-border/70 bg-card p-3 hover:bg-muted/40 transition-colors flex items-start gap-3"
      data-testid="floating-chat-order-item"
    >
      <div className="size-9 shrink-0 rounded-full bg-primary/10 grid place-items-center text-primary">
        <Store className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{o.establishment_name ?? "Estabelecimento"}</div>
          {o.unread_from_business > 0 && (
            <Badge className="bg-primary text-primary-foreground h-5 px-1.5 text-[10px]">
              {o.unread_from_business}
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {o.tracking_code ? <span className="font-mono uppercase">{o.tracking_code}</span> : null}
          {o.last_message_at && <> · {timeAgo(o.last_message_at)}</>}
        </div>
      </div>
    </button>
  );
}

function GuestOrderChatView({ trackingCode }: { trackingCode: string }) {
  const { data: messages, isLoading } = useGuestOrderMessages(trackingCode, true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc(
        "send_order_message_by_tracking" as never,
        { _code: trackingCode, _message: msg } as never,
      );
      if (error) throw error;
      setText("");
      qc.invalidateQueries({ queryKey: ["guest-order-messages", trackingCode] });
      qc.invalidateQueries({ queryKey: ["guest-chat-orders"] });
    } catch (e) {
      toast.error((e as Error)?.message || "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <div className="flex-1 grid place-items-center"><Loader2 className="size-5 animate-spin" /></div>;
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {(messages ?? []).length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">
            Nenhuma mensagem ainda. As respostas do estabelecimento aparecerão aqui automaticamente.
          </p>
        ) : (
          (messages ?? []).map((m) => {
            const isBiz = m.sender_type === "business";
            const isSystem = m.sender_type === "system";
            if (isSystem) {
              return (
                <div key={m.id} className="text-center">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground uppercase">
                    {m.message}
                  </span>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${isBiz ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    isBiz
                      ? "bg-amber-100 text-amber-950 border border-amber-300 rounded-tl-none"
                      : "bg-primary text-primary-foreground rounded-tr-none"
                  }`}
                >
                  <div className="text-[10px] font-medium opacity-80 mb-0.5">{isBiz ? "Loja" : "Você"}</div>
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t bg-card px-2 py-2 safe-bottom">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma mensagem para a loja…"
            rows={1}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
            }}
            disabled={sending}
            data-testid="guest-chat-input"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={sending || !text.trim()}
            data-testid="guest-chat-send"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
          <Link to="/auth" className="text-primary underline">Entrar</Link> para receber respostas em tempo real e notificações.
        </p>
      </div>
    </div>
  );
}

export function GlobalFloatingChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"support" | "store">("store");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeTracking, setActiveTracking] = useState<string | null>(null);

  // Support
  const { data: supportChat, isLoading: supportLoading } = useMyOpenChat();
  const openChat = useOpenChat();
  const closeChat = useCloseChat();

  // Establishment chats
  const myOrders = useMyChatOrders();
  const guestOrders = useGuestChatOrders(!user);
  const orders = user ? myOrders.data ?? [] : guestOrders.data ?? [];

  const totalUnreadOrders = useMemo(
    () => orders.reduce((sum, o) => sum + (o.unread_from_business || 0), 0),
    [orders],
  );
  const totalUnread = totalUnreadOrders; // support unread not tracked here yet

  // When opening, auto-pick the first order with unread / most recent
  useEffect(() => {
    if (!open) return;
    if (orders.length && !activeOrderId) {
      const next = orders.find((o) => o.unread_from_business > 0) ?? orders[0];
      setActiveOrderId(next.id);
      setActiveTracking(next.tracking_code);
      if (!user && next.tracking_code) markGuestSeen(next.tracking_code);
    }
  }, [open, orders, activeOrderId, user]);

  // Auto-open balloon when a new establishment message arrives (subtle UX).
  const previousUnread = useState({ v: totalUnreadOrders })[0];
  useEffect(() => {
    if (totalUnreadOrders > previousUnread.v && !open) {
      // Show a toast pointing to the floating chat instead of forcing it open.
      toast.message("Nova mensagem do estabelecimento", {
        description: "Abra o chat flutuante para ver.",
      });
    }
    previousUnread.v = totalUnreadOrders;
  }, [totalUnreadOrders, open, previousUnread]);

  const startSupport = async () => {
    try { await openChat.mutateAsync({ topic: "Suporte rápido" }); }
    catch (e) { toast.error((e as Error)?.message || "Falha ao abrir chat"); }
  };

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center hover:scale-105 transition"
          aria-label="Abrir chat"
          data-testid="floating-chat-fab"
        >
          <MessageCircle className="size-6" />
          {totalUnread > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center px-1"
              data-testid="floating-chat-unread-badge"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-5 left-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-2.5rem)] rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden"
          data-testid="floating-chat-panel"
        >
          <div className="flex items-center justify-between border-b px-3 py-2 bg-card">
            <div className="font-semibold text-sm">Mensagens</div>
            <button onClick={() => setOpen(false)} aria-label="Fechar"><X className="size-4" /></button>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "support" | "store")} className="flex-1 flex flex-col min-h-0">
            <TabsList className="m-2 grid grid-cols-2">
              <TabsTrigger value="store" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
                <Store className="size-3.5" /> Estabelecimento
                {totalUnreadOrders > 0 && (
                  <span className="ml-1 rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5">
                    {totalUnreadOrders}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="support" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white gap-1.5">
                <Headphones className="size-3.5" /> Suporte
              </TabsTrigger>
            </TabsList>

            <TabsContent value="store" className="flex-1 min-h-0 flex flex-col m-0">
              {activeOrder ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center gap-2 border-b px-3 py-2 bg-primary/5">
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => { setActiveOrderId(null); setActiveTracking(null); }} aria-label="Voltar">
                      <ArrowLeft className="size-4" />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{activeOrder.establishment_name ?? "Estabelecimento"}</div>
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">{activeOrder.tracking_code}</div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 p-2">
                    {user ? (
                      <OrderChat
                        orderId={activeOrder.id}
                        senderType="customer"
                        establishmentId={activeOrder.establishment_id}
                        title="Conversa com a loja"
                      />
                    ) : (
                      activeTracking ? <GuestOrderChatView trackingCode={activeTracking} /> : null
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                  {(user ? myOrders.isLoading : guestOrders.isLoading) ? (
                    <div className="grid place-items-center p-6"><Loader2 className="size-5 animate-spin" /></div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      {user
                        ? "Você ainda não tem pedidos com conversas ativas."
                        : "Nenhum pedido visitado neste dispositivo. Abra um pedido para acompanhar as mensagens aqui."}
                    </div>
                  ) : (
                    orders.map((o) => (
                      <OrderListItem
                        key={o.id}
                        o={o}
                        onOpen={() => {
                          setActiveOrderId(o.id);
                          setActiveTracking(o.tracking_code);
                          if (!user && o.tracking_code) markGuestSeen(o.tracking_code);
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="support" className="flex-1 min-h-0 flex flex-col m-0">
              {!user ? (
                <div className="flex-1 grid place-items-center p-6 text-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Para falar com o suporte do app, entre na sua conta.
                  </p>
                  <Button asChild><Link to="/auth">Entrar</Link></Button>
                </div>
              ) : supportLoading ? (
                <div className="flex-1 grid place-items-center"><Loader2 className="size-5 animate-spin" /></div>
              ) : !supportChat ? (
                <div className="flex-1 grid place-items-center p-6 text-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Precisa de ajuda do <strong>Sabores</strong>? Inicie uma conversa com nossa equipe.
                  </p>
                  <Button onClick={startSupport} disabled={openChat.isPending} className="bg-sky-600 hover:bg-sky-700 text-white">
                    {openChat.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Iniciar chat com o suporte
                  </Button>
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="border-b px-3 py-2 bg-sky-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Headphones className="size-4" /> Suporte Sabores
                    </div>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={async () => {
                      if (!confirm("Encerrar conversa?")) return;
                      try { await closeChat.mutateAsync(supportChat.id); }
                      catch (e) { toast.error((e as Error)?.message || "Falha"); }
                    }}>Encerrar</Button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ChatPanel chat={supportChat} senderRole="customer" />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
}