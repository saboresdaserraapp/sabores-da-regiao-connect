# Plano: Pedidos unificados, notificações, realtime e chat lojista

## 1. Roteamento de notificações (cliente e loja)

`src/components/NotificationCenter.tsx` já tenta rotear para `/minha-loja/:est/pedidos/:orderId` e `/minha-conta/pedidos/:orderId`, mas falha quando a notificação não traz `related_order_id` ou `related_establishment_id`.

- Garantir que TODA notificação de pedido seja criada com `related_order_id` e `related_establishment_id` preenchidos:
  - `src/pages/Checkout.tsx` (new_order para loja)
  - `src/components/OrderChat.tsx` e `OrderChatFloating.tsx` (order_chat_message para o outro lado)
  - Triggers/RPC de status (`order_status_update`) e propostas de taxa (`order_delivery_fee_*`) — auditar via migration se algum insert em `notifications` esquece `related_establishment_id`.
- No `NotificationCenter`, fallback: se faltar `establishment_id`, buscar via `orders` antes de dizer "Pedido não disponível".

## 2. Página única de detalhes do pedido

Hoje existem dois componentes paralelos: `src/pages/PedidoCliente.tsx` e `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx`. Vamos reescrevê-los sobre um componente compartilhado.

- Criar `src/components/orders/OrderDetailView.tsx` com prop `mode: "customer" | "store"`:
  - Cabeçalho com status, código, data, totais.
  - Bloco de itens e adicionais.
  - Bloco de entrega (endereço, taxa, motoboy) — editável só em `store`.
  - Bloco de referências (`CustomerReferencesPanel`/`OrderReferencesPanel`) — leitura no cliente, edição na loja.
  - Chat embutido (`OrderChat`) com mesmo `orderId`.
  - Ações da loja: alterar status, enviar proposta de taxa (`SendProposalDialog`), marcar financeiro.
  - Ações do cliente: aceitar/recusar proposta (`ProposalAcceptCard`), abrir referência visual, reordenar.
- `PedidoCliente.tsx` → renderiza `<OrderDetailView mode="customer" />`.
- `pages/minha-loja/pedidos/PedidoDetalhes.tsx` → renderiza `<OrderDetailView mode="store" />`.
- Após checkout, redirect já existe para `/minha-conta/pedidos/:id` — mantido.

## 3. Painel de pedidos da loja reformulado

`src/pages/minha-loja/painel/Pedidos.tsx`:
- Layout em colunas por status (novo, em preparo, em entrega, concluído, cancelado) com contadores.
- Cada card abre `/minha-loja/:est/pedidos/:orderId` (página unificada acima).
- Badges de mensagens não lidas (`useOrderUnreadCounts`) e proposta pendente.
- Filtros: período, status, busca por código/cliente.
- Botão "Atualizar" + indicador de realtime ativo.

## 4. Realtime na loja

Em `Pedidos.tsx` (painel) e dentro de `OrderDetailView` modo store:
- `supabase.channel('painel-pedidos-' + estId)` escutando `orders`, `order_messages`, `order_confirmation_proposals` filtrados por `establishment_id`.
- Toast "Novo pedido #XXXX" com botão "Abrir" → navega para detalhes.
- Invalida queries (`['orders', estId]`, `['order-messages', orderId]`, etc.).
- Garantir publicação realtime via migration (verificar `supabase_realtime` já contém as 3 tabelas — se faltar, `ALTER PUBLICATION`).

## 5. Chat: notificar lojista ao receber mensagem do cliente

`src/components/OrderChatFloating.tsx` (cliente envia) e `OrderChat.tsx`:
- Após inserir em `order_messages`, criar notificação `order_chat_message` para o owner do estabelecimento (buscar `establishment_owners.owner_id`) com `related_order_id` e `related_establishment_id`.
- Reverso: quando loja envia, notificar `orders.user_id`.
- Idealmente mover para trigger SQL `on insert order_messages` para garantir consistência. Migration nova: function `notify_order_message()` que insere em `notifications` para o destinatário oposto.

## 6. Validação

- Build + abrir painel da loja, enviar mensagem do cliente, conferir:
  - Notificação aparece na aba "Loja" do sino.
  - Click leva para `/minha-loja/:est/pedidos/:orderId` (mesma página unificada).
  - Novo pedido aparece em tempo real no painel.
  - Cliente vê a mesma página em `/minha-conta/pedidos/:orderId` somente leitura.

## Detalhes técnicos

- Arquivos editados: `NotificationCenter.tsx`, `Checkout.tsx`, `OrderChat.tsx`, `OrderChatFloating.tsx`, `pages/PedidoCliente.tsx`, `pages/minha-loja/pedidos/PedidoDetalhes.tsx`, `pages/minha-loja/painel/Pedidos.tsx`.
- Arquivos novos: `src/components/orders/OrderDetailView.tsx`.
- Migration: trigger `notify_order_message` em `order_messages`; verificar publication realtime.
- Sem mudanças em RLS além das já existentes.
