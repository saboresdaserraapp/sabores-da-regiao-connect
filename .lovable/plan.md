# Plano

## Contexto
Hoje as categorias da home/menu da loja são strings fixas (`category` na tabela `establishments`) e não estão ligadas à tabela `site_categories`, que existe apenas com itens "semeados" pelo `seed_initial_data()`. A aba **Categorias** (em `SiteAdmin.tsx`) só lista e liga/desliga visibilidade. A aba **Estabelecimentos** não tem botão para o admin criar uma loja manualmente.

## O que vou entregar

### 1. Categorias gerenciáveis (aba "Categorias" do admin)
- Botão **"Nova categoria"** (modal: key auto‑slug, label, emoji, position).
- Editar inline label/emoji/posição + botões "↑ ↓" para reordenar.
- Botão **excluir** (bloqueia exclusão se houver `establishments.category = key`, mostrando contagem).
- Migration: garantir RLS para INSERT/UPDATE/DELETE em `site_categories` restritos a `can_manage(auth.uid())` + GRANT apropriado; manter SELECT público.

### 2. Sincronia categorias ⇄ estabelecimentos
- Nos selects de categoria (cadastro de loja, filtros, perfil) passar a buscar de `site_categories` (já é feito em algumas telas) — substituir o `distinct` usado em `Estabelecimentos.tsx` por consulta a `site_categories`.
- `category_label` do estabelecimento passa a vir do `label` de `site_categories` quando a `key` bate (fallback para texto livre legado).

### 3. Criar loja pelo admin (aba "Estabelecimentos")
- Botão **"Nova loja"** no topo abrindo modal com: nome, categoria (select de `site_categories`), cidade, bairro, WhatsApp, plano (select de `plans`), dono (busca por e‑mail em `profiles` — opcional, pode deixar sem dono).
- Ao salvar: `INSERT` em `establishments` com `approval_status='approved'` (admin já aprova), `is_public=true`, plano selecionado. Se `owner_id` informado, o trigger `sync_establishment_owner` já cria o vínculo em `establishment_owners`.
- Após criar, redireciona para `/admin/estabelecimentos/:id` (perfil) onde já existe gestão de equipe/funções.

### 4. Atribuição livre de funções (já existe parcialmente)
- Verificar/expor na página `EstabelecimentoPerfil.tsx` a seção de equipe (`establishment_owners`) com botões para adicionar membro por e‑mail e escolher papel (`owner`, `manager`, `attendant`, `menu_editor`, `finance`). Se ausente, adicionar.

## Arquivos afetados
- `src/pages/admin/SiteAdmin.tsx` — `CategoriesTab` com CRUD completo.
- `src/pages/admin/Estabelecimentos.tsx` — botão e modal "Nova loja"; select de categoria via `site_categories`.
- `src/pages/admin/EstabelecimentoPerfil.tsx` — garantir UI de equipe.
- Nova migration: políticas/GRANT em `site_categories` para admins (INSERT/UPDATE/DELETE).

## Fora do escopo
- Migrar o campo `establishments.category` para FK em `site_categories` (mudança disruptiva). Mantemos `key` como texto e sincronizamos via UI.
