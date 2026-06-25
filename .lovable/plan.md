## Diagnóstico da página vazia

Hoje a rota oficial é `/pedido/:code` (tracking code) e ela já tem 3 modos:
- `PedidoDetalhesLoja` se o usuário logado é dono do `establishment_id`;
- `PedidoCliente` se `orders.user_id = auth.uid()`;
- `PedidoTrackingPublic` (visão pública) para qualquer outro caso, **inclusive quando o usuário não está logado**.

A tela "Pedido não encontrado" do print vem de `PedidoTrackingPublic` em uma destas situações:
1. Usuário acessa link de pedido **sem sessão** → cai no público; se a RPC pública `get_order_by_tracking` não devolver linha (RLS / código inexistente / pedido apagado), mostra o card vazio.
2. Notificação ou botão usou um valor que **não** é `tracking_code` (ex.: `notification.id`, `order.id`, código curto antigo).
3. `RedirectByOrderId` recebeu um `orderId` inválido (notification.id) → `tracking_code` vem `null` → manda para `/minha-conta?tab=pedidos`, mas se o link original já era `/pedido/<id-uuid>` ele cai direto no público sem match.
4. O usuário está em `/auth` (rota inexistente) — não é a página de pedido, é redirect quebrado do login.

A causa raiz para o caso "loja clica em Acompanhar/Detalhes e vê tela vazia" é a linha de `Pedidos.tsx`:
```
<Link to={o.tracking_code ? `/pedido/${o.tracking_code}` : `/minha-loja/.../pedidos/${o.id}`}>
```
Quando `tracking_code` existe, manda para `/pedido/:code`. Se o usuário logado **não** é detectado como dono (ex.: contexto de loja ainda carregando `myEsts`, ou pedido antigo sem `user_id` populado), cai no público "Pedido não encontrado".

## O que muda (mínimo, sem refazer app)

### Fase 0 — Logs temporários + bugfix do roteador
- Em `PedidoTracking.tsx`: enquanto `useMyEstablishmentIds` ainda está carregando, **não** renderizar `PedidoTrackingPublic`; manter `LoadingState`. Só cair no público depois que `myEsts !== undefined` e `resolved.user_id !== user.id` e o usuário não for dono.
- Adicionar `console.debug("[order-route]", { code, userId, resolved, isOwner })` controlado por `import.meta.env.DEV`.
- Em `RedirectByOrderId`: se a query devolver erro/`null`, mostrar `ErrorState` "Pedido não encontrado" com botão "Voltar para pedidos" em vez de redirect silencioso.

### Fase 1 — Rotas oficiais reais (sem quebrar `/pedido/:code`)
Manter `/pedido/:code` como **rota pública compartilhável** (links de WhatsApp já enviados).
Promover as rotas contextuais a páginas reais:
- `/minha-conta/pedidos/:orderId` → novo wrapper `CustomerOrderRoute` que valida `auth.uid()` e renderiza `PedidoCliente` direto (sem redirect para `/pedido/:code`).
- `/minha-loja/:establishmentId/pedidos/:orderId` → novo wrapper `StoreOrderRoute` que valida pertencimento via `useMyEstablishmentIds` e renderiza `PedidoDetalhesLoja` direto.
- `RedirectByOrderId` passa a redirecionar **para a rota contextual correta**, não mais para `/pedido/:code`:
  - dentro de `/minha-loja/...` → `/minha-loja/:estId/pedidos/:orderId` (sem redirect, já é a própria rota).
  - dentro de `/minha-conta/...` → `/minha-conta/pedidos/:orderId` (idem).
- `/pedido/:code` continua existindo e segue resolvendo dono/cliente/público (compatibilidade).

### Fase 2 — Funções de busca
Reaproveitar o que já existe:
- Cliente: `useOrderTracking` (já busca por `orders.id`/tracking). Adicionar variante `useCustomerOrder(orderId)` que filtra por `user_id = auth.uid()`.
- Loja: `PedidoDetalhesLoja` já recebe `orderId` + `establishmentId` e carrega itens, mensagens, propostas, status_history, referências. Garantir que ele exponha estados: carregando, sem permissão, não encontrado, erro, parcial — substituindo qualquer `return null`.

### Fase 3 — Cliques do painel da loja
Em `src/pages/minha-loja/painel/Pedidos.tsx`:
- Trocar os 2 `<Link>` para sempre apontar para `/minha-loja/${establishmentId}/pedidos/${o.id}` (nunca mais `/pedido/${tracking_code}` no contexto da loja). O link público `/pedido/:code` continua disponível por botão "Copiar link do cliente" / WhatsApp.

