## Objetivo
Conectar o sininho (tabela `notifications` já existente) aos três canais: chat do pedido, chat de suporte rápido e tickets — sem duplicar tabelas, sem quebrar fluxos atuais.

## Estado atual (auditado)
- Tabela `public.notifications` já existe com `user_id`, `establishment_id`, `type`, `data jsonb`, `read_at`.
- Triggers já populam notificações:
  - `handle_new_order_message_notification` → tipo `new_order_message` (pedido)
  - `handle_support_chat_message` → `support_chat_reply` / `support_chat_waiting`
  - `handle_support_ticket_created` → `support_ticket_created`
  - `handle_support_ticket_message` → `support_ticket_reply`
- `NotificationCenter.tsx` só roteia pedidos. Suporte/ticket não navegam.

## Mudanças

### 1. Migration (aditiva, idempotente)
- `ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_order_id uuid`, `related_support_chat_id uuid`, `related_ticket_id uuid` (a coluna `establishment_id` já cobre `related_establishment_id`).
- Atualizar as 4 funções de trigger para preencher os novos `related_*` (em paralelo ao `data jsonb`, mantendo retrocompatibilidade). Sem alterar assinatura.
- Adicionar trigger leve `handle_support_ticket_status_change` em `support_tickets` (AFTER UPDATE OF status) → cria notificação `support_ticket_status_changed` para `opened_by`.
- Padronizar tipos novos como aliases conforme spec, **mantendo os antigos** (`new_order_message`, `support_chat_reply`, etc.) para não quebrar nada. O frontend trata ambos.

### 2. Frontend — `src/components/NotificationCenter.tsx`
Roteamento por tipo, marcando como lida ao clicar:

| type | rota |
|---|---|
| `new_order_message` / `order_chat_message` | `/minha-conta/pedidos/:order_id` (cliente) ou `/minha-loja/:est/pedidos/:order_id` (loja, se `establishment_id` presente e usuário for dono) |
| `support_chat_reply` / `support_chat_message` / `support_chat_assigned` / `support_chat_closed` | `/minha-conta/suporte/chat` (cliente) ou `/minha-loja/:est/suporte/chat` (loja) |
| `support_chat_waiting` | `/admin/suporte/chats` |
| `support_ticket_created` | `/admin/suporte/tickets/:ticket_id` |
| `support_ticket_reply` / `support_ticket_status_changed` | `/minha-conta/suporte/tickets/:ticket_id` (cliente) ou `/minha-loja/:est/suporte/tickets/:ticket_id` (loja) ou `/admin/suporte/tickets/:ticket_id` (admin) |

Determinar contexto cliente/loja/admin: usar `useAuth` + hook `useIsAdmin` existente (se houver) ou checar se `establishment_id` da notificação pertence ao usuário via lista de owners (já há `establishment_owners`). Reaproveitar um hook simples `useMyEstablishmentIds()` para decidir entre rota loja vs cliente.

### 3. Ícones por tipo
Adicionar ícones distintos (`MessageSquare` chat pedido, `LifeBuoy` suporte chat, `Ticket` tickets).

## Fora do escopo
- Nova tabela de notificações.
- Push/email/realtime adicional.
- Mudança nas tabelas `support_*`, `orders`, `order_messages`.
- UI de preferências de notificação.

## Arquivos a alterar
- nova migration SQL
- `src/components/NotificationCenter.tsx`
- novo `src/hooks/useMyEstablishmentIds.ts` (pequeno)
