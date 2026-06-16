# Polimento de UI/UX em todo o aplicativo (escopo controlado, sem mudar funcionalidades)

## Princípio

Manter 100% das funcionalidades, identidade visual (paleta terracotta/creme/forest, Fraunces + Inter) e fluxos atuais. As melhorias são **transversais**, aplicadas via tokens e componentes compartilhados, para que cada página ganhe consistência sem reescritas.

Este plano é executado em ondas curtas — você aprova cada onda antes de eu seguir.

## Onda 1 — Tokens, tipografia e elevação (base que afeta tudo)

Arquivos: `src/index.css`, `tailwind.config.ts`.

- **Tipografia escalonada (`@layer base`):** estilos consistentes para `h1..h4` com clamp responsivo (`h1: clamp(1.75rem, 4vw, 2.5rem)` etc.), peso, `line-height` (1.15 títulos / 1.55 corpo) e tracking. Hoje cada página define manualmente.
- **Foco visível padronizado:** `:focus-visible` global com `outline` em `--ring` + offset (acessibilidade AA).
- **Tokens novos (HSL):**
  - `--ring-offset` para foco consistente
  - `--shadow-soft`/`--shadow-card`/`--shadow-elevated` reequilibrados (sombras atuais variam pouco entre si)
  - `--gradient-mesh` sutil para hero
  - `--surface-3` (camada extra para empty/loading)
- **Container:** ampliar paddings em `sm`/`lg` (já existem), adicionar `breakpoint xl` para evitar conteúdo coladinho em 1280-1536.
- **`prefers-reduced-motion`:** desativar animações pesadas globalmente.
- **Utilitários:** `.text-balance`, `.text-pretty`, `.section-y` (espaçamento vertical padrão entre seções), `.stack-*` simples para ritmo vertical, `.card-hover` (substitui várias variações soltas de hover).

Risco: muito baixo (apenas tokens e classes utilitárias novas; nada é renomeado).

## Onda 2 — Componentes shadcn customizados (variantes faltantes)

