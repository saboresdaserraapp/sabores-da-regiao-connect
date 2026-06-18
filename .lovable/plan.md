## Resultado da Fase 0 — Auditoria

Já existe no projeto (não vou recriar):

**Rotas**
- Cliente: `/minha-conta/pedidos/:orderId` → `PedidoCliente.tsx` (existe)
- Loja: `/minha-loja/:establishmentId/pedidos` → `PainelPedidos` (existe, 490 linhas)
- Loja: `/minha-loja/:establishmentId/pedidos/:orderId` → `PedidoDetalhes` (existe, 360 linhas)
- Tracking público: `/pedido/:code` → `PedidoTracking` (mantém)
- Lista cliente (`/minha-conta/pedidos`) **não existe** como rota separada — hoje fica dentro de `/minha-conta` (aba histórico). Vou manter assim (não faz parte do problema reportado).

**Componentes**
- `NotificationCenter.tsx` já tem `routeFor()` e abas Cliente/Loja
- `OrderChatFloating.tsx` (chat pop-up cliente) já existe
- `OrderChat.tsx` (chat embutido no detalhe) já existe
- `useOrderMessages.ts` já faz INSERT em `order_messages` + Realtime
- `PendingProposalDialog.tsx` já existe

**Tabelas**: `orders`, `order_messages`, `notifications` (com `related_order_id` + `related_establishment_id`), `order_confirmation_proposals` — todas com RLS já corrigida em auditoria anterior.

## Bugs concretos encontrados

1. **`Checkout.tsx` cria notificação `type: "new_order"`**, mas o `ORDER_TYPES` de `NotificationCenter.tsx` só conhece `new_order_message`. Resultado: clique em "Novo pedido" da loja não redireciona para lugar nenhum.
2. **`PainelPedidos` não tem Realtime** — loja não vê novos pedidos/mensagens sem F5.
3. **Cliente acaba de enviar pelo `OrderChatFloating` mas a loja não recebe notificação `order_chat_message`** (precisa verificar/adicionar trigger ou criação manual).
4. Notificação `order_chat_message` para a **loja** hoje cai em `CUSTOMER_ONLY_TYPES` no `routeFor` — quando a mensagem vem do cliente, sempre manda para `/minha-conta/...`, mesmo se o destinatário for o lojista. Precisa rotear por **destinatário (`user_id`)** e não pelo tipo.

## Plano de correção (mínimo, sem reescrever páginas que já funcionam)

### 1. `NotificationCenter.tsx` — rotear pelo destinatário real
- Adicionar `"new_order"` ao `ORDER_TYPES`.
- Substituir `CUSTOMER_ONLY_TYPES`/`STORE_ONLY_TYPES` por uma regra única: **se a notificação pertence a uma das minhas lojas (`related_establishment_id` ∈ myEstablishments) → `/minha-loja/:est/pedidos/:orderId`; caso contrário → `/minha-conta/pedidos/:orderId`**. Isso resolve o caso em que o mesmo usuário é dono e cliente: cada notificação foi criada para um `user_id` específico, e o `related_establishment_id` indica se é uma notificação da loja.
- Toast amigável "Não foi possível abrir este item" quando faltar `orderId`.

### 2. `Checkout.tsx` / criação de pedido
- Garantir que a notificação de novo pedido tenha `related_order_id = order.id` e `related_establishment_id = order.establishment_id` (verificar payload existente; ajustar se faltar).
- Após criar o pedido, redirecionar cliente para `/minha-conta/pedidos/:orderId` (já é o comportamento; validar).

### 3. `OrderChatFloating.tsx` — criar notificação para a loja
- Após `INSERT` em `order_messages` com `sender_type = "customer"`, chamar `supabase.functions`/`rpc create_notification` (ou inserir direto, se permitido) para cada owner da loja, com:
  - `type: "order_chat_message"`, `related_order_id`, `related_establishment_id`, `user_id` = owner.
- Mesma lógica espelhada quando loja responde no `OrderChat`: criar notificação para `orders.user_id`.

### 4. `PainelPedidos.tsx` — Realtime + toast
- Adicionar `useEffect` com `supabase.channel("painel-pedidos-{est}")`:
  - `postgres_changes` em `orders` filtrado por `establishment_id=eq.{est}` (INSERT/UPDATE) → `queryClient.invalidateQueries(...)` + `toast("Novo pedido recebido")` em INSERT.
  - `postgres_changes` em `order_messages` filtrado por `establishment_id=eq.{est}` (INSERT) → invalidate + toast "Nova mensagem de cliente" quando `sender_type='customer'`.
  - `postgres_changes` em `order_confirmation_proposals` (INSERT/UPDATE) → invalidate + toast "Cliente aceitou/recusou…".
- Cleanup com `supabase.removeChannel(channel)`.
- Garantir que as tabelas estão em `supabase_realtime` publication (migration leve se faltar — verificar primeiro).

### 5. Botão "Abrir pedido" nos cards de `PainelPedidos`
- Conferir se já navega para `/minha-loja/:est/pedidos/:orderId`. Ajustar se algum card ainda abre modal/drawer ao invés da rota real.

## Fora do escopo agora (já está OK ou não foi reportado)
- Recriar `PedidoCliente` / `PedidoDetalhes` (já existem com dados reais).
- Reformular layout da página de pedidos da loja (já tem filtros, status, etc.). Só adiciono Realtime + toasts.
- Mexer em produtos, carrinho, busca, motoboys, referências visuais (regras pedidas).
- Mudanças de RLS (já feitas na auditoria anterior).

## Arquivos que serão editados
- `src/components/NotificationCenter.tsx` (regra de roteamento por destinatário + `new_order`)
- `src/components/OrderChatFloating.tsx` (criar notificação para a loja)
- `src/components/OrderChat.tsx` (criar notificação para cliente quando loja responde)
- `src/pages/Checkout.tsx` (validar payload da notificação)
- `src/pages/minha-loja/painel/Pedidos.tsx` (Realtime + toasts)
- Possível migration para adicionar tabelas à publication `supabase_realtime` se faltar.

## Validação
- Logar como cliente em uma aba e como dono da mesma conta — disparar mensagem nos dois lados e confirmar que cada notificação abre a página certa.
- Abrir `PainelPedidos` em uma aba, criar pedido em outra — card aparece sem F5 com toast.
- Cliente aceita proposta → loja recebe toast e card atualizado.
