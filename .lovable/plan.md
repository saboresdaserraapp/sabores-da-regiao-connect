Quatro frentes, encadeadas por dependência (migrations primeiro, depois código, depois testes).

## 1. Banco — auditoria + job persistente de exportação

Migration única adicionando:

- `admin_convite_audit_logs` — registra cada `view` / `filter` / `export_*` em `/admin/convites-cadastro`.
  Colunas: `admin_id uuid`, `action text` (`view|filter|export_start|export_success|export_cancel|export_error`), `params jsonb`, `result jsonb`, `created_at`.
  RLS: só admin (via `is_admin(auth.uid())`) pode `SELECT/INSERT`. `GRANT` para `authenticated` + `service_role`. Sem `anon`.

- `signup_invite_export_jobs` — job persistente do CSV.
  Colunas: `admin_id`, `status` (`queued|running|done|error|canceled`), `filters jsonb` (start, end, campaign, q, sort, dir), `total int`, `done int`, `progress_pct int`, `csv_path text` (caminho no Storage), `download_url text`, `error text`, `finished_at`, `created_at`, `updated_at`.
  Trigger `updated_at`. RLS: dono (`admin_id = auth.uid()`) ou admin pode ver/atualizar; insert por admin. `GRANT` para `authenticated` + `service_role`.

- Bucket privado `signup-invite-exports` (Storage). Policy: apenas admins leem/escrevem objetos.

- Função RPC `search_signup_invites(_start, _end, _campaign, _q, _sort, _dir, _limit, _offset)` → `SETOF` com `tracking_code, source, campaign, dismissed_at`. Faz busca/ordenação server-side por `tracking_code` (futuro: dá pra fazer join com `orders` para email/telefone). `SECURITY DEFINER`, restrita a `is_admin`. Devolve também `total` via segunda função `count_signup_invites(...)`.

## 2. Edge functions — job runner + status

- `supabase/functions/signup-invite-export-start/index.ts`
  - Verifica JWT + `is_admin`.
  - Insere job `queued` com filtros validados via Zod.
  - Dispara processamento em background com `EdgeRuntime.waitUntil`: pagina via RPC `search_signup_invites`, monta CSV em memória (até cap), envia ao Storage e atualiza `progress_pct`/`done` a cada lote. No fim assina URL (`createSignedUrl`, 1h) e marca `done`.
  - Retorna `{ job_id }` imediatamente.
  - Loga em `admin_convite_audit_logs` (`export_start`).

- `supabase/functions/signup-invite-export-status/index.ts`
  - GET `?job_id=...` → retorna `status, progress_pct, done, total, download_url, error`.
  - Admin-only; só dono do job ou admin global.

- `supabase/functions/signup-invite-export-cancel/index.ts`
  - Marca `canceled`; runner checa flag entre lotes.

## 3. Frontend — `/admin/convites-cadastro`

- Trocar fetch direto da tabela por **RPC `search_signup_invites`** dentro de `useInfiniteQuery`. `queryKey` agora inclui `q`, `sort`, `dir`. Remove sort/filter client-side (mantém só o agregado de `totals`).
- Busca rápida: input continua com debounce 200ms, mas agora dispara refetch via query key (`q` vai pro servidor).
- Ordenação: `toggleSort` continua igual; `sort/dir` viram parte do queryKey.
- CSV: substituir export inline por fluxo de job:
  - botão → chama `signup-invite-export-start` com filtros atuais → salva `job_id` em `localStorage` (`sdr_csv_export_job`) e `URL` (?export_job=...).
  - hook `useExportJob(jobId)` faz polling a cada 1.2s do `signup-invite-export-status` (`react-query` com `refetchInterval`).
  - mostra mesmo toast com `<Progress>` (agora alimentado pelo server) + botão Cancelar.
  - Quando `status=done`, exibe toast persistente com botão "Baixar CSV" usando `download_url`. Sobrevive ao refresh porque `job_id` está em localStorage; ao montar a página, se houver job ativo, retoma polling.
- Auditoria client-side: chamar uma função util `logAdminEvent('view'|'filter'|'export_*', params)` que faz `insert` na tabela `admin_convite_audit_logs`. Dispara:
  - `view` no mount;
  - `filter` num `useEffect` sobre filtros (debounce 500ms) com payload `{start,end,campaign,q,sort,dir}`;
  - `export_start/success/cancel/error` (também registrados server-side pelas functions; o client só registra a intenção de UI).

## 4. Testes

- **Unit (Vitest + Testing Library)** — `src/pages/__tests__/Cadastro.test.tsx`
  - Mock `supabase.auth.signUp` para `reject` (erro de rede). Renderiza `<Cadastro />` envolto em router, preenche form, dispara click rápido 5× no botão "Criar conta". Asserta:
    - `signUp` chamado **exatamente 1 vez** (ref guard impede o resto).
    - Botão entra em `aria-busy="true"` e fica `disabled` até o catch.
    - Toast de "Sem conexão" exibido.
- **Unit** — `src/pages/admin/__tests__/ConvitesSignup.searchParams.test.tsx`
  - Renderiza dentro de `MemoryRouter` com URL inicial `?start=2026-06-01&end=2026-06-10&campaign=post_delivery_invite&q=SDS&sort=tracking_code&dir=asc`.
  - Mocka RPC para retornar []. Asserta:
    - Inputs de data refletem os valores.
    - Select de campanha mostra "Pós-entrega".
    - Input de busca tem valor "SDS".
    - Cabeçalho `Pedido` tem `aria-sort="ascending"`.
- **E2E (Playwright via shell)** — `tests/e2e/admin-convites-url-state.spec.ts`
  - Restaura sessão admin (LOVABLE_BROWSER_SUPABASE_*), abre `/admin/convites-cadastro?...todos os params...`, valida estado inicial. Altera filtro → confirma URL atualiza. Recarrega → confirma estado preservado.

## Detalhes técnicos relevantes

- `useInfiniteQuery` continua, mas com `pageParam = offset` e `getNextPageParam = (last) => last.length < PAGE_SIZE ? undefined : nextOffset`. RPC retorna lista direta.
- `searchParams` do React Router já é fonte da verdade; debounce de `q` mantém URL "rasa" (replace).
- Logs de auditoria: tabela leve, sem PII além de `admin_id`; `params` armazena exatamente o que foi enviado.
- Job runner usa `EdgeRuntime.waitUntil` (Deno) para tarefa em background; checa cancelamento a cada lote e respeita `EXPORT_HARD_CAP=50000`.
- Storage signed URL com 1h é suficiente; se expirar, o status endpoint reassina sob demanda.

## Arquivos previstos

- `supabase/migrations/<ts>_signup_invite_audit_and_jobs.sql`
- `supabase/functions/signup-invite-export-start/index.ts`
- `supabase/functions/signup-invite-export-status/index.ts`
- `supabase/functions/signup-invite-export-cancel/index.ts`
- `src/lib/adminAudit.ts` (helper)
- `src/hooks/useExportJob.ts`
- `src/pages/admin/ConvitesSignup.tsx` (refactor)
- `src/pages/__tests__/Cadastro.test.tsx`
- `src/pages/admin/__tests__/ConvitesSignup.searchParams.test.tsx`
- `tests/e2e/admin-convites-url-state.spec.ts`

Confirma para eu seguir?
