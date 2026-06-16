
# Gestão robusta de pedidos — Auditoria + Plano

## Fase 0 — Relatório de auditoria

### 1. Tabelas já existentes (reutilizar — NÃO criar duplicadas)

| Domínio | Tabela existente | Uso |
|---|---|---|
| Pedidos | `orders` (30 colunas, 8 policies) | reutilizar |
| Itens | armazenados em `orders.items` (jsonb) | manter, não criar `order_items` |
| Histórico de status | `order_status_history` (7 col) e `orders.status_history` jsonb + `events` | reutilizar `order_status_history` |
| Eventos | `events` (11 col) | reutilizar para eventos não-status |
| Chat | `order_messages` (9 col, 3 policies) | reutilizar |
| Notificações | `notifications` (9 col, 2 policies) + função `create_notification` | reutilizar |
| Motoboys | `delivery_drivers` + colunas `assigned_driver_*` em `orders` | reutilizar |
| Referências | `house_references`, `house_reference_media`, `order_reference_share_links`, `order_visual_reference_links` | reutilizar |
| Config entrega | `establishment_delivery_settings` | reutilizar |
| Regiões | `delivery_regions` | reutilizar |
| Marks financeiros | `order_financial_marks` | reutilizar para pagamento |

### 2. Campos já presentes em `orders` (não recriar)
`id, user_id, establishment_id, customer_name, customer_phone, status, subtotal, delivery_fee, delivery_fee_estimated, total, total_estimated, final_total, payment_method, notes, items, address_id, tracking_code, assigned_driver_id, assigned_driver_name, assigned_driver_phone, driver_reference_sent_at, status_history, estimated_minutes, establishment_reply, created_at, updated_at` (+ outras).

### 3. Código já existente (reaproveitar — não duplicar)
- `src/lib/orderStatus.ts` — `INITIAL_ORDER_STATUS`, `normalizeOrderStatus`, `whatsappSentTimestamps`
- `src/lib/whatsapp.ts` — montagem de mensagens
- `src/components/orders/OrderDetailsPanel.tsx`, `OrderReferencesPanel.tsx`, `OrderRow.tsx`, `OrderStatusStepper.tsx`, `CustomerReferencesPanel.tsx`
- `src/components/OrderChat.tsx`, `src/hooks/useOrderMessages.ts`, `useOrderTracking.ts`, `useOrders.ts`, `useNotifications.ts`
- `src/pages/minha-loja/painel/Pedidos.tsx` (lista atual — evoluir, não recriar)
- `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx` (detalhe da loja — evoluir)
- `src/pages/minha-conta/PedidoDetalhes.tsx` (detalhe do cliente — adicionar aceite)
- Trigger DB `handle_order_status_change_notification` já notifica cliente em troca de status

### 4. Rotas confirmadas
`/minha-loja/:establishmentId/pedidos`, `/minha-loja/:establishmentId/pedidos/:orderId`, `/minha-conta/pedidos`, `/minha-conta/pedidos/:orderId`. Mantidas.

### 5. Riscos de duplicidade — evitados
- **NÃO** criar `order_items` (já há `items` jsonb).
- **NÃO** criar `order_events` paralelo: usar `order_status_history` para status e `events` para eventos extras.
- **NÃO** criar componente de chat novo (usar `OrderChat`).
- **NÃO** criar nova lib de WhatsApp (estender `src/lib/whatsapp.ts`).
- **NÃO** alterar trigger de notificação existente — só inserir notificações adicionais para os eventos novos (proposta enviada/aceita/recusada).

### 6. O que está incompleto (alvo deste trabalho)
- Não há mecanismo de **proposta de confirmação** (taxa final / aceite do cliente).
- Painel de pedidos não tem Kanban nem filtros avançados.
- Detalhe da loja não tem ações “Confirmar sem alteração”, “Enviar proposta”, “Registrar aceite WhatsApp”, “Solicitar referência”, “Cliente não respondeu”.
- Cliente não tem card de aceite/recusa.
- Sem mensagens rápidas pré-definidas.
- Sem `payment_status` separado e marca de pago no detalhe.

### 7. Não mexer
Home, busca, produtos, checkout, carrinho, painel admin, cadastro de loja, personalização visual, motoboys (só vínculo), referências (só leitura no pedido).

---

## Alterações de banco (1 migration única, segura)

Tabela nova (não há equivalente):

```text
order_confirmation_proposals
  id, order_id, establishment_id, created_by,
  proposed_subtotal, proposed_delivery_fee, proposed_discount,
  proposed_extra_fee, proposed_total,
  estimated_preparation_time_min, estimated_delivery_time_min,
  business_note, customer_response_note,
  status (draft|sent|accepted|rejected|canceled|expired|superseded),
  sent_at, accepted_at, rejected_at, canceled_at, expires_at,
  created_at, updated_at
```
+ GRANTs, RLS (loja gerencia; cliente só lê/aceita os seus), índice por `order_id`.

