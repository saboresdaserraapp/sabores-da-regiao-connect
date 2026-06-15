## Diagnóstico

Os 2 produtos cadastrados (Plebeu, Extraordinário) **existem no banco** mas não aparecem em `/loja/incomum-burguer` porque:

- Nenhum produto tem `menu_category_id` preenchido.
- A loja **não tem nenhuma categoria** em `menu_categories`.
- O código em `src/pages/Establishment.tsx` (linhas 146–149) monta o menu **iterando categorias** e só inclui produtos cujo `menu_category_id` casa com uma categoria. Produtos sem categoria são silenciosamente descartados → "Cardápio em construção".

## Mudanças

### 1. `src/pages/Establishment.tsx` — agrupar e tolerar sem categoria
- Após buscar `cats` e `products`, montar o menu assim:
  - Para cada categoria existente: produtos com `menu_category_id === cat.id`.
  - Adicionar um grupo final **"Outros"** (ou **"Cardápio"** quando for o único) com todos os produtos cujo `menu_category_id` é `null` **ou** aponta para categoria inexistente.
  - Manter o `filter(c => c.products.length > 0)` apenas após esse merge.
- Ordenar produtos por `is_available` desc, depois `display_order`, depois `name` (já alinhado com a regra global: disponíveis primeiro, indisponíveis bem-ranqueados depois).
- Manter o filtro de loja fechada já implementado (`ProductCard` mostra "Indisponível — loja fechada"); não esconder produtos.

### 2. `src/pages/minha-loja/painel/Cardapio.tsx` (UX preventiva)
- Quando o lojista abre o cardápio sem nenhuma categoria criada, mostrar um aviso suave: "Seus produtos sem categoria aparecem em 'Outros' na vitrine. Crie categorias para organizar." (não bloqueia nada).

### 3. Revisão rápida (sem mudanças de schema)
- Confirmar que `usePublicCatalog.usePublicProducts` (Home) já não filtra por `is_available`/`open_now` — ele só filtra `approval_status='approved'` no estabelecimento. OK.
- RLS de `products`: leitura pública já permitida. OK.
- Nada de migração; mudança 100% client-side.

## Detalhes técnicos

Arquivos tocados:
- `src/pages/Establishment.tsx` — função do `useQuery("establishment-menu")` e `visibleMenu` continuam iguais; só muda a montagem do array de categorias.
- `src/pages/minha-loja/painel/Cardapio.tsx` — banner informativo opcional.

Sem alterações em hooks, RLS, edge functions, types ou tabelas.
