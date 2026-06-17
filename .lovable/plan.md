## Auditoria — o que já existe

- Tabela `notifications` com campos: `user_id`, `title`, `message`, `type`, `data`, `read_at`, `related_order_id`, `related_support_chat_id`, `related_ticket_id`, `establishment_id`. Nenhum campo precisa ser criado.
- Triggers no banco já criam notificações para:
  - Mensagens no chat do pedido (`handle_new_order_message_notification`).
  - Mudança de status do pedido (`handle_order_status_change_notification`, tipo `order_status_update`).
  - Mensagens em chat de suporte (`handle_support_chat_message`).
  - Mensagens e mudança de status de ticket (`handle_support_ticket_message`, `handle_support_ticket_status_change`).
- Componentes existentes: `NotificationCenter` (sininho usado no Header), `useNotifications` (lista + markAsRead), `ProposalAcceptCard` (pop-up de proposta dentro do pedido).
- RLS de `notifications` já restringe leitura/escrita ao `user_id = auth.uid()`.

## Lacunas a resolver

1. Não há notificação quando a loja envia / o cliente aceita / o cliente recusa a proposta de frete.
2. `NotificationCenter` não inclui os tipos `order_status_update`, `order_delivery_fee_proposal/accepted/rejected`, e a rota admin de chat de suporte ignora o `chatId`.
3. Não existe pop-up global de proposta pendente — só aparece se o usuário já estiver na tela do pedido.
4. Falta utilitário `markAllAsRead`.
5. Realtime não está plugado; sininho só atualiza por refetch.

## Mudanças (somente o necessário, sem duplicar nada)

### Banco — uma única migration

- Trigger `notify_proposal_sent` em `order_confirmation_proposals` AFTER INSERT/UPDATE: quando `status = 'sent'`, criar notificação para `orders.user_id` com `type = 'order_delivery_fee_proposal'`, `related_order_id`, `establishment_id`.
- Estender `accept_order_proposal` e criar/ajustar fluxo de recusa (já existem RPCs `accept_order_proposal`; verificar se há `reject_order_proposal` — se sim, ajustar; se não, adicionar trigger AFTER UPDATE quando `status` muda para `accepted` ou `rejected`) para enviar notificação ao `establishments.owner_id` com `type = 'order_delivery_fee_accepted'` ou `'order_delivery_fee_rejected'`.
- Nenhum DROP, nenhuma renomeação, nenhuma alteração em RLS global.

### Frontend

`src/components/NotificationCenter.tsx`
- Adicionar `order_status_update`, `order_delivery_fee_proposal/accepted/rejected` ao conjunto `ORDER_TYPES`.
- Rota admin de chat: usar `chatId` quando presente (`/admin/suporte/chats/${chatId}`).
- Rota de ticket para lojista exige `estId`; quando ausente cair para `/minha-conta/...`.
- Mensagem de fallback "Item não disponível" quando faltar `relatedId`.

`src/hooks/useNotifications.ts`
- Adicionar `markAllAsRead` (update em todas onde `user_id = me AND read_at IS NULL`).
- Adicionar subscription Realtime em `notifications` filtrada por `user_id`, invalidando o query key no INSERT/UPDATE.

`src/components/PendingProposalDialog.tsx` (novo, único componente global)
- Hook que busca propostas pendentes do usuário logado:
  `order_confirmation_proposals.status = 'sent'` + `orders.user_id = auth.uid()` + `orders.confirmation_flow_status = 'proposal_sent_to_customer'`.
- Reusa `ProposalAcceptCard` dentro de um `Dialog`.
- Montado uma única vez em `src/App.tsx` (dentro do provider de auth, fora das rotas admin/loja — checar via `useLocation` e não renderizar em `/admin/*` nem `/minha-loja/*`).
- Ao aceitar/recusar: fecha; marca a notificação correspondente como lida; refetch.

### Não tocar

Checkout, carrinho, produtos, motoboys, referências visuais, cálculo de entrega, painel admin fora de suporte, painel da loja fora dos indicadores existentes. RLS global permanece intocada.

## Testes manuais

1. Loja envia proposta → cliente vê sininho com `order_delivery_fee_proposal` e pop-up central; aceitar fecha pop-up, marca como lida, pedido vira `confirmed_by_business`.
2. Cliente recusa → loja recebe notificação `order_delivery_fee_rejected` apontando para `/minha-loja/:estId/pedidos/:orderId`.
3. Mensagens nos três canais continuam gerando notificações isoladas (já validado pelos triggers existentes) e cada clique abre a rota correta sem cruzar canais.
4. Cliente A não enxerga notificações do Cliente B (RLS já garante).