Colunas adicionadas a `orders` apenas as que **ainda não existem**:
`final_subtotal, final_discount, final_extra_fee, final_delivery_fee` (nullable),
`business_confirmation_note`, `customer_accepted_proposal_at`, `customer_rejected_proposal_at`,
`confirmed_at`, `current_confirmation_proposal_id` (fk),
`confirmation_flow_status` (text nullable — não substitui `status`),
`payment_status` (text nullable, default `pending`), `paid_at`.

Trigger leve: ao inserir proposta `sent`, marcar anteriores `sent` desta order como `superseded`.

Pedidos antigos: todas as colunas nullable → continuam abrindo.

---

## Fases de implementação

### Fase 1 — Detalhe robusto (loja)
Evoluir `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx`: seções Resumo, Cliente (WhatsApp/chat já existem), Itens, Entrega (com taxa estimada/final/status), Motoboy, Pagamento, Comunicação, Histórico. Fallbacks para campos vazios (sem `null`/`undefined`/`[object Object]`).

### Fase 2 — Modelo de proposta
Migration acima. Helpers em `src/lib/orderProposals.ts` (criar/enviar/aceitar/recusar/superseder).

### Fase 3 — Ações operacionais
Botões no detalhe da loja:
- Confirmar sem alteração → `status=confirmed_by_business`, `confirmation_flow_status=confirmed`, `final_total` = atual.
- Definir taxa e enviar proposta → cria proposta `sent`, `confirmation_flow_status=proposal_sent_to_customer`, mantém `status=waiting_business_confirmation`, mensagem sistema no chat + notificação.
- Solicitar mais referência → mensagem chat + notificação (+ status `needs_more_reference` se enum permitir).
- Cliente não respondeu → `status=customer_not_responding`.
- Cancelar (motivos) → `status=canceled_by_business` + motivo em `business_confirmation_note`.
- Registrar aceite WhatsApp (modal) → marca proposta `accepted`, `status=confirmed_by_business`, mensagem sistema “Aceite registrado pela loja…”.

### Fase 4 — Aceite no app do cliente
Em `src/pages/minha-conta/PedidoDetalhes.tsx`: card destacado quando há proposta `sent`. Botões Aceitar / Recusar / Falar com a loja. Aplica updates listados no briefing dentro de uma única RPC `accept_order_proposal(_proposal_id)` / `reject_order_proposal(_proposal_id, _note)` (security definer com checagem `user_id = auth.uid()`).

### Fase 5 — Central de pedidos (lista + Kanban)
Em `Pedidos.tsx`: toggle Lista/Kanban. Colunas: Novos, Aguardando aceite (`confirmation_flow_status=proposal_sent_to_customer`), Confirmados, Em preparo, Prontos, Saiu, Finalizados, Cancelados. Cards com badges de alerta (taxa a confirmar, proposta aguardando, chat não lido, sem motoboy, tempo parado). Filtros + busca por código/nome/telefone.

### Fase 6 — Mensagens rápidas e WhatsApp
Lista de templates em `src/lib/quickMessages.ts`. Estender `src/lib/whatsapp.ts` com `buildProposalWhatsappMessage(order, proposal, establishment)` usando o template do briefing. Omitir linhas vazias.

### Fase 7 — Histórico e alertas
Reaproveitar `order_status_history` + `events`. Inserir eventos: proposta criada/enviada/aceita/recusada, aceite WhatsApp, taxa alterada, motoboy atribuído, referência enviada, pagamento marcado. Componente de alertas no topo do detalhe e badges nos cards do Kanban (computados client-side a partir de timestamps).

### Fase 8 — Pagamento operacional
Usar nova coluna `payment_status` + `paid_at` e `order_financial_marks` (já existente) para forma recebida/observação/usuário. Botão “Marcar como pago” no detalhe.

### Permissões
Helper `src/lib/orderPermissions.ts` baseado em `user_role_in_establishment` (já existe no DB). RLS das policies novas em `order_confirmation_proposals` garante backend; UI esconde ações.

---

## Detalhes técnicos

- Status técnicos no banco; labels PT em UI via `STATUS_LABEL` central já existente — extrair para `src/lib/orderStatusLabels.ts` para evitar duplicação entre `Pedidos.tsx` e `PedidoDetalhes.tsx`.
- `confirmation_flow_status` é metadado paralelo; nenhum status novo é adicionado ao enum principal.
- Realtime já assinado em pedidos — adicionar canal para `order_confirmation_proposals` no detalhe do cliente.
- Pedidos antigos: ausência de proposta = comportamento atual preservado; detalhe da loja não obriga proposta para confirmar.

## Critérios de sucesso
Auditoria documentada (acima), zero duplicação de tabela/função/componente, pedidos antigos abrem, checkout/carrinho intactos, fluxo de proposta funcional, `status` só vira `confirmed_by_business` após aceite (cliente ou registro manual), histórico completo, Kanban operacional.
