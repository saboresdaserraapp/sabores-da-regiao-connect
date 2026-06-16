## Objetivo

Hoje, o cálculo de entrega por distância só roda em `Checkout.tsx`. O cliente só descobre a taxa real (ou que está fora de área) **depois** de clicar em "Finalizar Pedido", escolher endereço e ver a tela do checkout. Vamos antecipar essa informação para o `CartFloatingButton`, sem mover lógica de negócio.

## O que muda

1. **`src/components/CartFloatingButton.tsx`** — quando o usuário estiver logado e tiver um endereço selecionado:
   - Buscar `useDeliverySettings(establishmentId)` (já existe; só precisamos pegar `establishmentId` do cart store).
   - Buscar `useAddresses()` para pegar o endereço padrão / selecionado.
   - Usar `resolveDeliveryFee` + fallback de distância (mesma função usada em Checkout) para calcular um `preview`.
   - Mostrar abaixo do subtotal uma linha pequena:
     - "Entrega R$ X,XX" (quando `fixed` / região / distância)
     - "Entrega grátis" (quando `free` ou 0)
     - "Entrega a confirmar" (quando `to_confirm`)
     - "Fora da área de entrega" em vermelho (quando `unavailable`) — botão continua habilitado, mas com `title` explicativo. Checkout já bloqueia.
   - Sem endereço selecionado ou sem login: comportamento atual (sem linha extra).

2. **`src/store/cart.ts`** — adicionar `establishmentId: string | null` (já existe via `setEstablishment(id)`, só expor no estado). Sem mudança em persistência além desse campo.

3. **Extrair helper compartilhado** em `src/lib/deliveryFee.ts`:
   - Mover o bloco de fallback de distância de `Checkout.tsx` para uma função `resolveDeliveryFeeWithDistance(settings, address, establishment, subtotal)` que retorna o mesmo shape de `resolveDeliveryFee`.
   - `Checkout.tsx` passa a chamar a nova função (refator puro, sem mudança de comportamento).
   - `CartFloatingButton.tsx` reusa a mesma função → garantia de paridade entre preview e cobrança final.

## O que não muda

- Regras de cálculo (regiões, fixed, free, distância, max_km).
- UI / posicionamento do botão.
- Checkout continua sendo a fonte da verdade do preço final.
- `FloatingOrdersButton`, painel da loja, admin — intocados.

## Riscos / mitigação

- **Sem endereço cadastrado**: simplesmente não mostra a linha (estado igual ao atual).
- **Estabelecimento sem coordenadas**: cai no comportamento atual (`to_confirm`).
- **Refresh / múltiplas abas**: o preview é derivado, não persistido — sempre recalcula.
- **Performance**: hooks só rodam quando o botão renderiza (rotas da allowlist + carrinho não-vazio).

## Resumo dos arquivos

- editar: `src/lib/deliveryFee.ts` (extrair `resolveDeliveryFeeWithDistance`)
- editar: `src/store/cart.ts` (expor `establishmentId`)
- editar: `src/components/CartFloatingButton.tsx` (linha de preview de entrega)
- editar: `src/pages/Checkout.tsx` (passar a usar a função extraída)
