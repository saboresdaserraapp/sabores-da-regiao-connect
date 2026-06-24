## Auditoria

| Demanda | Situação atual | Ação |
|---|---|---|
| Timeline em /pedido/:code com status + eventos | `PedidoTrackingPublic` já tem `OrderStatusStepper` (status) e bloco "Resposta do estabelecimento". Não há lista cronológica de eventos (status_history + order_messages do tipo `system`), nem mensagem explicativa do estágio inicial. | **Adicionar** componente `OrderEventsTimeline` que combina `orders.status_history` (jsonb) + mensagens `system` de `order_messages`, com texto guia para o estado atual (ex.: "Aguarde o estabelecimento confirmar disponibilidade, prazo e valor final"). |
| Reenviar WhatsApp sem duplicar eventos | Hoje `handleResendWhatsapp` só abre `wa.me`. Não há gravação adicional → **já não duplica** status nem mensagens. Único risco: a primeira gravação `whatsapp_message` poderia ser sobrescrita. | **Garantir idempotência**: não chamar `update orders.whatsapp_message` no reenvio, registrar apenas um marcador leve (campo `whatsapp_resent_count` + `last_whatsapp_sent_at`) via RPC dedicada, sem inserir em `order_messages`/`status_history`. |
| Snapshot no banco incluir whatsapp / whatsappMessage / trackingUrl, e /pedido/:code carregar os mesmos dados da confirmação | Snapshot em memória já tem os três campos. No banco: `orders.whatsapp_message` já é salvo; `orders.items/subtotal/delivery_fee/total/tracking_code` também. Falta persistir `whatsapp` do estabelecimento de forma estável (hoje vem por JOIN, que já funciona via `get_order_by_tracking → establishment_whatsapp`) e `trackingUrl` (derivável de `tracking_code + origin`). | **Não precisa migração**: derivar `trackingUrl` no cliente e usar `establishment_whatsapp + whatsapp_message` da RPC para reconstruir o mesmo snapshot. Pequeno reforço: garantir que `Checkout` use exatamente o mesmo cálculo de `items/subtotal/total` salvo (já usa). Documentar no hook `useOrderTracking` o mapeamento. |
| Testes (unit + 1 E2E) para Copiar link, Compartilhar e Reenviar WhatsApp | Não existem testes para `ConfirmationScreen`. | **Adicionar** suite unit (`Checkout.confirmation.test.tsx`) e um E2E (`tests/e2e/checkout-confirmation-actions.spec.ts`). |

## O que muda

### 1. Timeline em /pedido/:code

**Novo componente** `src/components/orders/OrderEventsTimeline.tsx`:
- Recebe `order` (com `status`, `status_history`, `confirmation_flow_status`, `establishment_reply`, `final_total`, `estimated_minutes`).
- Busca `order_messages` onde `sender_type='system'` (público via RPC nova `get_order_public_events(_code text)` — `security definer`, retorna apenas mensagens system + status_history, sem dados sensíveis).
- Mescla por timestamp, renderiza lista vertical com ícone + label + horário + texto-guia.
- Mensagens-guia por status:
  - `waiting_business_confirmation` → "Aguarde o estabelecimento confirmar disponibilidade, prazo e valor final."
  - `confirmed_by_business` → "Pedido confirmado. Preparando em breve."
  - `preparing` → "Cozinha em ação."
  - `ready_for_pickup` / `out_for_delivery` / `delivered` → textos correspondentes.

**Edit** `src/pages/PedidoTrackingPublic.tsx`: inserir `<OrderEventsTimeline order={order} />` logo abaixo do stepper.

**Migração** nova: RPC `get_order_public_events(_code text)` retornando `jsonb[]` de eventos.

### 2. Reenviar WhatsApp idempotente

**Migração**: adicionar em `orders`:
- `whatsapp_resent_count integer not null default 0`
- `last_whatsapp_sent_at timestamptz`

