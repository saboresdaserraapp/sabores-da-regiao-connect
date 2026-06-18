# Corrigir notificações de proposta de valor revisado

## Problema

Quando o lojista envia uma proposta (revisão de valor/frete) para o pedido, a notificação chega ao **cliente**. Hoje, no `NotificationCenter`, a classificação é feita por "estabelecimento pertence ao usuário?". Como na conta de teste o mesmo usuário é dono da loja **e** cliente, a notificação cai na aba **Loja** e o link redireciona para `/minha-loja/:est/pedidos/:orderId` — uma rota cujo conteúdo não faz sentido para a ação de aceitar/recusar proposta (e que parece "página inexistente" no fluxo do cliente).

Os tipos de proposta são, por definição, sempre direcionados ao cliente:
- `order_delivery_fee_proposal`
- `order_delivery_fee_accepted` (confirmação que volta pro cliente)
- `order_delivery_fee_rejected`
- `order_status_update` (também é sempre do cliente)

## Mudança (apenas `src/components/NotificationCenter.tsx`)

1. Criar `CUSTOMER_ONLY_TYPES` com os 4 tipos acima.
2. `bucketFor`: se `type ∈ CUSTOMER_ONLY_TYPES`, retornar `"cliente"` antes da checagem de `isMine`.
3. `routeFor`: para esses tipos, sempre retornar `/minha-conta/pedidos/:orderId` (ignorar `isMyEstablishment`). Assim o cliente cai na página de detalhes do pedido onde o `PendingProposalDialog` aparece e ele pode aceitar/recusar.

`STORE_ONLY_TYPES` continua com `new_order` (loja). Demais tipos de chat (`order_chat_message`) continuam sendo classificados pelo destinatário real, pois cliente e loja podem ambos receber.

## Validação

- Lojista envia proposta → notificação aparece na aba **Cliente** do mesmo usuário.
- Clicar abre `/minha-conta/pedidos/<orderId>` e o diálogo de proposta é exibido.
- Notificação `new_order` continua na aba Loja e abre `/minha-loja/:est/pedidos/:orderId`.