Arquivos: `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, `empty-state.tsx`, `loading-state.tsx`, `page-header.tsx`.

- **Button:** adicionar variantes `gradient` (warm) e `soft` (primária com bg `primary/10`), tamanho `xl` para CTAs móveis (h-12, gap maior), `min-h-11` em `size="icon"`. Loading state interno (`isLoading` opcional com spinner) sem trocar API.
- **Card:** variantes `interactive` (hover-lift + cursor-pointer + ring focus) e `muted`.
- **Input/Textarea/Select:** harmonizar altura (`h-11` mobile, `h-10` desktop), `rounded-xl`, `placeholder:text-muted-foreground/70`, estado de erro consistente quando `aria-invalid`.
- **Badge:** variantes `success`, `warning`, `info` (hoje só há default/secondary/destructive — vários lugares hardcodam cores).
- **EmptyState/LoadingState/ErrorState:** padronizar ícone + título + descrição + CTA, com presets para "carrinho vazio", "sem pedidos", "sem resultados". Migrar usos manuais incrementalmente.
- **PageHeader:** breadcrumb opcional, título, descrição, ações — usar em todas as páginas de painel/admin para alinhamento.

Risco: baixo. APIs antigas continuam funcionando (variantes adicionadas, não substituídas).

## Onda 3 — Navegação e shell (`Header`, mobile bottom nav, scroll, skip-link)

Arquivos: `src/components/Header.tsx`, `src/App.tsx`, `src/components/CartFloatingButton.tsx`, `src/components/FloatingOrdersButton.tsx`.

- **Header:** condensar em scroll (sticky com sombra ao rolar), agrupar ações em ícones com `aria-label`, menu mobile em `Sheet` consistente.
- **Skip-to-content link** acessível no topo.
- **Posicionamento dos botões flutuantes:** empilhar com gap fixo (hoje podem sobrepor), garantir `safe-area-inset-bottom`.
- **Scroll-restoration** ao trocar de rota (`useEffect` em `<ScrollToTop />`).
- **Container `<main>`** único por rota (atualmente alguns layouts faltam): wrappear cada rota.

Risco: baixo a médio (mudanças no shell visíveis em todas as páginas).

## Onda 4 — Páginas do cliente (Index, Loja, Establishment, Checkout, MinhaConta, PedidoTracking)

Aplicar os tokens/componentes da Onda 1-2; sem refazer layouts.

- **Index / Loja:** ritmo de seção (`.section-y`), espaçamentos consistentes do grid de cards (`gap-4 md:gap-6`), `EstablishmentCard` com hover unificado, `LojaFilters` em `Sheet` no mobile, chips de categoria com snap horizontal.
- **Establishment:** sticky tabs de categoria do cardápio com sombra ao colar; `ProductCard`/`ProductRow` com tipografia e preço consistentes; `ProductQuickView` com `Drawer` no mobile.
- **Checkout:** já refinado recentemente — só padronizar espaçamento das `section`s e adotar `Button` xl no CTA.
- **MinhaConta / PedidoTracking:** usar `PageHeader`, `StatusBadge` com nova paleta de variantes, `OrderStatusStepper` com micro-animação de progresso.
- **Auth (Login/Cadastro/RecuperarSenha/ResetPassword):** layout split em desktop (ilustração + form), card centralizado no mobile, mensagens de erro inline (não toast) nos campos.

Risco: médio (toca muitas páginas, mas só visual).

## Onda 5 — Painel do lojista e Admin (consistência entre dezenas de páginas)

Arquivos: `PainelLayout`, `AdminLayout`, todas páginas em `pages/minha-loja/painel/*` e `pages/admin/*`.

- **Layout uniforme:** `PageHeader` em todas, mesma largura de container, espaçamento vertical entre cards (`stack-6`).
- **Tabelas:** usar `table-scroll` em mobile, zebra opcional, header sticky, `EmptyState` quando vazio.
- **Formulários:** alinhar labels (`Label` shadcn), grid 2-col em desktop com colapso mobile, botões agrupados no rodapé (`flex justify-end gap-2`).
- **KPIs:** `KpiCard` com variação visual de delta (verde/vermelho), skeleton enquanto carrega.
- **Sidebar admin:** ativo com `bg-primary/10 text-primary` consistente, separador entre grupos.

Risco: médio (muitos arquivos, mas mudanças locais e visuais).

## Onda 6 — Estados, micro-interações e responsividade final

- **Skeletons** em todas as listas/cards (substituir spinners "tela toda").
- **Toasts:** padronizar duração e ícones por tipo (`success` / `error` / `info`).
- **Transições suaves** com `data-state` em `Dialog`/`Sheet`/`Tabs` (já vêm da Radix; só ajustar duração).
- **Touch targets ≥ 44px** revisados em botões flutuantes, abas e chips.
- **Smoke test responsivo** em 360/390/768/1280 nas páginas principais via `browser--view_preview`.

Risco: baixo.

## O que **não** muda

- Identidade (paleta, gradientes, Fraunces/Inter).
- Estrutura de rotas, hooks, queries, RLS, schemas.
- Comportamento de submissão, validações de negócio, integrações WhatsApp.
- Nomes de classes utilitárias existentes (todos os novos tokens são adições).

## Como confirmar que nada quebrou

- `bunx tsc --noEmit` ao final de cada onda.
- `browser--view_preview` nas rotas chave (`/`, `/loja`, `/e/forno-da-vila`, `/e/forno-da-vila/checkout`, `/minha-conta`, `/minha-loja`, `/admin`) em desktop e mobile.
- Manter as suites de teste existentes (`vitest`) verdes.

## Próximo passo

Se aprovar, executo a **Onda 1** primeiro (tokens + tipografia + utilitários — base segura) e te mostro o resultado antes de seguir para as demais.
