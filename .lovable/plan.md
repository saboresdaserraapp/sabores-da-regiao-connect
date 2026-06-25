
## Diagnóstico

Confirmado direto no banco:

1. **Recursão infinita em `establishments`** — há um ciclo entre duas policies:
   - `establishments` → policy *"Owners read own establishment"* faz `EXISTS (SELECT 1 FROM establishment_owners WHERE eo.establishment_id = establishments.id)`.
   - `establishment_owners` → policy *"users read own memberships"* faz `EXISTS (SELECT 1 FROM establishments e WHERE e.id = establishment_owners.establishment_id AND e.owner_id = auth.uid())`.
   - Cada SELECT em uma tabela aciona a policy da outra → Postgres aborta com `infinite recursion detected in policy for relation "establishments"`. É exatamente o erro do checkout logado.

2. **Tracking de pedido como visitante** — o RPC `get_order_by_tracking(_code)` está como `STABLE` **sem `SECURITY DEFINER`**. Logo, roda com o papel `anon`, e as policies de `orders` não permitem SELECT anônimo. O JOIN devolve 0 linhas → o front renderiza "Pedido não encontrado", mesmo o pedido `SDS-GKCYLQ` existindo no banco (verificado).

3. **Admin "Estabelecimentos" vazio** — existem 5 estabelecimentos no banco, mas a tela mostra 0. A query em `src/pages/admin/Estabelecimentos.tsx` ignora `error` e devolve `data ?? []`. Quando o usuário admin está logado, a mesma recursão do item 1 quebra a query → vira lista vazia. Ou seja: **não é uma terceira causa, é consequência do item 1**. Depois de corrigir a recursão, a tela admin volta a listar.

Resposta direta à sua pergunta: o app **não está deixando de mostrar os pedidos porque as lojas não estão cadastradas** — as lojas estão cadastradas (5 no banco) e o pedido foi salvo corretamente. Os dois sintomas vêm de RLS quebrado.

## Plano de correção (uma migration + um pequeno hardening de UI)

### 1) Migration SQL — quebrar o ciclo de RLS

- Criar/atualizar função `public.is_establishment_member(_uid, _est_id)` como `SECURITY DEFINER STABLE SET search_path=public`, retornando `boolean`, lendo `establishment_owners` e `establishments.owner_id` sem disparar RLS.
- Em `establishments`, recriar a policy de leitura dos donos usando essa função em vez do `EXISTS` direto:
  - `USING (owner_id = auth.uid() OR public.is_establishment_member(auth.uid(), id))`.
- Em `establishment_owners`, recriar a policy `users read own memberships` para **não** consultar `establishments` no `USING`. Mantém apenas `user_id = auth.uid() OR can_manage(auth.uid())`. A condição de "owner do estabelecimento também enxerga a equipe" passa a usar `public.is_establishment_member(auth.uid(), establishment_id)` (security-definer, sem recursão).
- Idem para `owners manage team memberships` — trocar o `EXISTS` por `is_establishment_member(...)`.

### 2) Migration SQL — tracking público funcionar para visitante

- `ALTER FUNCTION public.get_order_by_tracking(text) SECURITY DEFINER;` e garantir `GRANT EXECUTE ON FUNCTION public.get_order_by_tracking(text) TO anon, authenticated;`.
- A função já filtra por `tracking_code`, então só quem tem o código consegue ler — seguro para uso anônimo. Sem isto, todo guest cai em "Pedido não encontrado".

### 3) UI — Admin Estabelecimentos parar de mascarar erro

- Em `src/pages/admin/Estabelecimentos.tsx` desestruturar `{ data, error }` e: logar `error`, exibir `ErrorState` quando houver falha em vez de "0 resultados". Evita esconder regressões futuras de RLS.

### 4) Validação

- `psql` antes/depois: `select * from establishments` como `authenticated` (via Supabase) não deve mais retornar recursão.
- Visitar `https://saboresapp.lovable.app/pedido/SDS-GKCYLQ` deslogado → deve renderizar o pedido.
- Refazer um checkout logado → não deve mais aparecer "infinite recursion".
- Admin → Estabelecimentos deve listar os 5 registros.

## Fora de escopo

- Cadastrar manualmente as lojas/produtos no painel admin (elas já existem no banco).
- Mudanças nos testes E2E recém-criados.

Confirme que posso aplicar a migration e o ajuste de UI.
