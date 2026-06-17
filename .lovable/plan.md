# Plano — Chat do Pedido (consolidação)

## Auditoria (o que já existe)

- **Tabela `public.order_messages`** já existe com todos os campos do escopo (id, order_id, establishment_id, customer_user_id, sender_user_id, sender_type, message, read_at, created_at). **Não criar tabela nova.**
- **Componente `src/components/OrderChat.tsx`** já existe (sistema/cliente/loja, timestamps, estados loading/erro, botão atualizar). **Reutilizar.**
- **Hook `src/hooks/useOrderMessages.ts`** já existe (query + mutation + notificação). **Reutilizar.**
- **Integração**: já usado em `MinhaConta.tsx` (cliente) e `minha-loja/pedidos/PedidoDetalhes.tsx` (loja).
- **Realtime**: `order_messages` já está em `supabase_realtime`.
- **Mensagens de sistema**: já são geradas pelas RPCs `accept_order_proposal` / `reject_order_proposal` e devem continuar sendo inseridas pelos fluxos já existentes (proposta, cancelamento etc.) — sem alterações.

## Problemas encontrados

1. **RLS de INSERT quebrada para a loja.** A policy `"Users can insert messages to their own orders"` tem subquery inválida:
   ```
   o.establishment_id IN (SELECT id FROM establishments WHERE o.user_id = auth.uid())
   ```
   A condição não filtra `establishments` por dono — só funciona para o cliente. Resultado: a loja não consegue enviar mensagem.
2. **Duas SELECT policies sobrepostas** (uma correta usando `can_user_access_order` + owner, outra com o mesmo bug acima). A duplicada é redundante e confusa.
3. **Falta UPDATE policy** para marcar `read_at` (mensagens como lidas).
4. **Realtime não está ativo no hook** — só refetch manual.

## Mudanças propostas

### 1. Migração SQL (corrigir RLS, sem mexer em estrutura)

- DROP das duas policies bugadas.
- CREATE de policies limpas:
  - **SELECT**: cliente dono do pedido OU owner/membro do estabelecimento dono do pedido (via `establishment_owners` / `establishments.owner_id`). Admin não tem acesso.
  - **INSERT WITH CHECK**: mesma regra acima + `sender_user_id = auth.uid()` + `order_id` pertence ao escopo do remetente + coerência `sender_type` (`customer` só se `auth.uid() = orders.user_id`; `business` só se for membro/owner do `establishment_id` do pedido; `system` bloqueado no client).
  - **UPDATE**: permitir setar `read_at` apenas pelo destinatário (não o próprio remetente), restrito às mesmas pessoas do SELECT.
- Garantir `GRANT SELECT, INSERT, UPDATE ON public.order_messages TO authenticated`.

### 2. Hook `useOrderMessages.ts`

- Adicionar subscription Realtime (`postgres_changes` em `order_messages` filtrado por `order_id`) dentro de `useEffect`, invalidando a query no INSERT/UPDATE.
- Adicionar `markAsRead` mutation (UPDATE `read_at = now()` para mensagens onde `sender_user_id <> user.id` e `read_at is null`).
- Não inserir mais notificação no client (já existe trigger `handle_new_order_message_notification`). Remover esse bloco para evitar notificação duplicada.
- Tipar retorno para evitar `null`/`undefined`/`[object Object]` nos campos exibidos (fallback de string vazia onde aplicável).

### 3. Componente `OrderChat.tsx`

- Chamar `markAsRead` ao montar / quando novas mensagens chegam para o destinatário.
- Pequenos ajustes defensivos: `m.message ?? ""`, `m.created_at ? format(...) : ""`.
- Sem mudanças visuais relevantes.

## Fora de escopo (não tocar)

Checkout, carrinho, produtos, motoboys, painel admin, referências visuais, suporte/tickets, demais páginas.

## Critérios de aceite

- Cliente e loja conversam dentro do pedido; histórico isolado por `order_id`.
- Loja A não vê chat da Loja B; Cliente A não vê de Cliente B (validado pelas novas policies).
- Mensagens de sistema (proposta enviada/aceita/recusada, confirmação, cancelamento) continuam aparecendo via fluxos atuais.
- Pedido sem mensagens abre normalmente; nenhum `null`/`undefined`/`[object Object]` exibido.
- Realtime atualiza a conversa sem refresh; botão "Atualizar" segue como fallback.
