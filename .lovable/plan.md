## Diagnóstico do que já existe

**Backend (já pronto):**
- `establishment_delivery_settings`: modelo (`to_confirm | fixed | by_region | by_region_manual | free | no_delivery | pickup_only | dine_in_only`), flags `delivery_v2_enabled`, `always_confirm_by_whatsapp`, mensagens.
- `delivery_regions`: nome, `fee`, `estimated_time`, `status` (ativo/inativo/nao_atendida), `requires_manual_confirmation`, `public_note`.
- `orders.delivery_fee`, `delivery_fee_estimated`, `total_estimated`, `final_total`, `establishment_reply`.
- `checkout_delivery_info`: snapshot da região escolhida no checkout.

**Frontend (parcialmente pronto):**
- `Checkout.tsx` já usa V2 quando `delivery_v2_enabled=true`, lista regiões e calcula taxa. Só funciona com seleção manual — não há auto-detecção pelo bairro digitado, não há pedido mínimo, não respeita `delivery_model` (`fixed`/`free`/`to_confirm`), e quando V2 está off cai numa "taxa única do estabelecimento" sem usar nada do `delivery_settings`.
- `minha-loja/painel/Entrega.tsx` está 100% MOCK — o lojista hoje não consegue cadastrar regiões nem mudar o modelo de entrega pela própria loja.
- `pedidos/PedidoDetalhes.tsx` (visão do lojista) mostra a taxa estimada, mas **não permite o dono confirmar/ajustar** a `delivery_fee` e gerar `final_total`.

## O que será feito

### 1. Painel do lojista — `minha-loja/painel/Entrega.tsx` (reescrever)
Substituir o mock por um editor real ligado a `useDeliverySettings` / `useDeliveryRegions` / `useDeliveryMutations`:
- Escolher `delivery_model` (radio: a confirmar / fixa / por região / por região com confirmação / grátis / sem entrega).
- Toggle `delivery_v2_enabled` e `always_confirm_by_whatsapp`.
- Campo "taxa fixa" quando modelo = `fixed` (grava em `establishments.delivery_fee`).
- CRUD de regiões: nome, taxa, tempo estimado, pedido mínimo (novo campo), nota pública, "exige confirmação manual", status. Reaproveita `delivery_regions` com migration que adiciona `min_order_value numeric default 0`.
- Mensagens default ("fora da área", "mensagem padrão").
- Respeita gating de plano via `Gated`/`canUseFeature`.

### 2. Migration — pedido mínimo por região
- `ALTER TABLE delivery_regions ADD COLUMN min_order_value numeric NOT NULL DEFAULT 0;`
- (já tem GRANT/RLS — sem novas policies)

### 3. Checkout — `src/pages/Checkout.tsx` + novo `src/lib/deliveryFee.ts`
Criar função pura `resolveDeliveryFee({ settings, regions, address, subtotal, manualRegionId })` que retorna `{ fee, status, regionMatched, manual, blocked, notice, minOrderValue, missingForMin }`. Regra de cruzamento (ordem):
1. `delivery_model = no_delivery / pickup_only / dine_in_only` → bloqueia entrega.
2. `free` → fee 0.
3. `fixed` → `establishments.delivery_fee`.
4. `by_region` / `by_region_manual` / `v2`:
   a. Se usuário escolheu região manualmente → usa.
   b. Senão, **auto-match**: normaliza (`unaccent + lowercase + trim`) `address.neighborhood` e o `popular_location_name` e compara com `regions[].name`; primeiro match define a região.
   c. Sem match → status `to_confirm` com aviso "sua região não está cadastrada".
   d. Se `region.status = 'nao_atendida'` → bloqueia.
   e. Se `subtotal < region.min_order_value` → mostra "faltam R$ X para o mínimo desta região"; impede envio.
   f. `requires_manual_confirmation` ou `always_confirm_by_whatsapp` → marca `manual=true` (taxa exibida como "estimada, a confirmar").
5. `to_confirm` → fee null, sempre manual.

No Checkout:
- Sempre passar pelo `resolveDeliveryFee` (também quando V2=off, usando `delivery_model`).
- Auto-selecionar a região assim que `data.neighborhood` casar.
- Mostrar `min_order_value` faltante e bloquear envio.
- Mostrar bandeira "Taxa estimada — confirmação pelo WhatsApp" quando `manual`.

### 4. Painel de pedidos — `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx`
Adicionar bloco "Confirmar taxa de entrega" quando o pedido está pendente:
- Input para `delivery_fee` (pré-preenchido com `delivery_fee_estimated`).
- Botão "Usar valor calculado pelo app" / "Informar valor manual".
- Campo opcional `establishment_reply` (mensagem para o cliente).
- Ao salvar: `update orders set delivery_fee=?, final_total = subtotal + ?, establishment_reply=?` — dispara realtime que já está ativo, então cliente vê em `/pedido/:code` e em `MinhaConta` o total confirmado.

### 5. Tracking do cliente — `src/pages/PedidoTracking.tsx` e `minha-conta/PedidoDetalhes.tsx`
Pequeno ajuste visual: quando `final_total` existe, mostrar "Total confirmado pela loja" destacado vs "Total estimado".

### 6. Mensagem do WhatsApp — `src/lib/whatsapp.ts`
Inclui região detectada, taxa (ou "a confirmar"), pedido mínimo da região, e link para o pedido onde a loja pode confirmar o valor.

## Detalhes técnicos

- Nenhuma alteração em RLS/policies além da nova coluna.
- `resolveDeliveryFee` 100% pura → fácil de testar (adicionar `src/tests/deliveryFee.test.ts`).
- Auto-match usa a mesma `unaccent_safe` normalização do Postgres feita em JS.
- Realtime de `orders` já habilitado em rodada anterior — basta o update do dono propagar.

## Não vai mudar

- Cálculo por distância em km não é implementado nesta rodada (não há lat/lng no endereço hoje). Mantemos só nome de bairro/região + taxa fixa, que é a estratégia já vigente. Posso adicionar geo numa próxima rodada se quiser.
- Não vou tocar fluxos não relacionados (cardápio, mídia, admin).