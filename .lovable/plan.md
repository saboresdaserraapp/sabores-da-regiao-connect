## Auditoria — Resultado

Rodei o scanner de segurança + linter Supabase + revisão de policies, funções e código cliente.

**Diagnóstico geral:** RLS está habilitado em todas as 53 tabelas `public`, GRANTs corretos, roles em tabela separada (`user_roles`) com `has_role()`/`is_admin()` SECURITY DEFINER, gateways de proposta (`accept_order_proposal`/`reject_order_proposal`) já validam `auth.uid()`, segredos não vazam no frontend. Não há SQL injection (todo acesso é via PostgREST/RPC parametrizado).

Os 113 alertas do scanner se concentram em **3 padrões**, e a maioria é benigna ou já intencional. O plano abaixo só mexe no que é **real risco** — não vou rodar refactor amplo de schema (já está normalizado e em uso) nem renomear tabelas (quebraria tudo).

---

## Riscos reais encontrados (a corrigir)

### ALTO
1. **`profiles` legível por qualquer usuário autenticado** — qualquer login pode ler `display_name`/`phone` de todos. Restringir SELECT ao próprio usuário + admins.
2. **`addresses` / `house_references` / `house_reference_media`** — verificar se policies escopam por `user_id = auth.uid()` (algumas têm leitura cruzada via order share).
3. **`order_messages` / `notifications`** — confirmar que cliente só lê os próprios; loja só lê do próprio estabelecimento.
4. **`delivery_drivers`** (PII de motoboys — telefone) — confirmar escopo por estabelecimento.

### MÉDIO
5. **`anon` pode executar funções SECURITY DEFINER administrativas** (`admin_find_user_by_email`, `claim_support_chat`, `log_action`, `ensure_official_admin`, `seed_initial_data`, `increment_banner_metric`). Elas já validam `is_admin()` internamente, mas devem ser `REVOKE EXECUTE FROM anon, public` para reduzir superfície.
6. **Policies `WITH CHECK (true)` em INSERT** de `events`, `reports`, `reviews` — abre spam anônimo. Adicionar checagem mínima (`auth.uid() IS NOT NULL` para reviews/reports; manter events público mas com rate via trigger).
7. **`audit_log` INSERT `with_check true`** — manter (é gravado por SECURITY DEFINER), mas restringir GRANT INSERT a `service_role` apenas.

### BAIXO (configuração)
8. **Leaked Password Protection (HIBP)** — ativar via `configure_auth`.
9. **Confirmação de email** — verificar que `auto_confirm_email` está desligado em produção.

---

## Plano de execução

### Passo 1 — Migração de RLS (uma migration única)
- `profiles`: substituir SELECT público por `auth.uid() = id OR is_admin(auth.uid())`.
- Revisar e endurecer policies de `addresses`, `house_references`, `house_reference_media`, `order_messages`, `notifications`, `delivery_drivers` para garantir escopo estrito por dono / estabelecimento / pedido.
- `events`, `reports`, `reviews`: trocar `WITH CHECK (true)` por `WITH CHECK (auth.uid() IS NOT NULL)` (reports/reviews) e por filtro mínimo de coluna em `events`.
- `audit_log`: `REVOKE INSERT ... FROM authenticated, anon`; manter só `service_role`.

### Passo 2 — Endurecer funções SECURITY DEFINER
```sql
REVOKE EXECUTE ON FUNCTION
  public.admin_find_user_by_email(text),
  public.ensure_official_admin(),
  public.seed_initial_data(),
  public.log_action(text,text,uuid,jsonb),
  public.claim_support_chat(uuid),
  public.increment_banner_metric(uuid,text)
FROM anon, public;
GRANT EXECUTE ON FUNCTION ... TO authenticated;  -- onde aplicável
```
Manter executáveis por `anon` apenas as públicas legítimas: `get_order_by_tracking`, `get_share_link_by_token`, `get_visual_reference_by_token`, `slugify`, `unaccent_safe`, `gen_tracking_code`.

### Passo 3 — Configuração de auth
Chamar `configure_auth` com `password_hibp_enabled: true`, `auto_confirm_email: false`, `disable_signup: false`, `external_anonymous_users_enabled: false`.

### Passo 4 — Validação
- Rerodar `security--run_security_scan` e `supabase--linter`.
- Smoke test: login cliente vê só seus pedidos/endereços; login loja vê só seus pedidos; admin continua tendo acesso amplo via `is_admin()`.

---

## Fora do escopo (intencional)

- **Renomear tabelas / normalizar schema:** já está coerente e em produção; mudanças quebrariam código e tipos gerados sem ganho real.
- **Mover storage policies:** não foi reportado problema; pode entrar em ciclo futuro se necessário.
- **Rate limiting de API:** Supabase/PostgREST não tem primitiva nativa no app — só faria sentido via edge function dedicada.
- **Edge functions:** só há `send-announcement-email`, sem inputs sensíveis adicionais detectados.

Aprovando, sigo com a migração única (Passos 1+2) + `configure_auth` (Passo 3) + revalidação.
