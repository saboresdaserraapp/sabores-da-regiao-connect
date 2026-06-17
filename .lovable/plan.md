## Scope
Adicionar notificações internas ao Chat do Pedido reaproveitando a tabela `notifications` existente e o trigger `handle_new_order_message_notification` já criado. Nenhuma tabela nova, nenhum impacto em suporte/tickets/admin.

## Auditoria (o que já existe)

- **Tabela `notifications`**: já contém `id`, `user_id`, `establishment_id`, `title`, `message`, `type`, `read_at`, `data` (jsonb), `created_at`. RLS por `user_id`. ✅
- **Trigger `handle_new_order_message_notification`** (em `order_messages`): já notifica cliente quando loja escreve e vice-versa, com `type='new_order_message'`, `data={order_id, message_id}`, `establishment_id` preenchido. ✅
- **`useNotifications` + `NotificationCenter`**: sininho funcional, lê `read_at`, marca como lido no clique. ✅
- **`useOrderMessages`**: já tem realtime + `markAsRead`. ✅
- **Falta**: navegação ao clicar na notificação, indicador de não-lidas no card de pedido da loja, filtro "com mensagens não lidas" no painel da loja.

## Decisões

- **Reusar `notifications`**. Os campos `related_order_id`/`related_establishment_id` pedidos no enunciado já existem semanticamente via `data->>order_id` e a coluna `establishment_id`. Não criar colunas novas — duplicaria estado e quebraria o trigger atual.
- **Reusar `type='new_order_message'`** já emitido pelo trigger (renomear quebraria histórico). O NotificationCenter já trata esse tipo com ícone de mensagem.
- Não tocar em admin, suporte, tickets, chat de suporte.

## Mudanças

### 1. `src/components/NotificationCenter.tsx`
- Tornar a notificação clicável com navegação:
  - `type === "new_order_message"` → `/minha-conta/pedidos/{data.order_id}` (rota do cliente).
  - Demais tipos: comportamento atual.
- Ao clicar: `markAsRead` + `navigate(...)` + fechar popover.
- Render defensivo: `n.title ?? ""`, `n.message ?? ""`, `n.created_at ? format(...) : ""`, ignorar notificação sem `order_id` quando for desse tipo.

### 2. Novo hook `src/hooks/useOrderUnreadCounts.ts`
- Recebe `establishmentId` + lista de `orderIds`.
- Query agregada em `order_messages` filtrando `establishment_id`, `read_at IS NULL`, `sender_type = 'customer'` (mensagens do cliente ainda não lidas pela loja).
- Retorna `Record<orderId, number>`.
- Inscreve canal realtime em `order_messages` filtrado por `establishment_id` para invalidar a query.

### 3. `src/pages/minha-loja/painel/Pedidos.tsx`
- Usar `useOrderUnreadCounts` com os ids carregados.
- No card/linha do pedido: badge com ícone de mensagem + contador quando `count > 0`; borda/realce sutil no card.
- Adicionar toggle simples "Com mensagens não lidas" no topo (checkbox/botão) que filtra a lista para `count > 0`. Sem painel novo.

### 4. `src/components/OrderChat.tsx`
- Sem mudança funcional além da que já existe (já chama `markAsRead`). Verificar que o `establishment_id` é passado ao enviar para garantir notificação à loja correta.

## Fora de escopo
Admin, suporte/tickets, criação de novas tabelas/colunas, alteração de triggers existentes, refactor do sininho, push/email, painel novo de mensagens.

## Testes manuais
1. Cliente envia → loja vê badge "1" no card do pedido e item aparece com filtro "não lidas".
2. Loja abre o pedido → badge zera.
3. Loja responde → cliente vê sininho com "Nova mensagem sobre seu pedido".
4. Cliente clica → navega para `/minha-conta/pedidos/:orderId`, notificação fica lida.
5. Outro cliente/loja não vê (garantido por RLS já existente em `notifications` e `order_messages`).
