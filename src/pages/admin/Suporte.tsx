import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useAdminChats,
  useClaimChat,
  useCloseChat,
  useSendChatMessage,
  type SupportChat,
} from "@/hooks/useSupportChat";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { ChatPanel } from "@/components/support/ChatPanel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import AdminTickets from "./Tickets";

const QUICK_REPLIES = [
  "Olá! Vou te ajudar com isso.",
  "Você pode me enviar mais detalhes?",
  "Consegue mandar um print?",
  "Vou verificar e já te retorno.",
  "Esse caso precisa virar um ticket para análise.",
  "Esse atendimento foi resolvido.",
  "Vou encerrar este atendimento. Se precisar, chame novamente.",
];

function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return new Date(iso).toLocaleString("pt-BR");
}

function ChatCard({
  chat,
  selected,
  onSelect,
  action,
}: {
  chat: SupportChat;
  selected?: boolean;
  onSelect: () => void;
  action?: React.ReactNode;
}) {
  const kind = chat.establishment_id ? "Lojista" : "Cliente";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition ${
        selected ? "border-primary ring-1 ring-primary/30" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{chat.topic || "Suporte rápido"}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{kind}</Badge>
            <span>{fmtAgo(chat.last_message_at)}</span>
          </div>
        </div>
        {action}
      </div>
    </button>
  );
}