**RPC** `register_whatsapp_resend(_code text)` (security definer, sem auth → match por `tracking_code`):
- Incrementa contador e seta timestamp.
- **Não** insere em `order_messages` nem altera `status_history`.

**Edit** `ConfirmationScreen.handleResendWhatsapp`:
- Chama `supabase.rpc("register_whatsapp_resend", { _code })` antes de abrir `wa.me`.
- Mostra toast "Mensagem reaberta no WhatsApp".

### 3. Snapshot consistente

**Edit** `Checkout.tsx` — sem mudança de schema:
- Confirmar que `snapshot.items/subtotal/total/deliveryFee` vêm das mesmas variáveis salvas em `orders.insert(...)`.
- Derivar `trackingUrl` igual em `PedidoTrackingPublic` (via `window.location.origin + /pedido/ + tracking_code`) para o botão "Copiar link" também aparecer lá (reuso do mesmo componente de actions — pequeno cartão `TrackingShareActions`).

**Novo componente** `src/components/orders/TrackingShareActions.tsx` (reuso entre Checkout confirm e /pedido/:code): Copiar código, Copiar link, Compartilhar, Reenviar WhatsApp. Recebe `{ trackingCode, trackingUrl, whatsapp, whatsappMessage }`. `ConfirmationScreen` e `PedidoTrackingPublic` passam a usá-lo.

### 4. Testes

**Unit** `src/pages/__tests__/CheckoutConfirmation.test.tsx`:
- Renderiza `ConfirmationScreen` com snapshot fake.
- Mocka `navigator.clipboard.writeText` e `navigator.share`.
- Mocka `window.open`.
- Cenários:
  - clicar "Copiar link" → `writeText(trackingUrl)`, toast e badge "Link copiado".
  - clicar "Compartilhar" com `navigator.share` disponível → chama `share` com `{title,text,url}`.
  - clicar "Compartilhar" sem `share` → fallback para `writeText`.
  - clicar "Reenviar pelo WhatsApp" → `window.open` com URL `wa.me/<num>?text=<encoded>` e supabase rpc `register_whatsapp_resend` chamada uma vez.

**E2E** `tests/e2e/checkout-confirmation-actions.spec.ts`:
- Stub do estado de confirmação via rota dedicada de teste OU navegação real curta:
  - Servir `/checkout/<slug>` mockando supabase via interceptação de network? Mais simples: criar pedido real headless (sem auth) usando a mesma RPC pública já existente. Se inviável, usar `window.__setConfirmationForTest__` (helper exposto apenas em `import.meta.env.MODE==='test'`).
- Verifica:
  - Botão Copiar link aciona clipboard (lê `navigator.clipboard.readText`).
  - Botão Compartilhar dispara fallback de cópia quando `navigator.share` não existe (Chromium headless).
  - Botão Reenviar WhatsApp abre nova aba/`window.open` com host `wa.me` (intercepta via `page.context().on('page')`).

### Fora de escopo
- Histórico completo do chat cliente↔loja na timeline pública (privacidade).
- Encurtador de link.
- Persistir snapshot adicional além do já gravado em `orders`.

## Resumo de arquivos

**Novos**
- `src/components/orders/OrderEventsTimeline.tsx`
- `src/components/orders/TrackingShareActions.tsx`
- `src/pages/__tests__/CheckoutConfirmation.test.tsx`
- `tests/e2e/checkout-confirmation-actions.spec.ts`
- 1 migração: colunas `whatsapp_resent_count`, `last_whatsapp_sent_at` + RPCs `register_whatsapp_resend`, `get_order_public_events`.

**Editados**
- `src/pages/Checkout.tsx` (usa `TrackingShareActions`, chama RPC no reenvio)
- `src/pages/PedidoTrackingPublic.tsx` (timeline + share actions)
- `src/hooks/useOrderTracking.ts` (tipos para novos campos, se necessário)
