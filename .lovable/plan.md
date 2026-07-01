## Migração de Lovable Cloud para Supabase (self-managed)

O projeto hoje roda em Lovable Cloud, que é Supabase gerenciado pela Lovable. Migrar para uma conta Supabase própria significa transferir **dados, schema, edge functions, storage, auth e secrets** para um novo projeto Supabase e reapontar o app para ele. Depois disso, a Lovable deixa de gerenciar o backend — você passa a administrar diretamente no dashboard do Supabase.

### Antes de começar — o que você precisa saber

- **A migração é irreversível pelo lado do Lovable Cloud neste projeto.** Depois que apontarmos para o Supabase externo, o Cloud não gerencia mais este projeto. É possível voltar manualmente, mas dá trabalho.
- **Você vai precisar de uma conta Supabase própria** (plano Free serve para começar; Pro se já tem volume) e criar um projeto novo lá.
- **Downtime curto** durante o corte (tipicamente 5–15 min): tempo de exportar/importar dados e trocar as variáveis de ambiente.
- **Custos** passam a ser cobrados diretamente pelo Supabase, não mais via créditos Lovable.
- **Alguns recursos exclusivos do Cloud somem**: Lovable AI Gateway (sem chave), envio de e-mail branded pela Lovable, e a UI de "Cloud" no editor. Você pode reimplementar com contas próprias (OpenAI/Anthropic direto, Resend/Postmark para e-mail).

### O que precisa ser migrado

1. **Schema do banco** — 55+ tabelas, tipos enum, funções (`is_establishment_member`, `accept_order_proposal_by_tracking`, `get_order_by_tracking`, etc.), triggers, RLS e GRANTs.
2. **Dados** — establishments, orders, order_messages, profiles, user_roles, plans, todo o histórico.
3. **Auth** — usuários do `auth.users`, incluindo senhas (hash bcrypt migra), identidades OAuth (Google) e o admin oficial `saboresdaserraapp@gmail.com`.
4. **Storage** — buckets `public-media` e `user-media` com todos os arquivos e políticas.
5. **Edge Functions** — `e2e-seed`, `send-announcement-email`, `signup-invite-export-*` (start/status/cancel).
6. **Secrets do backend** — `E2E_SEED_SECRET` e quaisquer chaves usadas pelas edge functions.
7. **Config OAuth** — recadastrar o app Google no novo projeto (client ID/secret e redirect URIs).
8. **Config de e-mail** — reconfigurar templates de auth (confirmação, recuperação) no novo projeto.

### Plano de execução

**Etapa 1 — Preparação (você faz, fora da Lovable)**

- Criar conta em supabase.com e um novo projeto (escolher a mesma região do Cloud atual para reduzir latência).
- Anotar do dashboard novo: `Project URL`, `anon key`, `service_role key`, `Project ref`, senha do Postgres.
- Instalar Supabase CLI local (`npm i -g supabase`) para rodar os comandos de dump/restore.

**Etapa 2 — Exportar o backend atual (eu ajudo com scripts/SQL)**

- Gerar dump do schema + dados do Cloud atual (via `pg_dump` usando a connection string do projeto Cloud; posso preparar os comandos exatos).
- Exportar `auth.users` preservando `encrypted_password`, `raw_user_meta_data`, `email_confirmed_at`, `identities`.
- Baixar objetos dos buckets `public-media` e `user-media` (script Node usando service_role).
- Salvar código das edge functions (já está em `supabase/functions/` no repo, então isso já vem no git).
- Listar secrets ativos do Cloud para você recriar no Supabase novo.

**Etapa 3 — Importar no Supabase novo**

- Rodar as migrations do repo (`supabase/migrations/*`) no projeto novo via CLI — todas as tabelas, funções e policies são recriadas do zero de forma limpa.
- Fazer `\copy` / `pg_restore` só das linhas de dados (sem schema) para popular as tabelas.
- Importar `auth.users` e `auth.identities` via SQL direto (mantém as senhas).
- Upload dos arquivos de storage para os buckets recriados.
- Deploy das edge functions com `supabase functions deploy`.
- Cadastrar os secrets no novo projeto (`supabase secrets set`).
- Reconfigurar o provider Google em Authentication → Providers com as credenciais existentes e adicionar o novo domínio de callback.

**Etapa 4 — Reapontar o app Lovable (eu faço aqui)**

- Trocar `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID` no `.env` para os valores do projeto novo.
- Atualizar `supabase/config.toml` com o novo `project_id`.
- Rodar `supabase gen types typescript` apontando para o projeto novo para regenerar `src/integrations/supabase/types.ts` (schema é o mesmo, mas garante que fica atrelado ao novo ref).
- Desabilitar/remover chamadas ao Lovable AI Gateway se houver (não vi uso ativo no código, confirmar durante a execução).
- Rebuild + smoke test das rotas críticas: `/`, `/login`, `/pedido/:code`, `/minha-loja/painel/pedidos`.

**Etapa 5 — Validação e corte**

- Rodar a suíte E2E do repo apontando para o backend novo.
- Testar manualmente: login com senha, login Google, checkout como visitante, aceite de proposta, chat de pedido, painel do lojista.
- Congelar escritas no Cloud antigo, fazer um delta incremental dos dados novos (se houver), publicar a versão apontando pro Supabase novo.
- Deixar o projeto Cloud antigo em modo somente-leitura por 7 dias antes de descartar.

### O que eu preciso de você para começar

1. Confirmação explícita de que quer prosseguir sabendo que é irreversível pelo lado do Cloud.
2. Se já tem conta/projeto no Supabase criado, ou se quer que eu detalhe passo a passo a criação.
3. Se prefere fazer o corte com **downtime curto planejado** (mais simples) ou com **replicação em paralelo** (mais complexo, quase zero downtime).
4. Se quer manter o Lovable AI Gateway em uso em algum ponto — nesse caso, apontar quais features dependem dele para planejarmos substituto.

Confirme esses pontos e eu preparo os scripts de export/import da etapa 2 e 3 e faço as trocas de config da etapa 4.