# Auditoria Técnica Completa — Plano por Fases

Este projeto é grande (60+ páginas, dezenas de hooks, Supabase com 45+ tabelas e múltiplos triggers). Uma auditoria "tudo de uma vez" produziria mudanças enormes em um único passo, com alto risco de regressão e impossibilidade de revisão. Proponho executar em **5 fases curtas e verificáveis**, cada uma encerrada com testes e validação no preview antes de seguir.

## Fase 1 — Diagnóstico (sem alterações de código)
Coleta de sinais reais para priorizar correções com base em evidência, não em suposição.
- Varredura de console e network do preview em rotas-chave (`/`, `/loja`, `/e/:slug`, `/checkout`, `/minha-conta`, `/painel`, `/admin`).
- Linter do Supabase (`supabase--linter`) — RLS, políticas, GRANTs faltando.
- Scan de segurança (`security--run_security_scan`).
- `tsc --noEmit` para erros de tipo silenciosos.
- `rg` por antipadrões comuns: `useEffect` sem deps, `any`, `console.error` engolidos, `setState` em loop, queries sem `.abortSignal`.
- Saída: lista priorizada de problemas (crítico / alto / médio / baixo) com arquivo:linha e impacto.

## Fase 2 — Correções críticas de segurança e dados
- Tabelas sem RLS ou sem GRANT adequado.
- Policies permissivas demais (ex.: `USING (true)` em dados sensíveis).
- Verificação de roles em cliente (deve ser via `has_role` no servidor).
- Segredos vazando para o cliente, chaves hardcoded.
- Tratamento de erros em chamadas Supabase que hoje falham em silêncio.

## Fase 3 — Estabilidade de runtime (erros e warnings)
- Erros de console e warnings React (keys, deps de hooks, updates em componente desmontado).
- Loops de re-render, queries duplicadas, race conditions em `useEffect`.
- Proteção de rotas e persistência de sessão (`onAuthStateChange` + `getSession` na ordem correta).
- Fluxos de login/logout/recuperação de senha.
- Memory leaks: subscriptions de realtime e listeners sem cleanup.

## Fase 4 — UX, formulários e responsividade
- Validação de formulários (Zod) onde falta, mensagens de erro consistentes.
- Estados de loading/empty/error padronizados.
- Responsividade mobile nas rotas-chave (já vi viewport 654px no preview).
- Acessibilidade básica: labels, foco, contraste, navegação por teclado.
- Modais, uploads e estados assíncronos.

## Fase 5 — Performance e limpeza
- `React.lazy` em rotas pesadas (admin, debug).
- `useMemo`/`useCallback` apenas onde mede impacto.
- Remoção de imports não usados, código morto, páginas `/debug/*` e `/teste-storage` (avaliar se devem ficar fora de produção).
- Cache do React Query: `staleTime`, invalidações corretas.
- Varredura final + verificação de regressões.

## Detalhes técnicos
- Cada fase termina com: build limpo, sem novos warnings de console nas rotas-chave, e um resumo curto do que mudou.
- Mudanças de schema só via `supabase--migration` (revisão do usuário antes de rodar).
- Sem alterações de design ou remoção de funcionalidades sem confirmar com você.
- Páginas `/debug/*`, `CatalogDebug`, `StorageDebug`, `TesteStorage`, `VisualReferenceFallbackTest` — vou listar e perguntar antes de remover.

## O que eu preciso de você antes de começar
1. **Aprovar este plano por fases** (vs. tentar tudo de uma vez — não recomendo).
2. **Confirmar escopo do admin**: incluir todas as rotas `/admin/*` na auditoria ou focar no fluxo público + dono de loja primeiro?
3. **Páginas de debug**: manter, esconder em produção, ou remover?

Assim que confirmar, começo pela Fase 1 e te devolvo a lista priorizada de problemas reais antes de mexer em código.
