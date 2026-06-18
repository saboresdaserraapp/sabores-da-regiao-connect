# Unificar a página de detalhes do pedido

## Diagnóstico

Existem hoje **três páginas distintas** de detalhes de pedido:

| Rota | Componente | Uso atual |
|---|---|---|
| `/pedido/:code` | `PedidoTracking` | Para onde o checkout redireciona após finalizar (também usada no link do WhatsApp e no histórico de pedidos) |
| `/minha-conta/pedidos/:orderId` | `PedidoCliente` | Notificações do cliente, diálogo de proposta pendente |
| `/minha-loja/:est/pedidos/:orderId` | `PedidoDetalhesLoja` | Painel da loja (status, proposta, marcações financeiras) |

Conforme a regra ("a única página que deve existir é aquela para onde o cliente é redirecionado ao finalizar o pedido"), a canônica é **`/pedido/:code` → `PedidoTracking`**.

## Mudança

### 1. Tornar `PedidoTracking` a página única, com 3 modos detectados em runtime

Carregar o pedido por `tracking_code` e decidir o modo a partir do usuário logado:

- **owner**: `auth.uid() === establishment.owner_id` (ou está em `establishment_owners`) → renderiza painel da loja (ações de status, enviar proposta, marcação financeira) — migra UI/lógica de `PedidoDetalhesLoja`.
- **customer**: `auth.uid() === orders.user_id` → mostra `PendingProposalDialog`, chat do pedido, referências (lógica de `PedidoCliente`).
- **public** (sem login ou sem vínculo): visão somente-leitura atual de `PedidoTracking`.

Os blocos compartilhados (status stepper, itens, endereço, totais, chat) ficam comuns; ações condicionam por modo.

### 2. Remover as rotas duplicadas em `App.tsx`

Substituir por redirects que resolvem `orderId → tracking_code` e navegam para `/pedido/:code`:

```text
/minha-conta/pedidos/:orderId       → /pedido/:code
/minha-loja/:est/pedidos/:orderId   → /pedido/:code
```

Implementadas como pequenos componentes `RedirectByOrderId` que fazem 1 query e usam `<Navigate replace />`. Mantém compatibilidade com links antigos (notificações já enviadas, e-mails, etc.).

### 3. Atualizar geradores de links para usarem `tracking_code`

- `src/components/NotificationCenter.tsx` — `routeFor` passa a usar `data.tracking_code` (incluído no `data` quando a notificação é criada) ou o redirect; rota final sempre `/pedido/<code>`.
- `src/pages/minha-loja/painel/Pedidos.tsx` — botões "Abrir detalhes" linkam para `/pedido/${o.tracking_code}`.
- `src/components/PendingProposalDialog.tsx` — navega para `/pedido/${tracking_code}` (já recebe order; passar code como prop).
- Triggers/funções SQL que criam notificações de pedido (`handle_order_status_change_notification`, `handle_new_order_message_notification`, `notify_new_order` etc.) já incluem `tracking_code` em `data` — confirmar; se faltar em alguma, adicionar.

### 4. Apagar arquivos órfãos

- `src/pages/PedidoCliente.tsx`
- `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx`
- Remover imports correspondentes em `App.tsx`.

## Detalhes técnicos

- `PedidoTracking` passa a aceitar usuário autenticado (hoje é totalmente público). Não exige login — cai no modo public se não houver sessão.
- A query principal vira `select * from orders join establishments where tracking_code = :code`, retornando `user_id`, `establishment_id`, `owner_id` para decidir o modo.
- Realtime de `orders` / `order_messages` / `order_confirmation_proposals` filtrado por `id = :orderId` (após carregar o pedido) — já existem migrations para a publication.
- Modo store reutiliza componentes que já existem: `OrderStatusStepper`, `OrderFreteActions`, `OrderReferencesPanel`, `SendProposalDialog`, `ProposalAcceptCard`.

## Validação

- Concluir checkout → `/pedido/<code>` abre no modo customer com chat e proposta pendente, se houver.
- Clicar "Abrir detalhes" no painel da loja → mesma URL `/pedido/<code>`, mas com ações de loja visíveis.
- Acessar link antigo `/minha-conta/pedidos/<id>` ou `/minha-loja/<est>/pedidos/<id>` → redirect para `/pedido/<code>`.
- Notificações (proposta, status, chat, novo pedido) abrem todas a mesma página.
- Sem login: a página continua acessível como tracking público.
