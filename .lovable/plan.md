# Histórico de pedidos do cliente — do zero

Objetivo: o usuário logado consegue listar todos os pedidos que já fez, ver o detalhe de cada um e **repetir** ("Pedir de novo") replicando produtos, adicionais, observações, endereço e forma de pagamento. Não mexer em painel da loja, painel admin nem na tabela `orders`.

## UX/Funcional

### Aba "Meus pedidos" em `/minha-conta`
Nova `TabsTrigger value="pedidos"` com ícone `Receipt`. Conteúdo:

- **Filtros rápidos** (chips): Todos · Em andamento · Concluídos · Cancelados.
- **Busca** simples por nome da loja ou código (`tracking_code`).
- **Agrupamento** por mês (ex.: "Novembro 2026").
- **Cartão de pedido** com:
  - Logo + nome do estabelecimento, status colorido (usa `STATUS_LABEL` existente).
  - Data/hora, código `SDS-XXXXX`, total `brl`.
  - 1–2 itens resumidos ("2x Pizza Margherita · +3 itens").
  - Ações: **Ver detalhes**, **Pedir de novo**, **Abrir WhatsApp da loja** (quando aplicável), **Acompanhar** (link para `/pedido/:tracking_code` se ainda ativo).
- Paginação "Carregar mais" (lotes de 20).
- Estado vazio amigável ("Você ainda não fez pedidos — explore a região").

### Drawer/Dialog de detalhes
Modal (sem nova rota) com:
- Cabeçalho com loja, status (`OrderStatusStepper`), código.
- Lista de itens com adicionais, removidos, observação e preço unitário.
- Resumo: subtotal, taxa de entrega, descontos, total.
- Endereço de entrega (snapshot do pedido) + forma de pagamento + troco (se houver).
- Botões: **Pedir de novo** e **Falar no WhatsApp**.

### "Pedir de novo" (reorder)
Fluxo cliente-side, sem alterar banco:
1. Confirmação se o carrinho atual de outra loja for descartado.
2. `cart.setEstablishment(order.establishment_id, slug)` → limpa carrinho atual.
3. Para cada item de `order.items`, revalidar contra catálogo atual:
   - Produto existe, ativo e disponível?
   - Cada adicional ainda existe e está ativo?
   - Preço pode ter mudado — usa preço atual, avisa via toast se diferença > 0.
4. Itens inválidos vão para um aviso ("3 itens indisponíveis foram ignorados") com lista.
5. Pré-seleciona no checkout:
   - `address_id` do pedido (se ainda pertence ao usuário e está ativo).
   - `payment_method` (e `change_for` quando dinheiro).
   - `notes` do pedido.
6. Redireciona para `/loja/:slug/checkout?reorder=1` (Checkout lê parâmetros pré-preenchidos via `sessionStorage` chave `sdr_reorder_prefill`).
7. Cliente revisa e confirma normalmente — gera um pedido novo no fluxo existente.

## Arquitetura técnica

### Dados (somente leitura — sem migrations)
- Usa `orders` já existente com RLS atual (`user_id = auth.uid()`).
- Campos lidos: `id, tracking_code, establishment_id, items (jsonb), subtotal, delivery_fee, total, final_total, status, payment_method, change_for, notes, address_id, created_at`.
- Join virtual: segunda query em `establishments` (`id, name, slug, logo, whatsapp`) por `IN (...)` para evitar dependência de RLS de embed.

### Novos arquivos
- `src/hooks/useAuthReady.ts` — gate de auth (getSession + onAuthStateChange) para evitar o loop infinito que o histórico antigo tinha.
- `src/hooks/useOrderHistory.ts` — `useOrderHistory({ filter, search, pageSize })` com React Query (`enabled: isReady && !!user`), `keepPreviousData`, sem `refetchOnWindowFocus`. Realtime opcional via canal `orders:user_id=eq.{uid}` invalidando a query.
- `src/lib/reorder.ts` — `buildReorderPayload(order)`: busca produtos/opções atuais, monta lista válida + lista de descartados + diffs de preço.
- `src/components/profile/OrderHistoryTab.tsx` — UI da aba (filtros, lista, cartões, paginação, estado vazio/erro).
- `src/components/profile/OrderHistoryCard.tsx` — cartão individual.
- `src/components/profile/OrderHistoryDetailsDialog.tsx` — modal de detalhes.

### Edições
- `src/pages/MinhaConta.tsx`: voltar a importar `Receipt`, adicionar `TabsTrigger`/`TabsContent` `pedidos` apontando para `OrderHistoryTab`.
- `src/pages/Checkout.tsx`: na montagem, ler `sessionStorage.getItem("sdr_reorder_prefill")` e aplicar `address_id`, `payment_method`, `change_for`, `notes`. Limpar a chave após uso.
- `src/components/NotificationCenter.tsx`: nada (continuamos sem link, está ok).

### Anti-loop
Causa raiz do bug anterior: queries disparavam antes do `auth.uid()` estar disponível, RLS bloqueava, React Query tentava de novo. Mitigações:
- `useAuthReady` aguarda `getSession()` antes de `enabled: true`.
- `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1`.
- Sem polling. Realtime via Supabase channel, opt-in.

## Fora de escopo
- Nada de mudança em `orders`, `order_messages`, `order_status_history`, painel loja/admin.
- Sem novas colunas no banco. Sem migrations.
- Sem reabertura/cancelamento pelo cliente nesta entrega (só listar, ver, repetir).

## Perguntas (opcional)
1. Quer também o botão "Avaliar pedido" para concluídos? (posso integrar com `reviews`)
2. Em "Pedir de novo", se a loja estiver fechada, bloqueio ou só aviso?
