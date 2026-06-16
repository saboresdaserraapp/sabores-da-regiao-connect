# Remover Histórico de Pedidos do perfil do cliente

Objetivo: eliminar por completo a área "Histórico de Pedidos" e tudo que a alimenta no lado do cliente, mantendo intactos:
- Painel da Loja (`/minha-loja/painel/pedidos` e `/minha-loja/pedidos/:orderId`)
- Painel Admin
- Tabela `orders` no banco (continua sendo usada pela loja/admin)
- Notificações, chat de pedido, tracking público por código

## O que será removido

### 1. UI do perfil (`src/pages/MinhaConta.tsx`)
- Remover a aba `Histórico de Pedidos` (TabsTrigger + TabsContent `pedidos`).
- Remover imports `useUserOrders`, `useActiveOrders`, `PedidosTab`, `Receipt` (se não usado em outro lugar).
- Ajustar grid de tabs para o novo número de abas.

### 2. Página de detalhe do pedido do cliente
- Deletar `src/pages/minha-conta/PedidoDetalhes.tsx`.
- Em `src/App.tsx`: remover import `PedidoDetalhesCliente` e a rota `/minha-conta/pedidos/:orderId`.

### 3. Componente da aba e botões flutuantes do cliente
- Deletar `src/components/profile/PedidosTab.tsx`.
- Deletar `src/components/FloatingOrdersButton.tsx`.
- Em `src/pages/Index.tsx`: remover import e uso de `<FloatingOrdersButton />`.
- Verificar `src/components/OrderFloatingButton.tsx` — se for usado só pelo cliente para abrir histórico, remover também; se for o botão genérico do painel da loja, manter.

### 4. Hooks e serviços de pedidos do usuário
- Deletar `src/hooks/useOrders.ts` (expõe `useUserOrders`, `useActiveOrders`, `useOrderById` voltados ao cliente).
- Deletar `src/lib/userOrders.ts` (`userOrdersService`).

### 5. Notificações (`src/components/NotificationCenter.tsx`)
- Remover apenas links/ações que abrem `/minha-conta/pedidos/...` (a rota deixará de existir). Manter a notificação em si; trocar o destino por algo neutro (ex.: fechar dropdown) ou remover o link. Não alterar a lógica de notificações da loja.

## O que NÃO será alterado
- `src/pages/minha-loja/painel/Pedidos.tsx` e `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx`
- Componentes em `src/components/orders/*` usados pelo painel da loja
- Tabela `orders`, `order_messages`, `order_status_history`, `order_confirmation_proposals` no banco
- Rastreio público por código (`/pedido/:tracking_code`)
- Checkout, carrinho, referências

## Detalhes técnicos
- Migration: nenhuma. Não vamos apagar registros do banco porque a loja precisa deles para gestão. "Remover o histórico do usuário" se resolve removendo toda a superfície de leitura/UI no lado cliente — o usuário não terá mais nenhuma forma de listar/visualizar seus pedidos pelo perfil.
- Após as exclusões, rodar busca por imports órfãos (`useUserOrders`, `useActiveOrders`, `PedidosTab`, `userOrdersService`, `FloatingOrdersButton`, `PedidoDetalhesCliente`) para garantir build limpo.

## Confirmação necessária
Está ok manter os registros da tabela `orders` (pois a loja/admin dependem deles) e remover apenas a superfície do cliente? Se quiser também esconder pedidos antigos do painel da loja, é outro escopo.
