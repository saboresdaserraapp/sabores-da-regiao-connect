# Detalhes do Pedido — reformulação e correção de redirecionamento

## Diagnóstico

A rota `/pedido/:code` resolve o `tracking_code` em `PedidoTracking.tsx` e renderiza `PedidoCliente`. Hoje:

- `PedidoTracking` redireciona para `/minha-conta?tab=pedidos` sempre que `resolved` vier `null`. Isso engole erros transitórios (RLS aquecendo, rede, race com `useAuth`) — o pedido existe e o usuário tem acesso, mas o usuário acaba caindo na lista. Esse é o motivo do bug relatado.
- `PedidoCliente` é praticamente apenas um header + chat. Não mostra itens, endereço, pagamento, total detalhado nem histórico de status — apesar de o pedido ter todos esses dados em `orders` (`items` jsonb, `address_id`, `payment_method`, `status_history`, `final_*`, etc.).

## O que vamos fazer

### 1. Tornar o redirecionamento seguro (`src/pages/PedidoTracking.tsx`)
- Adicionar estado `resolveError` e capturar `error` do supabase.
- Só redirecionar para `/minha-conta?tab=pedidos` quando a query terminar **com sucesso** e retornar `null` (pedido apagado / sem acesso).
- Em caso de erro de rede/RLS, mostrar um `ErrorState` com botão "Tentar novamente" em vez de empurrar o usuário para fora.
- Manter fallback para `PedidoTrackingPublic` quando não houver usuário logado.

### 2. Página de Detalhes do Pedido (`src/pages/PedidoCliente.tsx` reescrito)
Layout em container `max-w-3xl`, usando shadcn (`Card`, `Badge`, `Separator`, `Button`).

```text
┌─────────────────────────────────────────────┐
│ ← Voltar para Meus Pedidos                  │
│ Detalhes do Pedido                          │
│ SDS-WTFH7G · 18/06/2026 17:53  [status]     │
├─────────────────────────────────────────────┤
│ OrderStatusTracker (stepper horizontal)     │
├─────────────────────────────────────────────┤
│ Resumo: subtotal, taxa, desconto, total     │
├─────────────────────────────────────────────┤
│ Itens (nome, qtd, opções, unit, subtotal)   │
├─────────────────────────────────────────────┤
│ Endereço de entrega                         │
├─────────────────────────────────────────────┤
│ Pagamento (método + status)                 │
├─────────────────────────────────────────────┤
│ Ações: Pedir de novo · WhatsApp · Ajuda     │
├─────────────────────────────────────────────┤
│ Mensagens do pedido (OrderChat — mantido)   │
└─────────────────────────────────────────────┘
```

Componentes novos em `src/components/orders/details/`:
- `OrderDetailsHeader.tsx` — título, código, data, badge de status, botão "Voltar".
- `OrderStatusTracker.tsx` — stepper baseado em `status_history` + `status` atual, usando `statusLabel`.
- `OrderSummary.tsx` — subtotal, taxa de entrega, desconto, taxa extra, total final (prefere `final_*`, cai para `subtotal`/`delivery_fee`/`total`).
- `OrderItemsList.tsx` — itera `items` jsonb (nome, qtd, opções, observação, unit, subtotal).
- `OrderShippingAddress.tsx` — busca por `address_id` (`useAddresses` já existe; usar query direta na tabela `addresses` para um endereço único).
- `OrderPaymentMethod.tsx` — `payment_method` / `payment_method_intent` + `payment_status` (badge).

### 3. Query única
`PedidoCliente` passa a buscar todas as colunas necessárias (`items, subtotal, delivery_fee, total, final_*, payment_method, payment_method_intent, payment_status, status_history, address_id, notes`) + join `establishment(name,logo,whatsapp)` + join opcional `address:addresses(*)`. Em erro, `ErrorState` com retry; em not-found definitivo (`data === null`), aí sim `Navigate` para a aba de pedidos.

### 4. Reaproveitamento
- "Pedir de novo" usa `lib/reorder.ts` existente.
- WhatsApp usa `lib/whatsapp.ts`.
- Ajuda / Ticket / Chat com a loja: mantidos como já estão.

## Arquivos afetados
- `src/pages/PedidoTracking.tsx` (correção do redirect)
- `src/pages/PedidoCliente.tsx` (reescrito para a nova página)
- `src/components/orders/details/OrderDetailsHeader.tsx` (novo)
- `src/components/orders/details/OrderStatusTracker.tsx` (novo)
- `src/components/orders/details/OrderSummary.tsx` (novo)
- `src/components/orders/details/OrderItemsList.tsx` (novo)
- `src/components/orders/details/OrderShippingAddress.tsx` (novo)
- `src/components/orders/details/OrderPaymentMethod.tsx` (novo)

## Fora de escopo
- Alterar a página da loja (`PedidoDetalhesLoja`) — segue como está.
- Editar fluxos de Checkout / criação de pedido (o redirecionamento pós-finalização já aponta para `/pedido/:code` via tracking_code; ele passará a funcionar automaticamente quando o item 1 for corrigido).
- Cupom / desconto reais no resumo.
