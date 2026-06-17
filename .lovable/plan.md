## Auditoria — nada precisa ser recriado

Tudo já existe e está em uso:

| Item | Local | Status |
|---|---|---|
| Tabela `order_messages` | RLS por cliente/loja (auditada na última revisão) | OK |
| Hook `useOrderMessages` | `src/hooks/useOrderMessages.ts` (query + realtime + send + markAsRead) | OK |
| Componente | `src/components/OrderChat.tsx` | OK |
| Página cliente | `MinhaConta.tsx`, `PedidoCliente.tsx` (`/minha-conta/pedidos/:id`) | OK |
| Página loja | `minha-loja/pedidos/PedidoDetalhes.tsx` | OK |
| Mensagens de sistema | proposta enviada (`orderProposals.ts`), aceite/recusa (RPC `accept_order_proposal`/`reject_order_proposal`), aceite WhatsApp | OK |
| Notificações | trigger `handle_new_order_message_notification` com `related_order_id` | OK |

## Gaps identificados (pequenos, não bloqueantes)

1. Título fixo "Chat do Pedido" — spec pede "Conversa com a loja" (cliente) e "Conversa com o cliente" (loja).
2. Sem botões de mensagens rápidas no lado da loja.
3. Sem aviso quando o pedido está cancelado/entregue ("Este pedido foi finalizado. Para problemas, abra um ticket de suporte.").
4. Mensagens de sistema cobrem proposta/aceite/recusa/WhatsApp, mas **não** cobrem mudança de status crítica (cancelado, saiu para entrega, entregue, precisa de mais referência). Hoje só geram notificação.

## Mudanças propostas (consolidação)

### 1. `OrderChat.tsx` — props adicionais (não-quebra)
- `title?: string` → renderiza no header (default mantém "Chat do Pedido").
- `quickReplies?: string[]` → menu suspenso "Mensagens rápidas" acima do input, só aparece quando passado (loja).
- `disabled?: boolean` + `disabledMessage?: string` → quando pedido finalizado, esconde input e mostra aviso amigável; histórico continua visível.

### 2. Páginas — passar as novas props
- Cliente (`MinhaConta.tsx`, `PedidoCliente.tsx`): `title="Conversa com a loja"`, `disabled` se `status ∈ {delivered, canceled_*, not_completed}` com aviso de ticket.
- Loja (`minha-loja/pedidos/PedidoDetalhes.tsx`): `title="Conversa com o cliente"`, `quickReplies={STORE_QUICK_REPLIES}` (lista do spec), mesmo `disabled` para finalizados (mas loja ainda pode mandar — manter habilitado).

### 3. Trigger `order_status_change_system_message`
Após `UPDATE` em `orders` quando `status` mudar, inserir uma linha em `order_messages` com `sender_type='system'` para os status relevantes:
- `canceled_by_business` → "Pedido cancelado pela loja."
- `canceled_by_customer` → "Pedido cancelado pelo cliente."
- `out_for_delivery` → "Pedido saiu para entrega."
- `delivered` → "Pedido entregue."
- `needs_more_reference` → "Loja solicitou mais informações ou referência para entrega."

`SECURITY DEFINER`, sem mudar lógica de status nem RLS.

## Fora do escopo
- Tabela nova, hook novo, componente novo.
- Refatorar checkout, carrinho, produtos, referências visuais, motoboys, painel admin.
- Mudar policies de `order_messages` (já validadas).
- Push/SMS.

## Arquivos a alterar
- `src/components/OrderChat.tsx` (props opcionais)
- `src/pages/MinhaConta.tsx`, `src/pages/PedidoCliente.tsx`, `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx` (passar props)
- 1 migration SQL (trigger de mensagens de sistema por status)
