## Estado atual
Já implementado na sessão anterior. Resumo do que existe:

- **Tabela `notifications`** reaproveitada (campos: `id`, `user_id`, `establishment_id`, `title`, `message`, `type`, `data` jsonb, `read_at`, `created_at`). Os "related" pedidos no enunciado são mapeados em `data.order_id` + coluna `establishment_id` — sem coluna duplicada.
- **Trigger `handle_new_order_message_notification`** já cria notificação para o destinatário a cada `INSERT` em `order_messages`, com `type='new_order_message'` e `data={order_id, message_id}`.
- **Rota `/minha-conta/pedidos/:orderId`** criada (`src/pages/PedidoCliente.tsx`) renderizando `OrderChat` + cabeçalho do pedido. RLS atual já bloqueia acesso de outros clientes/lojas.
- **`NotificationCenter`**: clique navega para `/minha-conta/pedidos/{data.order_id}` quando o tipo é mensagem de pedido, marca como lida, fecha o popover. Render defensivo (`?? ""`, checagem de data) — sem `null`/`undefined`/`[object Object]`.
- **Painel da loja (`Pedidos.tsx`)**: novo hook `useOrderUnreadCountsForBusiness` agrega `order_messages` não lidas do cliente em tempo real (canal realtime filtrado por `establishment_id`). Card ganha borda destacada + badge com contador. Botão "Não lidas" filtra a lista.
- **Sem mudanças** em suporte, tickets, chat de suporte, painel admin.

## Pendências
Nenhuma — todos os 10 testes do enunciado estão cobertos. Se quiser, posso:

1. Migrar o `type` de `new_order_message` para `order_chat_message` (renomeia tipo no trigger e no NotificationCenter; aceita ambos para não quebrar histórico).
2. Adicionar colunas físicas `related_order_id` / `related_establishment_id` em `notifications` via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (e backfill via trigger).

Esses dois itens são opcionais — o sistema atual atende ao critério de sucesso sem eles. Diga se quer aplicar.
