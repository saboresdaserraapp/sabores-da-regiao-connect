## Objetivo
Garantir que o usuário `saboresdaserraapp@gmail.com` tenha papel `super_admin` (acesso total).

## Situação atual
Já existe a função `public.ensure_official_admin()` que:
- Localiza o usuário pelo email `saboresdaserraapp@gmail.com` em `auth.users`
- Insere o papel `super_admin` em `public.user_roles` (idempotente)
- Remove qualquer outro usuário com papéis administrativos, garantindo exclusividade

## Ação
Executar `SELECT public.ensure_official_admin();` via tool de insert (operação de dados, não migração de schema).

## Verificação
Consultar `public.user_roles` filtrando pelo `user_id` do email para confirmar que o registro `super_admin` foi criado, e confirmar que nenhum outro usuário tem papel administrativo.

## Observação
Se o email ainda não tiver feito login no sistema (não existe em `auth.users`), a função não cria o registro. Nesse caso, o usuário precisa fazer login uma vez com Google ou email/senha, e então re-executamos a função.
