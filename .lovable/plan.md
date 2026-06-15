## Estratégia
Refino sem trocar identidade (terracota + creme + Fraunces/Inter), com dark mode polido. Trabalho em **camadas**: primeiro a fundação (tokens, primitivos e padrões reutilizáveis) — isso melhora **todas** as telas de uma vez —, depois passagens cirúrgicas em cada área priorizada. Profundidade média: nada de redesign radical, foco em hierarquia, espaçamento, estados e microinterações.

---

## Fase 1 — Fundação de design (alto impacto, baixo risco)
Aplica-se ao app inteiro. Sem mudança funcional.

1. **Tokens (`src/index.css` + `tailwind.config.ts`)**
   - Revisar contraste WCAG: `muted-foreground`, `border`, `accent-foreground`, foco visível (`ring`).
   - Polir dark: corrigir `card`, `popover`, `muted`, `accent`, `secondary-foreground`, ringue terracota mais quente; sombras adaptadas (sombra clara some no escuro → usar overlays sutis).
   - Adicionar tokens: `--surface` (segundo nível de card), `--surface-2`, `--ring-offset`, `--gradient-night` (dark), `--shadow-elevated`, escala de blur/glass.
   - Escala tipográfica consistente: `display-xl/lg/md/sm`, `title`, `body`, `caption` em `tailwind.config.ts`.

2. **Primitivos shadcn unificados**
   - `Button`: revisar variants (`default`, `secondary`, `outline`, `ghost`, `destructive`) com hover/active/disabled, ring de foco, transição padrão (150 ms); novas variantes `soft` e `premium` (gradient warm) já usadas hoje de forma ad-hoc.
   - `Input`, `Textarea`, `Select`: altura, padding, foco com `ring-2 ring-ring/40`, estados de erro consistentes; label/hint helpers.
   - `Card`: padding, border, sombra padrão; variantes `interactive` (hover lift) e `flat`.
   - `Badge`, `Tabs`, `Dialog`, `Sheet`, `Dropdown`: alinhar raio, sombra e tipografia.

3. **Padrões reutilizáveis novos (`src/components/ui/`)**
   - `EmptyState` (ícone + título + descrição + CTA opcional).
   - `LoadingState` (skeleton list/grid + spinner overlay).
   - `ErrorState` (mensagem + retry).
   - `PageHeader` (título display, subtítulo, ações à direita, breadcrumb opcional).
   - `SectionHeading` (título + descrição curta, espaçamento padrão).
   - Substituir os `Loader2` soltos e textos "Carregando..." espalhados pelos novos componentes.

4. **Microinterações globais**
   - Transições padrão (`transition-colors`, `transition-transform`, `duration-150 ease-out`) nos primitivos.
   - Hover-lift sutil em cards de loja/produto (`hover:-translate-y-0.5 hover:shadow-elevated`).
   - Skeletons com shimmer leve (já existe `skeleton.tsx`, padronizar uso).
   - Toasts (sonner) com ícones de sucesso/erro/aviso consistentes.

---

## Fase 2 — Cliente (Home, Loja, Produto, Checkout, Tracking)
- **Header**: hierarquia (logo / busca / ações), sticky com blur, menu mobile mais limpo, indicador de cidade ativa.
- **Index/Home**: ordenação clara das seções (hero, categorias, banners, recomendados, lista). Espaçamento vertical consistente, títulos com `SectionHeading`, carrosséis com gradient fade nas bordas.
- **Loja (`Establishment.tsx`)**: cabeçalho com cover + logo + KPIs (nota, ETA, frete) mais legíveis; tabs de categorias com sticky e contadores; cards de produto com proporção fixa, preço destacado, badges "popular/promo" padronizados.
- **ProductQuickView / Cadeia de adicionais**: passos mais claros, sticky CTA com total, validações inline.
- **Checkout**: stepper visual, blocos colapsáveis, resumo fixo em desktop / drawer em mobile, botão principal alto-contraste.
- **PedidoTracking**: timeline mais legível, status com cor semântica, chat com layout de bolha consistente, estados vazios/erro com novos componentes.

## Fase 3 — Minha Conta
- `Tabs` com ícones e wrap em mobile (já existe; melhorar espaçamento e estado ativo).
- Cards de perfil/senha/endereço com mesmo container e ações no rodapé.
- Listas (favoritos, pedidos) com cards uniformes e `EmptyState`.
- Histórico de pedidos: linhas com hierarquia (tracking code + loja + status + total + data) e StatusBadge consistente.

## Fase 4 — Painel da loja (`minha-loja/painel/*`)
- `PainelLayout`: sidebar com agrupamentos, item ativo claro, indicador do plano, badge de pendências.
- Páginas internas (Pedidos, Cardápio, Métricas, Configurações…): `PageHeader` padrão, filtros agrupados, tabelas com zebra/hover, KPIs em `KpiCard` unificado.
- Estados de plano bloqueado (`FeatureGate`, `LockedOverlay`): visual mais convidativo (não punitivo), CTA claro de upgrade.
- Formulários longos (DadosLoja, Entrega, Personalização) divididos em seções com `SectionHeading` e sticky footer "Salvar alterações".

## Fase 5 — Painel admin (`pages/admin/*`)
- `AdminLayout` + `AdminHeader`: mesma linguagem do painel da loja, navegação lateral consistente.
- Dashboard, Aprovações, Estabelecimentos, Usuários, Categorias, Relatórios: tabelas/listas padronizadas, filtros no topo, paginação visível, ações em dropdown.
- Dialogs/modais (Nova loja, Nova categoria, etc.): mesmo padrão de spacing, footer com ação primária à direita.

---

## Fora de escopo
- Trocar fontes/paleta.
- Mudar fluxos, rotas, regras de negócio, schema ou RLS.
- Reescrever componentes funcionais (apenas envolvê-los/padronizá-los).
- Animações pesadas (Framer Motion novo, parallax, etc.).

## Entrega
Posso aplicar **Fase 1 inteira de uma vez** (é o que dá maior retorno percebido em todas as telas) e, em seguida, ir entregando Fases 2→5 em rodadas separadas para você revisar a cada passo. Confirmo após sua aprovação e começo pela Fase 1.
