## Auditoria — tudo já está implementado

| Fase | Item | Local | Status |
|---|---|---|---|
| 0 | Tabela `notifications` com `related_order_id`, `related_establishment_id`, `type`, `read_at` | migration anterior | OK |
| 1 | Notificação para o cliente quando a loja envia mensagem (`type=order_chat_message`, `related_order_id`, ignora próprio remetente) | trigger `handle_new_order_message_notification` | OK |
| 2 | Selo "Nova mensagem" + contador no card e filtro "Com mensagens não lidas" no painel da loja | `src/pages/minha-loja/painel/Pedidos.tsx` (linhas 82, 180–199, 318–328) usando `useOrderUnreadCountsForBusiness` | OK |
| 2 | `markAsRead` automático ao abrir o chat | `OrderChat` chama `markAsRead` no `useEffect` | OK |
| 3 | Filtro "Com mensagens não lidas" (`onlyUnread`) | já presente no painel | OK |
| 4 | Sininho roteando `order_chat_message` → `/minha-conta/pedidos/:related_order_id` (ou rota da loja quando o dono é membro do estabelecimento) e marcando como lida | `NotificationCenter.tsx` (`routeFor` + `handleClick`) | OK |
| 5 | Nunca notifica o próprio remetente / mensagem vazia | trigger checa `v_recipient_id <> NEW.sender_user_id`; `INSERT` de `order_messages` exige `message NOT NULL` | OK |
| 6 | RLS: cliente só vê próprias notificações (`user_id = auth.uid()`); INSERT bloqueado para clientes; `order_messages` escopadas a cliente/loja | auditoria anterior | OK |

## Pequenos polimentos propostos (opcionais, baixo risco)

1. **Sininho — botão "Ver pedido" explícito e estado vazio**: quando `type=order_chat_message` e `related_order_id` ausente, mostrar texto "Pedido não disponível" no lugar do click handler. Atualmente o clique simplesmente não navega; o aprimoramento deixa a intenção visível.
2. **Texto da notificação**: o trigger hoje gera `'Nova mensagem - Pedido SDS-XXXX'` + trecho da mensagem. Spec sugere título fixo "Nova mensagem sobre seu pedido" e corpo "A loja enviou uma mensagem sobre seu pedido." Atualizar o trigger para usar exatamente esse texto quando a mensagem vier da loja, mantendo o atual quando vier do cliente (para a loja).

## Fora do escopo
Checkout, carrinho, produtos, motoboys, referências visuais, painel admin, página inicial. Sem nova tabela, sem novo componente, sem novo hook.

## Arquivos a alterar
- 1 migration (texto fixo do trigger).
- `src/components/NotificationCenter.tsx` (estado vazio "Pedido não disponível" + label "Ver pedido" em itens de pedido).
