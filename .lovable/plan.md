## Objetivo

Transformar o cadastro/edição de produtos do painel do lojista em um formulário completo e profissional, com upload real de imagens, galeria, grupos de acompanhamentos, agendamento de promoção e melhor UX. Hoje o formulário tem os campos, mas parte é mockada (upload desabilitado, galeria vazia, grupos de opções não são usados — apenas o array `options` simples).

## Escopo (o que muda)

### 1. Nova aba "Básico"
- Nome, categoria (select existente), **múltiplas tags** (chips) — já existe, manter
- **Descrição curta** (1 linha, até 120 caracteres, com contador)
- **Descrição completa** (rich textarea com contador de 500 caracteres)
- SKU/código interno (opcional)
- Switches: Ativo, Disponível, Permitir observação

### 2. Aba "Mídia" — upload real
- **Imagem principal**: upload direto (drag & drop + clique), preview, botão remover. Substitui o "URL externa" (mantém como fallback avançado colapsado).
- **Galeria** (até 5 fotos extras, gated por plano Gold): grid com upload, reordenar por drag, remover individual.
- Todas as imagens vão para um bucket `product-images` (público, com RLS por establishment_id no path).

### 3. Aba "Preço e Promoção"
- Preço normal (já existe)
- **Ativar promoção** → preço promocional + texto do selo (já existem)
- **Agendamento**: data/hora de início e fim da promoção (`promotion_starts_at`, `promotion_ends_at` — colunas já existem no store/cart, garantir na tabela `products`)
- Preview do desconto calculado em %

### 4. Aba "Adicionais e Acompanhamentos" — migrar para grupos
Hoje é um array `options` plano. Passar a usar as tabelas `product_option_groups` + `product_options` (já existem):
- Botão "Novo grupo" (ex: "Escolha o tamanho", "Acompanhamentos", "Adicionais")
- Por grupo: nome, obrigatório (sim/não), min_select, max_select, tipo (radio/checkbox)
- Dentro do grupo: lista de opções (nome, preço, ativo), com adicionar/remover/reordenar
- Manter compatibilidade lendo o `options` antigo como um grupo "Adicionais" na primeira carga

### 5. Aba "Estoque" (já existe, manter)
- Rastrear estoque, quantidade, estoque mínimo, pausar automaticamente

### 6. Aba "Exibição e Tags"
- Tags de busca (chips existentes)
- Destaque na home (`featured`, gated)
- Ordem manual dentro da categoria (`position`)

### 7. Aba "Disponibilidade" (mantém como está por enquanto)

### 8. Melhorias transversais
- Validação com **zod** ao salvar (nome obrigatório, preço > 0, promo < preço, min ≤ max)
- Botão "Salvar" fica **sticky** no topo com estado `dirty` e loading; bloqueia navegação com alterações não salvas
- Preview em tempo real ao lado (card de produto como aparece no cardápio) — desktop only
- Unificar a criação (dialog em `Produtos.tsx`) e edição (`EditarProduto.tsx`) no mesmo formulário completo — o dialog vira "criar rápido" apenas com nome+preço+categoria, e um botão "Editar completo" abre a página cheia.

## Alterações técnicas

**Backend (migração):**
- Garantir colunas em `products`: `promotion_starts_at timestamptz`, `promotion_ends_at timestamptz`, `sku text`, `position int default 0`, `gallery_images jsonb default '[]'` (já pode existir — verificar antes)
- Criar bucket de storage `product-images` (público) com policies:
  - SELECT público
  - INSERT/UPDATE/DELETE só para owner do estabelecimento (path: `{establishment_id}/{product_id}/{file}`)

**Frontend:**
- Novo componente `src/components/painel/produtos/ProductImageUploader.tsx` (upload + drag&drop, usa `supabase.storage`)
- Novo componente `src/components/painel/produtos/ProductGalleryEditor.tsx`
- Novo componente `src/components/painel/produtos/ProductOptionGroupsEditor.tsx` (CRUD dos grupos + opções)
- Refatorar `src/pages/minha-loja/painel/EditarProduto.tsx` para consumir esses componentes
- Simplificar o dialog em `Produtos.tsx` (criação rápida)
- Schema zod em `src/lib/schemas/product.ts`
- Migração de leitura: hook `useProductOptionGroups(productId)` que carrega das tabelas relacionais; fallback para `products.options` antigos

## Fora de escopo (não faço agora)
- Variações com estoque próprio por SKU (ex: tamanho P/M/G com estoque separado)
- Combos multi-produto
- Import em massa via CSV
- Reordenação drag&drop dos grupos (só das opções dentro do grupo)

## Perguntas antes de eu construir

1. **Migração de dados antigos**: os produtos que já têm `options` no formato plano — quer que eu (a) converta automaticamente para um grupo "Adicionais" na primeira edição, (b) mostre lado a lado até você migrar manualmente, ou (c) mantenha só o novo modelo e ignore o antigo?
2. **Galeria**: 5 fotos extras é OK ou prefere outro limite (3 / 10)?
3. **Preview ao vivo do card**: quer que eu inclua o painel de preview do produto (como aparece no cardápio público) ao lado do formulário, ou prefere focar no formulário e deixar preview para depois?
4. **Rich text na descrição completa**: texto puro com quebras de linha basta, ou você quer negrito/itálico/listas (adiciona um editor tipo tiptap)?
