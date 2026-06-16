## Objetivo

Hoje o botão flutuante "Ver carrinho / Finalizar Pedido" só renderiza dentro de `src/pages/Establishment.tsx`. Vamos torná-lo um componente reutilizável e exibi-lo em **todas as telas que mostram comida** (Início, Loja, Categoria, Cardápio do estabelecimento e Checkout) — e em nenhuma outra (perfil, painéis, admin, login, tracking, etc.).

## O que muda

1. **`src/store/cart.ts`** — adicionar `establishmentSlug` ao estado e ao `setEstablishment(id, slug?)`. Sem isso, o botão fora da página do estabelecimento não sabe pra onde mandar o usuário. Mudança retrocompatível (campo opcional).

2. **Novo `src/components/CartFloatingButton.tsx`** — extrai exatamente o markup que já existe em `Establishment.tsx` (linhas 735–755): pílula com contador, subtotal e "Finalizar Pedido". Lê `useCart()` e usa `establishmentSlug` do estado. Não renderiza se carrinho vazio ou sem slug.

3. **`src/pages/Establishment.tsx`** — substituir o bloco inline pelo `<CartFloatingButton />` e passar o slug ao `cart.setEstablishment(data.id, data.slug)`.

4. **`src/App.tsx`** — criar um pequeno wrapper interno `GlobalCartButton` que usa `useLocation()` e só renderiza o `<CartFloatingButton />` quando a rota atual estiver na allowlist:

```text
/                       (Index)
/loja                   (Loja — listagem geral / categorias por query)
/loja/categoria/...     (se existir rota dedicada de categoria)
/e/:slug                (Cardápio)
/loja/:slug             (Cardápio alternativo)
/e/:slug/checkout       (Checkout)
/loja/:slug/checkout    (Checkout)
```

Implementação: regex simples sobre `location.pathname`. Em qualquer outra rota (minha-conta, painel, admin, pedido, referencias, login, etc.) não aparece.

5. Como o `Establishment` e o `Checkout` agora teriam o botão global, **removemos o botão inline antigo do `Establishment.tsx`** para evitar duplicação. O Checkout não tem botão hoje — passa a ter o global (útil se o usuário continua adicionando itens).

## O que não muda

- Lógica do carrinho (preço, opções, persistência).
- `FloatingOrdersButton` (pedidos em andamento) — é outro botão, fica como está.
- Estilos/posição do botão (mesmo `fixed bottom-6` atual).
- Páginas de painel da loja, admin, autenticação, tracking, referências — continuam sem o botão.

## Riscos / mitigação

- **Carrinhos antigos no localStorage sem slug**: o botão simplesmente não renderiza até o usuário entrar de novo em um cardápio (que chama `setEstablishment`). Sem regressão para quem está no `/e/:slug`.
- **Duplicação visual**: garantida ao remover o inline do `Establishment.tsx`.
- **Rota de categoria**: hoje categorias parecem ser filtros dentro de `/loja` (query string). A allowlist `/loja` já cobre isso. Se houver rota futura `/categoria/...`, basta adicionar uma linha no matcher.

## Resumo dos arquivos

- editar: `src/store/cart.ts`
- criar: `src/components/CartFloatingButton.tsx`
- editar: `src/pages/Establishment.tsx` (passar slug + remover bloco inline)
- editar: `src/App.tsx` (renderizar `GlobalCartButton` com allowlist de rotas)
