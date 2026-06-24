# Plano: Eliminar tela branca e blindar hooks/Cart

Objetivo: tornar a home e o `CartFloatingButton` resilientes a falhas de hook/HMR/render, com diagnóstico claro quando `useAddresses` falhar, e validar o comportamento via Playwright.

## 1. Refatorar `useAddresses` para ordem estável de hooks
- Mover `useId()` para o topo do hook, antes de qualquer `if/return`, e manter `useEffect` e `useQuery` sempre chamados (sem retornos condicionais).
- Guard interno: `enabled: !!user?.id` no `useQuery` e early-return dentro do `useEffect` (não fora dos hooks).
- Reusar a mesma assinatura de canal `addresses-${user.id}-${instanceId}` mas garantir cleanup idempotente (`removeChannel` em try/catch).
- Tipar retorno como `{ data, isLoading, error }` direto do `useQuery` (sem mudanças de API para os consumers).

## 2. Logs e fallback em `useAddresses`
- Em `queryFn`: `console.error("[useAddresses] query failed", { userId, error })` antes de re-lançar.
- No `useEffect` do realtime: log de subscribe status (`SUBSCRIBED` / `CHANNEL_ERROR` / `TIMED_OUT`) com prefixo `[useAddresses:rt]`.
- Expor `error` para consumers e exibir, no `CartFloatingButton`, um toast silencioso (apenas console) quando `addresses` falhar — sem quebrar render.
- Mensagem de fallback: se `error` ocorrer, hook devolve `data: []` (via `?? []`) para o consumer continuar renderizando.

## 3. Refatorar `CartFloatingButton` para ordem estável
- Garantir que TODOS os hooks (`useCart`, `useAuth`, `useState`, `useQuery`, `useDeliverySettings`, `useDeliveryRegions`, `useAddresses`, `useEffect`) sejam chamados incondicionalmente no topo, antes do `if (!enabled) return null`.
- Hoje já estão no topo, mas vamos travar isso com um comentário `// keep hook order stable — do not early-return above`.
- Envolver cálculo de `preview` em `try/catch` defensivo retornando `null` em erro, com `console.warn`.

## 4. Error Boundary
- Criar `src/components/ErrorBoundary.tsx` (class component) com:
  - Props: `fallback?: ReactNode`, `name?: string` (para logs), `children`.
  - `componentDidCatch`: `console.error("[ErrorBoundary:${name}]", error, info)`.
  - Fallback default: card discreto "Algo deu errado nesta seção. Recarregue a página." com botão "Tentar novamente" que reseta o estado.
- Envolver:
  - `<Index />` no `src/App.tsx` (ou dentro do próprio `Index.tsx` na raiz do retorno) com fallback de página inteira.
  - `<CartFloatingButton />` onde ele é montado (provavelmente `App.tsx`) com fallback `null` (some silenciosamente, sem derrubar a home).

## 5. Teste Playwright
- Novo arquivo: `tests/e2e/home-blank-screen.spec.ts` (criar pasta `tests/e2e` + config mínima `playwright.config.ts` apontando para `http://localhost:8080`).
- Cenários:
  1. `goto('/')` → aguarda `domcontentloaded` → asserta `#root` tem `innerHTML.length > 5000` e contém texto "Descubra os sabores".
  2. Hard reload (`page.reload({ waitUntil: 'networkidle' })`) → repete assertiva.
  3. Adiciona item ao carrinho via `window.__cartTestHelper` (ou clica no primeiro `ProductCard` "Adicionar") → espera `[aria-label*="Abrir carrinho"]` ficar visível → asserta texto "Ver pedido".
  4. Captura `page.on('pageerror')` e `console` errors; falha o teste se houver erro não-esperado.
- Script npm: `"test:e2e": "playwright test"`.
- NOTA: não rodaremos `playwright install` no projeto (pesa muito). O teste fica disponível para execução manual/CI; documentar no README do teste.

## Detalhes técnicos

### Arquivos a alterar/criar
```text
src/hooks/useAddresses.ts          (refactor + logs)
src/components/CartFloatingButton.tsx (try/catch defensivo + comentário)
src/components/ErrorBoundary.tsx   (novo)
src/App.tsx                        (envolver Index e CartFloatingButton)
tests/e2e/home-blank-screen.spec.ts (novo)
playwright.config.ts               (novo, mínimo)
package.json                       (script test:e2e, devDep @playwright/test)
```

### Compatibilidade
- API pública de `useAddresses` permanece `{ data, isLoading, error, ... }`. Nenhum consumer precisa mudar.
- `ErrorBoundary` é puramente aditivo.

### Fora do escopo
- Não mexer em `useFavorites` (já corrigido na rodada anterior).
- Não tocar em RLS/migrations.
- Não alterar lógica de cálculo de frete.

Pronto para implementar quando você aprovar.