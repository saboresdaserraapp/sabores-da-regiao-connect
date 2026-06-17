# Plano — Chat de Suporte Rápido (consolidação)

## Auditoria (Fase 0) — já existe tudo

- Tabelas: `support_chats`, `support_chat_messages`, `notifications` (com `related_support_chat_id`).
- Hook: `src/hooks/useSupportChat.ts` (`useMyOpenChat`, `useOpenChat`, `useChatMessages`, `useSendMessage`, `useClaimChat`, `useCloseChat`, `useAdminChats`).
- Componentes: `components/support/ChatPanel.tsx`, `components/support/SupportChatWidget.tsx`.
- Páginas: `pages/SuporteChatCliente.tsx` (cliente), `pages/minha-loja/painel/SuporteChat.tsx` (lojista), `pages/admin/Suporte.tsx` (admin).
- Rotas (App.tsx): `/minha-conta/suporte/chat`, `/admin/suporte`, `/admin/suporte/chats`; lojista via painel da loja.
- Trigger `handle_support_chat_message` já gera notificações (`support_chat_message`, `support_chat_waiting`).
- RLS já existente nas 3 tabelas; coluna `claimed_by` e função `claim_support_chat` já presentes.

**Conclusão:** não criar tabelas novas (o spec pede `requester_*`/`queue_position`, mas o equivalente existente cobre os requisitos — duplicar quebraria hook, RLS e trigger). Apenas pequenos ajustes de UX e roteamento de notificação.

## Mudanças mínimas

### 1. Rota do lojista para suporte (App.tsx)
Adicionar rota explícita `/minha-loja/:establishmentId/suporte/chat` apontando para `PainelSuporteChat` (já existe a página, falta entrada direta para o link da notificação). Mantém rota antiga se já existir dentro do painel.

### 2. Roteamento da notificação (NotificationCenter.tsx)
Para `type === "support_chat_message"`:
- se `establishment_id` presente → `/minha-loja/:establishment_id/suporte/chat`
- senão → `/minha-conta/suporte/chat`
Botão "Abrir suporte". Sem `null/undefined`.

### 3. Posição na fila (UI)
No `SuporteChatCliente.tsx` e `painel/SuporteChat.tsx`, quando `chat.status === "waiting"`, mostrar "Você está na fila. Posição: N" calculando localmente via `useAdminChats`-equivalente público: criar pequeno helper `useMyQueuePosition(chatId)` no `useSupportChat.ts` que faz `select count` em `support_chats` com `status=waiting` e `created_at <= meu.created_at`. RLS atual permite o usuário ver apenas o próprio chat — então usar RPC `support_queue_position(_chat_id uuid)` (SECURITY DEFINER) que retorna inteiro.

### 4. Migration enxuta
- Função `public.support_queue_position(_chat_id uuid) returns int` security definer, search_path `public`, valida que o chamador é o dono do chat **ou** admin.
- Nada mais (sem novas tabelas/colunas; trigger e RLS permanecem).

### 5. Mensagens de sistema (opcional, leve)
No `useClaimChat`, após reivindicar, inserir `support_chat_messages` com `sender_role='admin'` e texto "Um atendente iniciou o atendimento." — sem alterar schema.

## Fora de escopo
Chat do Pedido, tickets, checkout, carrinho, produtos, pedidos, motoboys, referências visuais, RLS global, qualquer renomeação de coluna ou nova tabela.

## Arquivos a alterar
- `src/App.tsx` (1 rota)
- `src/components/NotificationCenter.tsx` (routeFor support_chat_message)
- `src/hooks/useSupportChat.ts` (hook de posição + msg de sistema no claim)
- `src/pages/SuporteChatCliente.tsx` e `src/pages/minha-loja/painel/SuporteChat.tsx` (exibir posição)
- 1 migration nova com a função `support_queue_position`
