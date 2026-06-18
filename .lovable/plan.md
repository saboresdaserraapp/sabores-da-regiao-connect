## Problemas identificados

### 1. Notificação "Confirme o valor final da entrega" abre rota inexistente
Em `NotificationCenter.tsx` (`routeFor`), quando o usuário também é dono do estabelecimento do pedido, qualquer notificação de pedido é roteada para `/minha-loja/:establishmentId/pedidos/:orderId`. Isso está errado para notificações **destinadas ao cliente** — a proposta de revisão de valor precisa abrir a tela do cliente (`/minha-conta/pedidos/:orderId`), onde fica o `ProposalAcceptCard` com os botões Aceitar/Recusar. Em ambientes de teste em que dono e cliente são o mesmo usuário, o roteamento atual cai numa visão de loja que não corresponde a essa ação.

### 2. "Falar com a loja" não abre chat flutuante
Hoje os dois pontos de entrada apenas tentam rolar a página até a seção de mensagens do pedido:
- `PedidoCliente.tsx` → `scrollToChat()` para `#order-chat-section`.
- `ProposalAcceptCard.tsx` → âncora `#order-chat` (id que nem existe).

O componente `OrderChat` já existe e funciona; falta apresentá-lo como sobreposição flutuante quando o usuário pede "Falar com a loja".

## Mudanças (somente frontend, sem mexer em backend, RLS, tabelas ou notificações)

### A. Roteamento correto da notificação do cliente
`src/components/NotificationCenter.tsx`:
- Diferenciar por tipo dentro de `ORDER_TYPES`:
  - `order_delivery_fee_proposal` e `order_chat_message`/`new_order_message` cujo destinatário é o cliente → sempre `/minha-conta/pedidos/:orderId` (não considerar `isMyEstablishment`).
  - `order_delivery_fee_accepted` / `order_delivery_fee_rejected` → mantêm o roteamento atual para o painel da loja.
  - `order_status_update` → mantém heurística atual.

Isso resolve o caso em que o cliente também é dono e era enviado para uma página da loja onde a ação não existe.

### B. Chat flutuante "Falar com a loja"
Criar `src/components/OrderChatFloating.tsx` (wrapper leve em torno do `OrderChat` existente) usando o `Dialog`/`Sheet` já disponíveis no design system:
- Props: `orderId`, `establishmentId`, `open`, `onOpenChange`, `disabled?`, `disabledMessage?`.
- Renderiza um painel flutuante (canto inferior direito no desktop, sheet no mobile) com header "Conversa com a loja" e o `OrderChat` dentro.
- Sem nova tabela, sem novo canal: reaproveita exatamente o `OrderChat` do pedido (mesmo histórico, mesmas regras de RLS).

Integrações:
- `src/pages/PedidoCliente.tsx`: trocar `scrollToChat` por abrir o `OrderChatFloating` (estado local `chatOpen`). Manter a seção inline "Mensagens do pedido" como está.
- `src/components/orders/ProposalAcceptCard.tsx`: substituir o link âncora quebrado `#order-chat` por um botão que abre o mesmo `OrderChatFloating` (recebendo `establishmentId` via prop adicional vinda do pai, ou buscando pelo `orderId`).

### C. Não alterar
Checkout, carrinho, produtos, motoboys, referências visuais, cálculo de entrega, painel admin, painel da loja (exceto pelo que já foi feito), tickets, suporte rápido, tabelas, RLS, triggers, edge functions.

## Verificação
1. Logar como cliente (mesmo que dono): clicar na notificação "Confirme o valor final da entrega" → cai em `/minha-conta/pedidos/:id` com `ProposalAcceptCard` visível.
2. Clicar em "Falar com a loja" (tanto no `PedidoCliente` quanto no `ProposalAcceptCard`) → abre painel flutuante com o chat do pedido funcionando em tempo real.
3. Notificações de aceite/recusa continuam abrindo a tela do pedido no painel da loja.
4. Chat do pedido, suporte rápido e tickets permanecem isolados.
