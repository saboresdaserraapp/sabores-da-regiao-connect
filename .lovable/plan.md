## Auditoria
Tudo o que o enunciado pede já existe na maior parte. Sem tabela nova.

**Já existe:**
- Tabelas `support_chats` (`status: waiting/active/closed`, `user_id`, `establishment_id`, `claimed_by/at`, `closed_at`, `last_message_at`) e `support_chat_messages` (`sender_role: requester/admin/system`), com RLS por dono/admin, Realtime habilitado e trigger `handle_support_chat_message` que notifica a outra ponta no sininho.
- Hooks: `useMyOpenChat`, `useAdminChats`, `useChatMessages`, `useSendChatMessage`, `useCloseMyChat`, RPC `claim_support_chat`.
- Componentes: `ChatPanel`, `SupportChatWidget`.
- Páginas: `/minha-conta/suporte` (cliente) e `/admin/suporte` (admin) — funcionais.

**Decisão:** não recriar tabela com nomes diferentes (`requester_user_id`, `priority`, `queue_position`, etc.). Os campos pedidos são redundantes para o escopo do "chat rápido com fila simples". `queue_position` será **calculado em tempo de leitura**, não persistido (evita drift). Não adicionar `priority` agora — usuário disse "fila simples".

## Mudanças

### 1. Rotas (apenas aliases — não quebrar as antigas)
- Adicionar em `src/App.tsx`:
  - `/minha-conta/suporte/chat` → `SuporteCliente` (alias da `/minha-conta/suporte`).
  - `/admin/suporte/chats` → `AdminSuporte` (alias da `/admin/suporte`).
  - `/minha-loja/:establishmentId/suporte/chat` → nova página fina `SuporteLojaChat` que renderiza `ChatPanel` no contexto do estabelecimento ativo (reusa o mesmo hook do cliente; `establishment_id` é gravado em `support_chats` no momento do `open`).

### 2. Posição na fila (cliente)
- Novo hook `useChatQueuePosition(chatId)` em `src/hooks/useSupportChat.ts`:
  - Conta `support_chats` com `status='waiting'` e `created_at <= meu created_at`.
  - Realtime: invalida ao mudar qualquer `support_chats` (canal já em uso).
- `ChatPanel`/`SupportChatWidget`: quando `status='waiting'`, exibir:
  - "Você entrou na fila de atendimento. Aguarde um instante."
  - "Sua posição: N°{posição}".
  - Render defensivo (`?? "—"`).

### 3. Página da loja
- `src/pages/minha-loja/painel/SuporteChat.tsx`: usa `useActiveEstablishment` para passar `establishmentId` ao abrir o chat (`useOpenChat({ establishmentId })`). Sem novos hooks de backend.

### 4. Mensagem de sistema ao aceitar
- Já há trigger `handle_support_chat_message` para notificações. Adicionar pequena chamada no fluxo de `claim_support_chat` na UI: após RPC bem-sucedido, inserir uma mensagem `sender_role='system'` "Atendimento iniciado por {agente}". Sem mudar a função SQL.

### 5. Defesa contra `null/undefined/[object Object]`
- Revisar `ChatPanel` e widget: `m.message ?? ""`, `m.created_at ? format(...) : ""`, ignorar mensagens vazias.

## Fora de escopo
- Tickets, chat do pedido, painel admin (além da rota alias), notificações (já tratadas), prioridade, anexos, transferência de atendimento entre agentes, novos campos em tabelas existentes.

## Testes manuais
1. Cliente abre `/minha-conta/suporte/chat` → registro em `support_chats` com `status='waiting'`, vê "posição N°X".
2. Admin abre `/admin/suporte/chats` → vê o chat na fila.
3. Admin aceita → `status='active'`, `claimed_by/at` preenchidos, mensagem do sistema visível em ambos os lados.
4. Mensagens trocam em tempo real (Realtime já ativo).
5. Admin/cliente encerra → `status='closed'`, `closed_at` preenchido, histórico continua visível.
6. Outra loja/cliente não vê chats alheios — RLS atual já garante.
7. Chat do pedido (`order_messages`) inalterado.
