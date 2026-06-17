## Resumo da auditoria (o que já existe e será reutilizado)

Tabelas:
- `support_chats` (status: `waiting | active | closed`, com `claimed_by`, `last_message_at`, `topic`, `establishment_id`, `user_id`).
- `support_chat_messages`, `support_tickets` (status: `open | in_progress | waiting_user | resolved | closed`, com `priority`, `category`, `assigned_admin_id`, `order_id`, `establishment_id`), `support_ticket_messages` (com `is_internal_note`, `attachments`), `support_ticket_attachments`.
- `reports` (denúncias legadas) — mantida intacta, página `/admin/denuncias` continua.
- `user_roles` + `is_admin()` para permissão. RLS dos três canais já aplicada.

Componentes:
- `ChatPanel`, `ChatComposer`, `AttachmentList`, `TicketDetail`, `TicketListItem`, `AdminLayout`, `AdminHeader`, `PageHeader`, `Tabs` (shadcn).

Hooks:
- `useAdminChats` (atualmente só `waiting + active`), `useClaimChat`, `useCloseChat`, `useSendChatMessage`, `useSupportTickets({kind:"admin"})`, `useSupportTicket`, `useUpdateTicket`.

Rotas hoje:
- `/admin/suporte` → `AdminSuporte` (chats ao vivo).
- `/admin/suporte/chats` → mesma página.
- `/admin/suporte/tickets` e `.../:ticketId` → `AdminTickets`.
- `/admin/tickets` (alias) → idem.
- `/admin/denuncias` → `AdminDenuncias` (tabela `reports`).

Diferenças entre o pedido e o schema atual — para não duplicar/quebrar:
- Status de chat: o schema só tem `waiting | active | closed`. "Aguardando usuário", "abandonado" e "resolvido" não existem como enum; serão tratados como **rótulos de UI** (ex.: `closed` = histórico; "aguardando usuário" fica como sub-estado opcional via `claimed_by + última mensagem do admin`).
- Status de ticket: schema tem `open | in_progress | waiting_user | resolved | closed`. Não existem `in_analysis`, `escalated`, `rejected`, `waiting_admin`. Vou mapear UI assim: "Em análise" = `in_progress`; "Aguardando admin" = `open` sem responsável; "Resolvidos" = `resolved + closed`. Status novos não serão criados nesta fase.
- Não existe coluna `severity` em tickets; usar `priority` (`urgent/high`) como severidade.
- Categorias de denúncia: usar as já existentes `establishment_issue`, `report_followup`, `order_issue` quando marcadas com prioridade `urgent`. A página legada `/admin/denuncias` (tabela `reports`) continua acessível.

---

## Plano (sem duplicar nada)

### 1. Centralizar `/admin/suporte` numa página com abas

Nova página única (reescreve `src/pages/admin/Suporte.tsx`) usando shadcn `Tabs`:

```
[Fila] [Em atendimento] [Histórico] [Tickets abertos] [Em análise] [Resolvidos] [Denúncias]
```

Cada aba mostra **contador** (badge ao lado do nome).

A página continua respondendo em:
- `/admin/suporte` (default → aba "Fila")
- `/admin/suporte/chats` → "Fila"
- `/admin/suporte/chats/:chatId` → abre a aba "Em atendimento" com o chat selecionado em um painel lateral (`Dialog`/`Sheet`).
- `/admin/suporte/tickets` e `.../:ticketId` continuam servidos por `AdminTickets` (separado, intocado). A aba "Tickets abertos/Em análise/Resolvidos/Denúncias" leva ao `AdminTickets` filtrado via querystring, **reusando** o componente existente.

Layout: AdminLayout + AdminHeader + Tabs. Sem sidebar nova.

### 2. Estender hooks (sem duplicar)

`src/hooks/useSupportChat.ts`:
- Estender `useAdminChats(filter?: "open" | "history")`. Default `"open"` (waiting+active) mantém compatibilidade. `"history"` retorna `status = closed` com paginação simples (limit 50, ordem `closed_at desc / last_message_at desc`).

Nenhuma tabela ou função nova no banco.

### 3. Aba "Fila"

Lista `useAdminChats("open").filter(c => c.status === "waiting" && !c.claimed_by)`.

Card: solicitante (`profiles.display_name` via join leve — usar `user_id` e cair em "Usuário" se não houver), tipo (cliente/loja via `establishment_id` presente), tempo aguardando, pedido relacionado (se `topic` ou metadado tiver), última mensagem, abertura, botão **Atender**.

Atender → `claim_support_chat` RPC (já existe) → envia mensagem do sistema: *"Um atendente iniciou o atendimento."* (já existe no fluxo atual, apenas renomear texto).

