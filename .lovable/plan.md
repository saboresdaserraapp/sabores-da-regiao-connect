# Plano: garantir que o app não tenha erros de código ou quebras

## Estado atual (já verificado nesta sessão)
- TypeScript: **0 erros** (`tsc --noEmit` limpo).
- Console do preview: **sem erros**.
- Network do preview: **sem requisições com erro**.
- Build do Vite: rodando sem falhas.
- Última migration aplicada com sucesso, sem regressão.

**Não há erro de código ou quebra ativa no app neste momento.** Os 68 findings restantes do scanner são todos `WARN` de hardening de banco (não causam quebra de runtime).

## O que vou fazer neste plano

### 1. Re-validar que está tudo limpo (sem mudar código)
- Rodar `tsc --noEmit` novamente.
- Ler console e network do preview nas rotas-chave: `/`, `/loja`, `/e/:slug`, `/login`, `/minha-conta`, `/painel`, `/admin/login`, `/minha-loja`.
- Verificar logs do dev-server por warnings recentes.

### 2. Caçar quebras silenciosas que o build não pega
Padrões que comumente derrubam uma rota em runtime sem aparecer no `tsc`:
- `useEffect` sem cleanup em subscriptions de realtime do Supabase (memory leak → app trava depois de uns minutos).
- Acessos do tipo `data.algo` sem checar se `data` é `null` quando a query falha.
- `JSON.parse` sem try/catch.
- `localStorage` acessado em SSR/build (não se aplica aqui, é Vite SPA).
- Imports quebrados após renames (o `tsc` pega; só confirmar).
- Rotas que dependem de `useParams()` sem fallback quando o param está ausente.

Vou rodar `rg` para os 3 primeiros padrões e corrigir apenas casos reais que encontrar — não vou refatorar código que já funciona.

### 3. Não vou fazer nesta rodada
- **Não** vou mexer nos 68 warnings de hardening do banco (SECURITY DEFINER, policies permissivas em `events`/`reports`/`reviews`, bucket público). Esses não causam erro/quebra de código — são endurecimento de segurança e precisam de decisão sua para não quebrar fluxos intencionais (envio anônimo de reviews/reports, por exemplo).
- **Não** vou alterar UI, design ou comportamento de features.
- **Não** vou remover ou renomear arquivos.

## Critério de "pronto"
- `tsc --noEmit` continua 0 erros.
- Sem novos warnings no console nas rotas-chave.
- Quaisquer quebras silenciosas reais encontradas no passo 2 estão corrigidas, com explicação curta do que era e por quê.
- Resumo final com lista do que foi mudado (ou "nada a corrigir, app já estável") + lista do que ficou pendente para uma próxima rodada.

Se você aprovar, eu executo direto e te entrego o resultado.