export default function AdminSuporte() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();

  const [tab, setTab] = useState<string>("fila");
  const [openChat, setOpenChat] = useState<string | null>(chatId ?? null);
  const [historySearch, setHistorySearch] = useState("");

  const { data: openChats = [], isLoading: loadingOpen } = useAdminChats("open");
  const { data: closedChats = [], isLoading: loadingHistory } = useAdminChats("history");
  const { data: tickets = [] } = useSupportTickets({ kind: "admin" });

  const claim = useClaimChat();
  const close = useCloseChat();
  const sendMsg = useSendChatMessage();

  const queue = useMemo(
    () => openChats.filter((c) => c.status === "waiting" && !c.claimed_by),
    [openChats]
  );
  const active = useMemo(
    () => openChats.filter((c) => c.status === "active"),
    [openChats]
  );
  const history = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return closedChats;
    return closedChats.filter((c) => (c.topic ?? "").toLowerCase().includes(q));
  }, [closedChats, historySearch]);

  const ticketsOpen = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const ticketsAnalysis = tickets.filter((t) => t.status === "in_progress" || t.status === "waiting_user");
  const ticketsResolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const ticketsReports = tickets.filter(
    (t) => t.category === "establishment_issue" || t.category === "report_followup"
  );

  const currentChat =
    openChats.find((c) => c.id === openChat) ?? closedChats.find((c) => c.id === openChat) ?? null;

  // Open via URL
  useEffect(() => {
    if (!chatId) return;
    setOpenChat(chatId);
    if (queue.some((c) => c.id === chatId)) setTab("fila");
    else if (active.some((c) => c.id === chatId)) setTab("atendimento");
    else if (closedChats.some((c) => c.id === chatId)) setTab("historico");
  }, [chatId, queue, active, closedChats]);

  async function handleClaim(chat: SupportChat) {
    try {
      await claim.mutateAsync(chat.id);
      try {
        await sendMsg.mutateAsync({
          chat_id: chat.id,
          sender_role: "system",
          message: "Um atendente iniciou o atendimento.",
        });
      } catch { /* non-blocking */ }
      toast.success("Chat atribuído");
      setTab("atendimento");
      setOpenChat(chat.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao atender";
      toast.error(msg);
    }
  }

  async function handleClose(chat: SupportChat) {
    try {
      await close.mutateAsync(chat.id);
      toast.success("Atendimento encerrado");
      setOpenChat(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao encerrar";
      toast.error(msg);
    }
  }

  async function handleWaitingUser(chat: SupportChat) {
    try {
      await sendMsg.mutateAsync({
        chat_id: chat.id,
        sender_role: "system",
        message: "Aguardando retorno do usuário.",
      });
      toast.success("Marcado como aguardando usuário");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha";
      toast.error(msg);
    }
  }

  async function sendQuickReply(chat: SupportChat, text: string) {
    try {
      await sendMsg.mutateAsync({ chat_id: chat.id, sender_role: "admin", message: text });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha";
      toast.error(msg);
    }
  }

  function counterBadge(n: number) {
    if (!n) return null;
    return (
      <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
        {n}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Suporte"
        description="Atendimentos em tempo real, tickets e denúncias da plataforma."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="fila">Fila{counterBadge(queue.length)}</TabsTrigger>
          <TabsTrigger value="atendimento">Em atendimento{counterBadge(active.length)}</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="tickets-abertos">Tickets abertos{counterBadge(ticketsOpen.length)}</TabsTrigger>
          <TabsTrigger value="tickets-analise">Em análise{counterBadge(ticketsAnalysis.length)}</TabsTrigger>
          <TabsTrigger value="tickets-resolvidos">Resolvidos{counterBadge(ticketsResolved.length)}</TabsTrigger>
          <TabsTrigger value="denuncias">Denúncias{counterBadge(ticketsReports.length)}</TabsTrigger>
        </TabsList>

        <TabsContent value="fila" className="space-y-2">
          {loadingOpen && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!loadingOpen && queue.length === 0 && (
            <div className="text-sm text-muted-foreground border rounded-lg bg-card p-6 text-center">
              Nenhum chat aguardando.
            </div>
          )}
          {queue.map((c) => (
            <ChatCard
              key={c.id}
              chat={c}
              selected={openChat === c.id}
              onSelect={() => setOpenChat(c.id)}
              action={
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClaim(c);
                  }}
                >
                  Atender
                </Button>
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="atendimento" className="space-y-2">
          {active.length === 0 && (
            <div className="text-sm text-muted-foreground border rounded-lg bg-card p-6 text-center">
              Sem chats em atendimento.
            </div>
          )}
          {active.map((c) => {
            const mine = c.claimed_by === user?.id;
            return (
              <ChatCard
                key={c.id}
                chat={c}
                selected={openChat === c.id}
                onSelect={() => setOpenChat(c.id)}
                action={
                  <Badge variant={mine ? "default" : "outline"} className="text-[10px]">
                    {mine ? "Você" : "Outro atendente"}
                  </Badge>
                }
              />
            );
          })}
        </TabsContent>

        <TabsContent value="historico" className="space-y-3">
          <Input
            placeholder="Buscar por assunto..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            className="max-w-sm"
          />
          {loadingHistory && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!loadingHistory && history.length === 0 && (
            <div className="text-sm text-muted-foreground border rounded-lg bg-card p-6 text-center">
              Nenhum atendimento encerrado.
            </div>
          )}
          {history.map((c) => (
            <ChatCard
              key={c.id}
              chat={c}
              selected={openChat === c.id}
              onSelect={() => setOpenChat(c.id)}
              action={<Badge variant="outline" className="text-[10px]">Encerrado</Badge>}
            />
          ))}
        </TabsContent>

        <TabsContent value="tickets-abertos">
          <AdminTickets embedded forceStatus={["open", "in_progress"]} />
        </TabsContent>
        <TabsContent value="tickets-analise">
          <AdminTickets embedded forceStatus={["in_progress", "waiting_user"]} />
        </TabsContent>
        <TabsContent value="tickets-resolvidos">
          <AdminTickets embedded forceStatus={["resolved", "closed"]} />
        </TabsContent>
        <TabsContent value="denuncias" className="space-y-3">
          <div className="flex items-center justify-between gap-2 border rounded-lg bg-amber-50 border-amber-200 px-3 py-2 text-xs text-amber-900">
            <span>
              Denúncias visuais legadas estão em{" "}
              <Link to="/admin/denuncias" className="underline font-medium">/admin/denuncias</Link>.
            </span>
          </div>
          <AdminTickets
            embedded
            forceCategory={["establishment_issue", "report_followup"]}
          />
        </TabsContent>
      </Tabs>

      <Sheet
        open={!!currentChat}
        onOpenChange={(o) => {
          if (!o) {
            setOpenChat(null);
            if (chatId) navigate("/admin/suporte", { replace: true });
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base">
              {currentChat?.topic || "Suporte rápido"}
            </SheetTitle>
          </SheetHeader>
          {currentChat && (
            <div className="flex-1 min-h-0 flex flex-col">
              {currentChat.status === "active" && (
                <div className="border-b bg-muted/40 p-2 flex flex-wrap gap-1">
                  {QUICK_REPLIES.map((q) => (
                    <Button
                      key={q}
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => sendQuickReply(currentChat, q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex-1 min-h-0">
                <ChatPanel
                  chat={currentChat}
                  senderRole="admin"
                  headerExtra={
                    <div className="flex gap-2">
                      {currentChat.status === "waiting" && (
                        <Button size="sm" onClick={() => handleClaim(currentChat)}>
                          Atender
                        </Button>
                      )}
                      {currentChat.status === "active" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWaitingUser(currentChat)}
                          >
                            Aguardar usuário
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClose(currentChat)}
                          >
                            Encerrar
                          </Button>
                        </>
                      )}
                    </div>
                  }
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}