### 4. Aba "Em atendimento"

`status = active`. Mostra responsável, última mensagem, tempo desde última resposta, prioridade (derivada de `topic` quando começa com `[urgente]`, opcional).

Ações: abrir conversa em `Sheet` lateral, com `ChatPanel` (reuso) + barra de **mensagens rápidas** já listadas no prompt + botão **Marcar como aguardando usuário** (envia mensagem do sistema `"Aguardando retorno do usuário."` — sem alterar enum) + **Resolver** (= encerrar) + **Encerrar**.

### 5. Aba "Histórico"

`useAdminChats("history")`. Tabela enxuta, somente leitura, abre `ChatPanel` em modo read-only (composer escondido — já acontece quando `chat.status === "closed"`).

Filtros mínimos: busca por texto do tópico/usuário, período (data início/fim), tipo de solicitante (cliente vs loja). Filtros pesados (mensagens) ficam para depois.

### 6. Abas de Tickets

Reusar `AdminTickets` como sub-componente em modo embedded:
- "Tickets abertos" → filtro `status in ('open','in_progress')` e prioridade `all`.
- "Em análise" → filtro `status in ('in_progress','waiting_user')`.
- "Resolvidos" → filtro `status in ('resolved','closed')`.
- "Denúncias" → filtro `category in ('establishment_issue','report_followup')`, destaque para `priority` urgente. Inclui também atalho/link para `/admin/denuncias` (tabela `reports` legada).

Para não duplicar, refatoro `AdminTickets` para aceitar `defaultFilters` via props (ou via querystring), mantendo a página standalone funcionando exatamente como hoje.

### 7. Permissões

Sem mudança: `ProtectedAdminRoute` + `is_admin()` já bloqueiam lojista/cliente. Apenas garantir que a nova página fica dentro do mesmo `Route element={<ProtectedAdminRoute />}`.

### 8. Notificações admin

Triggers existentes (`handle_support_chat_message`, `handle_support_ticket_message`, `handle_support_ticket_status_change`) já notificam admins. Nenhuma alteração nesta fase.

### 9. Detalhe do chat e do ticket

- Ticket: `/admin/suporte/tickets/:ticketId` mantém `AdminTickets` (lista + `TicketDetail`).
- Chat: `/admin/suporte/chats/:chatId` abre a central na aba apropriada e pré-seleciona o chat.

Conversão chat → ticket: **fora desta fase** (marcado como TODO no código).

### 10. Critérios de aceite cobertos

1. Admin acessa `/admin/suporte` e vê 7 abas com contadores.
2. Cliente/lojista são bloqueados pelo `ProtectedAdminRoute`.
3. Fila lista chats `waiting`; "Atender" move para "Em atendimento".
4. "Encerrar" move para "Histórico".
5. Chat do pedido não aparece (a página só lê `support_chats`/`support_tickets`).
6. Tickets e chats permanecem em tabelas separadas e abas distintas.
7. Nota interna do ticket continua oculta para cliente (já garantido pelo trigger/RLS atuais e por `TicketDetail`).

---

## Arquivos afetados

Novos:
- Nenhuma nova rota; apenas adicionar `/admin/suporte/chats/:chatId` ao `App.tsx` apontando para a central.

Editados:
- `src/pages/admin/Suporte.tsx` — vira a central com `Tabs` (sobrescreve conteúdo atual; lógica de fila/atender/encerrar é preservada e movida para sub-componentes internos).
- `src/hooks/useSupportChat.ts` — `useAdminChats` aceita filtro `"open" | "history"`.
- `src/pages/admin/Tickets.tsx` — aceita `defaultFilters` opcional para ser embutido nas abas (`embedded?: boolean`, `forceStatus?: TicketStatus[]`, `forceCategory?: TicketCategory[]`). Página standalone continua igual.
- `src/App.tsx` — adicionar `Route path="/admin/suporte/chats/:chatId"` apontando para `AdminSuporte`. Manter rotas existentes.

Sem migrations, sem novas tabelas, sem novos componentes pesados — todo o detalhe de chat/ticket usa `ChatPanel`, `ChatComposer`, `AttachmentList`, `TicketDetail` já criados.

---

## Fora de escopo / a fazer depois

- Novos status (`in_analysis`, `escalated`, `rejected`, `waiting_admin`, `abandoned`) — exigem migration de enum.
- Coluna `severity` separada — hoje usamos `priority`.
- Conversão chat → ticket com vínculo `support_chat_id` no `support_tickets`.
- Busca full-text em mensagens.
- Métricas avançadas/SLA além das já presentes em `AdminTickets`.