### Fase 4 — Página do lojista (consolidação)
`PedidoDetalhesLoja` já tem a base. Verificar/garantir as seções pedidas (cabeçalho, cliente, itens, entrega+referências, taxa+proposta com `SendProposalDialog`/`OrderFreteActions`, status, chat, pagamento, motoboy se existir, histórico via `OrderEventsTimeline`). Sem reescrever — apenas preencher lacunas e amarrar componentes existentes (`StoreConfirmActions`, `WhatsappHistoryPanel`, `OrderReferencesPanel`, `OrderChat`).
Bloqueio operacional: ao tentar marcar `confirmed_by_business` sem `final_total` ou sem aceite, mostrar toast com a mensagem exigida.

### Fase 5 — Página do cliente
`PedidoCliente` já existe; só garantir as seções (resumo, itens, valores, proposta pendente via `ProposalAcceptCard`, chat via `OrderChat`, endereço/referências, timeline via `OrderEventsTimeline`). Nada de edição operacional.

### Fase 6 — Pop-up "Falar com a loja"
Auditar onde o pop-up grava mensagem; garantir insert em `order_messages` com `order_id`, `sender_type='customer'`, e que o painel da loja já lê dessa mesma tabela em `PedidoDetalhesLoja` (usa `useOrderMessages`). Se houver caminho paralelo (ex.: ticket), redirecionar para `order_messages`.

### Fase 7 — Notificações
`NotificationCenter` já roteia para `/minha-conta/pedidos/:orderId` e `/minha-loja/:estId/pedidos/:orderId`. Com as rotas reais (Fase 1) o clique passa a abrir a página correta sem pular pelo `/pedido/:code`. Adicionar fallback: se `related_order_id` ausente → toast "Pedido não disponível" e não navegar.

### Fase 8 — Tempo real na lista
Em `painel/Pedidos.tsx`: adicionar Realtime channel para `orders`, `order_messages`, `order_confirmation_proposals` filtrando por `establishment_id`. Fallback: refetch ao focar a janela + polling 20s. Toasts: novo pedido, nova mensagem, cliente aceitou/recusou frete. Evitar duplicar (usar `qc.setQueryData` por id).

### Fase 9 — Card da lista
Enriquecer o card com selos (nova mensagem, aguardando aceite, referência visual) reusando dados já carregados. Filtros e busca adicionais sem reescrever a tela.

### Fase 10 — Estados de erro
Padronizar em `PedidoCliente`, `PedidoDetalhesLoja` e wrappers: `LoadingState`, `ErrorState` (com retry), "Sem permissão", "Não encontrado", "Dados parciais". Banir `return null` nessas páginas.

### Fase 11 — Testes
- Unit: wrappers `CustomerOrderRoute` / `StoreOrderRoute` (cenários: carregando, sem auth, sem permissão, ok).
- Atualizar `tests/e2e/checkout-confirmation-actions.spec.ts` cobrindo navegação por notificação para `/minha-conta/pedidos/:orderId` e ausência de tela em branco.

## Resumo de arquivos

**Novos**
- `src/components/orders/CustomerOrderRoute.tsx` (wrapper de auth + render `PedidoCliente`)
- `src/components/orders/StoreOrderRoute.tsx` (wrapper de pertencimento + render `PedidoDetalhesLoja`)
- `src/hooks/useCustomerOrder.ts` (busca por `orders.id` + `user_id = auth.uid()`)
- `src/components/orders/__tests__/OrderRoutes.test.tsx`

**Editados**
- `src/App.tsx` — substituir `RedirectByOrderId` nas rotas `/minha-conta/pedidos/:orderId` e `/minha-loja/:est/pedidos/:orderId` pelos novos wrappers; manter `/pedido/:code`.
- `src/components/RedirectByOrderId.tsx` — virar fallback genérico com `ErrorState`.
- `src/pages/PedidoTracking.tsx` — não cair no público enquanto `myEsts` está `undefined`; logs DEV.
- `src/pages/minha-loja/painel/Pedidos.tsx` — links sempre contextuais; Realtime + toasts; filtros/selos.
- `src/pages/PedidoCliente.tsx` — estados de erro padronizados; remover `return null`.
- `src/pages/minha-loja/pedidos/PedidoDetalhes.tsx` — estados padronizados; amarrar `StoreConfirmActions`, `WhatsappHistoryPanel`, `OrderReferencesPanel`, `OrderChat`, `OrderEventsTimeline` (se faltarem); bloqueio de status sem aceite.
- `src/components/NotificationCenter.tsx` — fallback quando `related_order_id` ausente.

## Fora de escopo
- Refazer carrinho, checkout, catálogo, painel admin, motoboys (só exibição), referências visuais (só exibição).
- Encurtar URL pública; criar tabelas novas; mudar RLS global.
- Apagar `/pedido/:code` (continua como link público compartilhável).
