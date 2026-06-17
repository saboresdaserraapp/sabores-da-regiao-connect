## Objetivo
Revisão final (sem nova feature): auditar RLS e separação dos três canais de comunicação e aplicar somente correções pontuais se algo estiver frouxo.

## Resultado da auditoria atual

### order_messages — OK
- SELECT/INSERT/UPDATE usam `user_is_order_customer(order_id, uid)` e `user_owns_order_establishment(order_id, uid)`.
- Cliente A não vê pedido de B; loja A não vê pedido de loja B; admin **não** vê (não está no escopo).

### support_chats / support_chat_messages — OK
- Chat: dono (`user_id = auth.uid()`) ou admin; INSERT exige `user_id = auth.uid()`.
- Messages: SELECT/INSERT amarrados ao mesmo dono ou admin.
- Tabelas distintas das do pedido — não há cruzamento.

### support_tickets / support_ticket_messages / support_ticket_attachments — OK
- Tickets: opener, membros do estabelecimento (via `user_role_in_establishment`), admins.
- Messages: admin vê tudo; usuário comum vê apenas `is_internal_note = false` dos próprios tickets; INSERT de nota interna restrito a admin.
- Attachments: dono/admin/membro do estabelecimento.

### notifications — OK
- SELECT/UPDATE apenas `user_id = auth.uid()`.
- **Sem política de INSERT** → clientes não inserem; apenas triggers `SECURITY DEFINER`. Correto.

### Roteamento de notificações — OK
- Tipos separados (`order_chat_message`, `support_chat_*`, `support_ticket_*`); `related_order_id`, `related_support_chat_id`, `related_ticket_id` populados pelos triggers.

## Pequenas correções propostas (defensivas)

1. **`support_chats` UPDATE pelo dono** hoje permite alterar qualquer coluna (ex.: o próprio dono fechar o chat ou trocar `claimed_by`). Restringir a UPDATE somente das colunas `subject`, `category` via trigger `protect_support_chat_columns()` que reverte campos privilegiados (`status`, `claimed_by`, `claimed_at`, `user_id`, `establishment_id`) quando o ator não é admin.

2. **`support_tickets` UPDATE pelo opener** idem: trigger `protect_support_ticket_columns()` reverte `status`, `assigned_admin_id`, `priority`, `category`, `opened_by`, `establishment_id`, `order_id` para não-admins; deixa o opener mudar só `subject`/`description` enquanto `status='open'`.

3. **`notifications`**: adicionar política INSERT explícita `WITH CHECK (false)` para `authenticated`/`anon`, deixando inserts somente via funções `SECURITY DEFINER`. Documenta a intenção.

4. **Documentação**: criar `mem://security/communication-channels` registrando o modelo (três canais, sem cruzamento, RLS por dono/membro/admin) para futuras auditorias.

## Testes de verificação (SQL via supabase--read_query, sem alterar dados)

Executar como `auth.uid()` simulado de dois usuários distintos para confirmar:
- Cliente B retorna 0 linhas em `order_messages` de pedido do Cliente A.
- Loja B retorna 0 linhas em `order_messages` de pedido da Loja A.
- Cliente B retorna 0 linhas em `support_chats`/`support_chat_messages` de outro cliente.
- Lojista B retorna 0 tickets do estabelecimento do Lojista A.
- Usuário comum retorna 0 mensagens com `is_internal_note = true`.
- Notificações de um usuário não aparecem para outro.

Reportar a tabela final de resultados.

## Fora do escopo
- Refatorar tabelas, mudar nomes, mexer em chat do pedido, suporte ou tickets já funcionais.
- Migrar `notifications` para tabela nova.
- Mudanças de UI.

## Arquivos a alterar
- 1 migration SQL (3 hardenings + comentários).
- `mem://security/communication-channels` (documentação).
