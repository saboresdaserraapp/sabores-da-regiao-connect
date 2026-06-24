# Checkout sem conta + Convite pós-entrega

## Objetivo
Permitir que qualquer pessoa finalize uma compra sem estar logada, usando apenas os dados preenchidos no checkout (nome, telefone, endereço). Após a entrega ser concluída, exibir um pop-up convidando para se cadastrar.

## Diagnóstico atual
- `orders` já aceita inserts anônimos (policy `Anyone can create orders`) e `user_id` já é gravado como `null` quando não há sessão. O fluxo de envio em `src/pages/Checkout.tsx` praticamente já roda sem login.
- Pontos que ainda forçam/assumem login no checkout:
  - Endereços vêm de `useAddresses` (tabela protegida) — visitante não tem lista; precisa de fluxo só com formulário.
  - `useHouseReference` e `order_visual_reference_links` exigem `user_id`; para visitante, pular sem quebrar.
  - `useProfile` é usado só para pré-preencher; ignorar se sem usuário.
- Rastreamento pós-pedido: `PedidoTrackingPublic` já existe e funciona via `tracking_code` — visitante consegue acompanhar o status sem login.

## Mudanças

### 1. Checkout liberado para visitantes (`src/pages/Checkout.tsx`)
- Remover qualquer guard implícito: nunca redirecionar para `/auth`.
- Quando `!user`:
  - Não chamar/listar `addresses` salvos; renderizar direto o formulário de endereço (campos já existentes em `data`).
  - Pular gravação de `house_reference` e `order_visual_reference_links` (só salvar quando houver `user_id`).
  - Ignorar `selectedAddressId` (sempre `null`).
- Continuar gravando `customer_name` e `customer_phone` no `orders` (já feito) — base do convite e do rastreio por telefone.
- Após sucesso, redirecionar visitante para a página pública de rastreamento (`/pedido/publico/:tracking_code`) em vez de `/pedido/:id` (que exige sessão).

### 2. Pop-up de convite ao cadastro após entrega
- Local: `src/pages/PedidoTrackingPublic.tsx` (e também `PedidoTracking.tsx` quando o usuário está logado-como-visitante sem conta, mas o foco é o público).
- Disparo: quando o pedido em tela transitar para `status = 'delivered'` E não houver `user` logado.
- Persistência local: marcar `localStorage` com chave `sdr_signup_invite_shown:<tracking_code>` para não repetir.
- Componente novo: `src/components/SignupInviteDialog.tsx` (usa `Dialog` do shadcn) com:
  - Título: "Que tal facilitar suas próximas compras?"
  - Lista curta de diferenciais: histórico de pedidos, favoritos, endereços salvos, acompanhamento em 1 toque, promoções exclusivas.
  - CTA primário: "Criar minha conta" → `/cadastro?prefill_phone=<telefone>&prefill_name=<nome>` (Cadastro lê esses query params para pré-preencher).
  - CTA secundário: "Agora não".
- Pequeno ajuste em `src/pages/Cadastro.tsx` para ler `prefill_phone` / `prefill_name` da URL e popular os campos.

### 3. Sem mudanças de banco
- Policies de `orders` já permitem insert anônimo e leitura por telefone. Nada a migrar.
- Nada de novas tabelas, RLS ou grants.

## Arquivos afetados
- `src/pages/Checkout.tsx` — fluxo visitante + redirect pós-envio.
- `src/pages/PedidoTrackingPublic.tsx` — dispara o pop-up ao detectar entrega.
- `src/components/SignupInviteDialog.tsx` — novo.
- `src/pages/Cadastro.tsx` — pré-preencher via query params.

## Fora do escopo
- Migrar pedidos de visitante para a conta após cadastro (pode ser etapa futura via match por telefone).
- Alterações em favoritos, endereços salvos ou referências visuais para visitantes.
- Testes Playwright adicionais (o existente cobre home; este fluxo pode ser validado manualmente).
