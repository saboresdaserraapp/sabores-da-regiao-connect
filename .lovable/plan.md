## Auditoria
Quase tudo já existe e não será duplicado.

**Já existe:**
- Tabelas `support_tickets` (com `subject`, `description`, `category`, `priority`, `status`, `opened_by/role`, `establishment_id`, `order_id`, `assigned_admin_id`, `resolved_at`, `closed_at`, `last_message_at`), `support_ticket_messages` (com `attachments` jsonb) e `support_ticket_attachments`. RLS por dono/admin/membros do estabelecimento. Trigger de notificação ao criar/responder.
- Hook `useSupportTickets` + `NewTicketDialog` + `TicketDetail`.
- Páginas: `/minha-conta/suporte` (cliente), `/minha-loja/:id/suporte` (loja), `/admin/tickets` (admin) — todas funcionais.
- Bucket `support-attachments` + políticas.

**Decisões:**
- **Não recriar tabelas** com nomes diferentes (`created_by_user_id`, `requester_type`, `related_order_id`, `severity`). Os campos atuais já mapeiam o enunciado:
  - `opened_by` ↔ `created_by_user_id`
  - `opened_by_role` ↔ `requester_type`
  - `establishment_id`/`order_id` ↔ `related_*`
- **`severity` não será adicionado** — `priority` já cobre o caso. Adicionar `severity` agora exigiria refazer UI; fora do critério de sucesso.
- **`category`** atual é enum `support_ticket_category`. Os valores pedidos serão adicionados ao enum se faltarem (ALTER TYPE ADD VALUE IF NOT EXISTS), mantendo retro-compatibilidade.

## Mudanças

### 1. Migração SQL
- `ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS is_internal_note boolean NOT NULL DEFAULT false`.
- Reescrever a policy SELECT de `support_ticket_messages` para **esconder notas internas de não-admin**:
  - admin: vê tudo.
  - opener/membro do estabelecimento: vê apenas `is_internal_note = false`.
- INSERT policy: somente admin pode inserir mensagem com `is_internal_note = true`.
- `ALTER TYPE support_ticket_category ADD VALUE IF NOT EXISTS` para os valores do enunciado que ainda não existirem (`order_problem`, `payment_problem`, `delivery_problem`, `complaint`, `report_establishment`, `report_customer`, `report_content`, `account_problem`, `subscription_problem`, `technical_problem`, `other`).
- Não tocar em `support_tickets` policies (já corretas).

### 2. Rotas (apenas aliases — não quebrar antigas)
- `src/App.tsx`:
  - `/minha-conta/suporte/tickets` → `SuporteCliente` (alias).
  - `/minha-conta/suporte/tickets/:ticketId` → nova página `TicketDetalhesCliente` envolvendo `TicketDetail` em layout com `Header`.
  - `/minha-loja/:establishmentId/suporte/tickets` → `PainelSuporte` (alias).
  - `/minha-loja/:establishmentId/suporte/tickets/:ticketId` → nova página `PainelTicketDetalhes` reusando `TicketDetail`.
  - `/admin/suporte/tickets` → `AdminTickets` (alias da existente `/admin/tickets`).
  - `/admin/suporte/tickets/:ticketId` → `AdminTickets` com seleção pré-aplicada (param via `useParams`).

### 3. UI — notas internas
- `TicketDetail.tsx`:
  - Quando `senderRole === "admin"`: novo toggle "Nota interna" no compositor; ao enviar, gravar `is_internal_note: true`.
  - Render de mensagens: badge "Nota interna" + fundo amarelo quando `is_internal_note`.
  - Cliente/loja: já não recebe via RLS, mas filtrar defensivamente também (`!m.is_internal_note`).
- `AdminTickets.tsx`: garantir que ao abrir com `:ticketId` na URL, o detalhe abra; filtros por status/categoria/prioridade já existem.

### 4. Defesa contra `null/undefined/[object Object]`
- Em `TicketDetail`: `m.message ?? ""`, `m.created_at ? format(...) : ""`, ignorar mensagens vazias.

## Fora de escopo
Chat do pedido, suporte rápido (sem conversão de chat→ticket nesta fase), reescrita de páginas existentes, `severity`, mudanças no painel admin (apenas rota alias + abrir por id).

## Testes manuais
1. Cliente cria ticket em `/minha-conta/suporte/tickets` → notificação ao admin (trigger existente).
2. Admin abre em `/admin/suporte/tickets` → vê e responde.
3. Cliente recebe sininho (trigger `handle_support_ticket_message`).
4. Admin marca "Nota interna" e envia → cliente NÃO vê (RLS bloqueia); outro admin vê.
5. Admin muda status → notificação ao opener (já implementado pelo trigger atual).
6. Ticket aparece só em `/suporte/tickets`, nunca no chat do pedido nem no chat rápido (tabelas distintas).
