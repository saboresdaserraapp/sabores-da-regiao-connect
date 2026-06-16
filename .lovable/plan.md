## Problema

A aba "Meus pedidos" não retorna nada porque a tabela `public.orders` está sem GRANTs para os roles do Data API (`authenticated`, `anon`, `service_role`). Sem GRANT, o PostgREST devolve resultado vazio (ou erro de permissão) mesmo com RLS permitindo acesso ao próprio `user_id`.

Verificado:
- Os pedidos do usuário logado existem com `user_id` correto.
- As políticas RLS de SELECT (`Own orders read`, `Users can view their own orders`) estão corretas.
- `information_schema.role_table_grants` mostra apenas grants para `sandbox_exec` — nenhum para `authenticated`/`service_role`.

## Correção

Criar uma migration única adicionando os GRANTs faltando, sem alterar políticas, schema ou código:

```sql
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.orders TO anon;        -- mantém criação de pedido por visitante
GRANT ALL ON public.orders TO service_role;
```

Justificativas:
- `authenticated` precisa de SELECT/INSERT/UPDATE (ver/criar/cancelar próprios pedidos). Sem DELETE porque nenhuma política permite delete pelo cliente.
- `anon` mantém INSERT (checkout sem login já existente via política "Anyone can create orders") + SELECT (a página de tracking público lê via `get_order_by_tracking`, mas manter SELECT é coerente com a política existente; remover se quiser endurecer depois).
- `service_role`: ALL, padrão para edge functions/admin.

## Validação

1. Após a migration, reabrir "Meus pedidos" logado como o usuário de teste e confirmar que os 6 pedidos aparecem nas abas correspondentes (em andamento / concluídos).
2. Conferir no console que `useOrderHistory` retorna `data.length > 0`.
3. Garantir que checkout continua criando pedidos normalmente (anon e logado).

## Fora de escopo

- Nenhuma mudança em componentes, hooks, RPCs ou outras tabelas.
- Sem alteração de RLS.
