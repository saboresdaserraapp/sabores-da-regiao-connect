## Auditoria (Fase 0)

Tudo que a especificação pede **já existe** no projeto. Nada novo precisa ser criado.

### Tabelas existentes (não duplicar)
- `support_tickets` — possui `subject, description, category, priority, status, opened_by, opened_by_role, establishment_id, order_id, assigned_admin_id, resolved_at, closed_at, last_message_at`.
- `support_ticket_messages` — possui `ticket_id, sender_id, sender_role, message, attachments (jsonb), is_internal_note`.
- `support_ticket_attachments` — já existe.
- `notifications` — já possui `related_ticket_id`, `related_order_id`, `related_support_chat_id`.

### Funções/triggers existentes
- `handle_support_ticket_message` (gera notificação para admin/usuário, ignora `is_internal_note`, transiciona status).
- `handle_support_ticket_status_change` (notifica `opened_by` com tipo `support_ticket_status_changed`).
- `protect_support_ticket_columns` (impede alteração indevida de colunas privilegiadas por não-admin).
- RLS já configurada nas 3 tabelas, separando cliente, lojista, admin, e ocultando notas internas.

### Páginas/rotas existentes
- Cliente: `/minha-conta/suporte/tickets` (`SuporteCliente`) e `/minha-conta/suporte/tickets/:ticketId` (`TicketDetalhesCliente`).
- Lojista: `/minha-loja/:establishmentId/suporte/tickets` e `.../:ticketId` (`PainelSuporte`, `PainelTicketDetalhes`).
- Admin: `/admin/suporte/tickets` e `/admin/suporte/tickets/:ticketId` (`AdminTickets`), com abas, filtros, atribuição, nota interna e mudança de status.

### Componentes/hooks existentes
- `NewTicketDialog`, `TicketDetail`, `TicketListItem` em `src/components/support/`.
- `useSupportTickets` já expõe `useCreateTicket` aceitando `order_id`, `establishment_id`, `opened_by_role`, e `useTicket`, `useTicketMessages`, `useSendTicketMessage`, `useUpdateTicketStatus`, `useAssignTicket` etc.
- `NotificationCenter` já roteia `support_ticket_*` para a rota correta (admin/lojista/cliente) usando `related_ticket_id`.

### Separação dos 3 canais (já garantida)
- Chat do Pedido: `order_messages` (apenas loja↔cliente do pedido).
- Suporte Rápido: `support_chats` / `support_chat_messages` (com fila).
- Tickets: `support_tickets` / `support_ticket_messages` (formal, admin↔solicitante).
Nenhuma tela mistura os históricos; cada um usa sua própria tabela e rota.

---

## Única lacuna detectada

Na página `src/pages/PedidoCliente.tsx` o spec pede o botão **"Preciso de ajuda com este pedido"** que ofereça:
1. Falar com a loja (rola para o Chat do Pedido já presente).
2. Abrir reclamação/chamado (cria ticket já vinculado ao pedido).

## Mudança proposta (mínima, só frontend)

**Arquivo único:** `src/pages/PedidoCliente.tsx`

1. Adicionar botão "Preciso de ajuda com este pedido" no cartão do pedido.
2. Ao clicar, abrir um `Dialog` (shadcn já disponível) com duas opções:
   - **"Falar com a loja"** → fecha o dialog e faz scroll até a seção "Mensagens do pedido" (o `OrderChat` continua intacto).
   - **"Abrir reclamação ou chamado"** → reutiliza `useCreateTicket` para criar um ticket com:
     - `opened_by_role: "customer"`
     - `establishment_id: order.establishment_id`
     - `order_id: order.id`
     - `category: "order_problem"`
     - `subject: "Problema no pedido " + (order.tracking_code ?? "")`
     - `priority: "normal"`
     - Depois `navigate("/minha-conta/suporte/tickets/" + ticket.id)`.

Nada mais é alterado: nem RLS, nem migrações, nem outros canais, nem checkout/carrinho/produtos/motoboys.

## Critérios de sucesso (já cobertos)
- Cliente/lojista podem abrir tickets ✓ (rotas existentes)
- Admin responde, atribui, muda status, adiciona nota interna ✓ (`AdminTickets`)
- Notificações `support_ticket_*` funcionam e roteiam corretamente ✓ (`NotificationCenter`)
- Notas internas ocultas de não-admin ✓ (RLS + trigger)
- Canais separados ✓ (tabelas distintas)
- Após esta mudança: integração com pedido (Fase 9) ✓
