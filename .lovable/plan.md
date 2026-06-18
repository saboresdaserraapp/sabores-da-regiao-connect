# Carrinho — correção + preview antes do checkout

## Diagnóstico do bug

O carrinho flutuante (`CartFloatingButton`) só renderiza quando `state.items.length > 0` **e** `state.establishmentSlug` está preenchido. Após a consolidação de URLs em `/loja/:slug` (etapa B), o `ProductQuickView` (usado pelos `ProductCard` que aparecem na home `/` e em `/loja`) ainda chama `cart.setEstablishment(establishmentId)` **sem o slug**. Resultado: ao adicionar item pela home ou pela vitrine, `establishmentSlug` fica `null` e o botão flutuante nunca aparece. Dentro de `/loja/:slug` (página `Establishment`) o slug é passado, então lá funciona — mas como o usuário relatou, na home/vitrine não aparece.

## O que será feito

### 1. Corrigir o bug do carrinho não aparecer (home + vitrine)
- `src/components/ProductCard.tsx`: passar `establishmentSlug={e.slug}` para `ProductQuickView`.
- `src/components/ProductQuickView.tsx`: receber `establishmentSlug` e chamar `cart.setEstablishment(establishmentId, establishmentSlug)`.
- Migração defensiva no `src/store/cart.ts`: se um carrinho antigo (de versão anterior) estiver no `localStorage` com `establishmentSlug = null` mas com itens, buscar o slug a partir de `establishmentId` em background a partir do `CartFloatingButton` para não deixar o botão "preso" invisível. Alternativa mais simples e segura: no `CartFloatingButton`, quando há itens mas sem slug, buscar o slug uma vez via `establishments.id=eq.<id>` e gravar via `cart.setEstablishment(id, slug)`. Assim carrinhos antigos se auto-curam.

### 2. Preview do pedido antes do checkout
Hoje o botão flutuante leva direto a `/loja/:slug/checkout`. Vamos adicionar uma etapa intermediária leve: um **drawer de preview** do carrinho que abre ao clicar no botão flutuante (ou em "Ver carrinho").

Conteúdo do drawer:
- Cabeçalho com logo + nome da loja, e link "Trocar de loja" (limpa carrinho com confirmação).
- Lista dos itens: imagem, nome, opções escolhidas (ex.: "Sem cebola", "+ Bacon"), nota, preço unitário, controles `−/+` para ajustar quantidade, ícone de lixeira para remover.
- Resumo: subtotal, taxa de entrega prevista (reaproveita o cálculo já existente no `CartFloatingButton`), aviso quando "fora da área" / "a confirmar", total estimado.
- Campo opcional "Cupom" desativado (placeholder para o futuro).
- Botões: "Continuar comprando" (fecha o drawer) e "Ir para o checkout" (navega para `/loja/:slug/checkout`).
- Estado vazio: mensagem amigável quando o último item é removido (e o botão flutuante some automaticamente).

Implementação:
- Novo componente `src/components/cart/CartPreviewSheet.tsx` usando `Sheet` do shadcn (já presente em `src/components/ui/sheet.tsx`), abrindo pela direita no desktop e como bottom-sheet no mobile.
- `CartFloatingButton` deixa de ser `<Link>` e vira `<button>` que abre o sheet. O botão "Ir para o checkout" dentro do sheet faz o `navigate(`/loja/${slug}/checkout`)`.
- Reaproveita `cart.update`, `cart.remove`, `cart.subtotal` e o `resolveDeliveryFeeWithDistance` já usado no botão.

### 3. Pequenas melhorias do carrinho enquanto mexemos nele
- `cart.setEstablishment(id, slug?)` aceita atualizar o slug sem zerar itens (já faz). Reforçar tipagem para que `slug` seja recomendado.
- Adicionar `cart.updateNote(uid, note)` para permitir editar a observação direto no preview (campo "Observação" por item, opcional, com `Textarea` colapsável).
- Persistência: manter `localStorage` mas adicionar versão (`sdr_cart_v2`) para evitar conflito com formato antigo; ler legado uma vez e migrar.
- Acessibilidade: o botão flutuante ganha `aria-label` "Abrir carrinho com N itens" e o sheet tem foco inicial no primeiro controle.

## Arquivos afetados

- `src/components/ProductCard.tsx` — passa slug.
- `src/components/ProductQuickView.tsx` — aceita e usa slug.
- `src/store/cart.ts` — versão do storage, `updateNote`, migração.
- `src/components/CartFloatingButton.tsx` — vira gatilho do sheet, auto-cura slug ausente.
- `src/components/cart/CartPreviewSheet.tsx` — novo.

## Fora do escopo

- Cupom/desconto real (apenas placeholder visual).
- Salvar carrinho no servidor / sincronizar entre dispositivos.
- Edição completa de opções dentro do preview (mantém remover + ajustar quantidade + nota; para mudar opções o usuário reabre o `ProductQuickView`).
