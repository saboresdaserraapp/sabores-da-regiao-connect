## Problema

O componente `renderCard` em `src/pages/minha-loja/painel/Pedidos.tsx` é compartilhado entre as visões Lista e Kanban. Como foi desenhado para ocupar largura total, dentro das colunas estreitas do Kanban tudo quebra mal: nome do cliente em 3 linhas, badges do status colidem com o valor, telefone se separa em outra linha, o Select de status estoura a coluna (w-[210px]), e o link "Referências" some pelo overflow.

## Solução (apenas visual/layout — sem mexer em dados/lógica)

Criar uma variante compacta de card exclusiva para o Kanban e melhorar o esqueleto das colunas. Lista permanece igual.

### 1. Card compacto do Kanban (novo `renderKanbanCard` interno)

Layout vertical, denso, hierarquia clara:

```text
┌────────────────────────────┐
│ #SDS-JYQBR4      R$ 97,00 │  ← código mono pequeno + total destacado
│ Yan Miguel C. Guimarães    │  ← nome em 1 linha (truncate)
│ 22 98105-7034 · Pix        │  ← telefone formatado + pagamento
│ 15/06 23:22 · há 2h        │  ← data curta + tempo relativo
│ ─────────────────────────  │
│ [Confirmado] [A receber]   │  ← badges status + pagamento na mesma linha
│ Sub R$82 · Taxa R$15       │  ← linha única menor
│ Obs: Troco para 50         │  ← só se houver, truncate 2 linhas
│ 🛵 Motoboy: João           │  ← só se houver
│ ─────────────────────────  │
│ [Status ▾ full-width]      │  ← select ocupa 100% da coluna
│ [WhatsApp] [Pago]          │  ← botões icon-only ou compactos, grid 2
│ [Referências ▾]            │  ← full-width, discreto
└────────────────────────────┘
```

Mudanças concretas:
- Largura: card usa `w-full` puro, sem min-widths.
- Truncamento: nome com `truncate`, obs com `line-clamp-2`.
- Tipografia: nome `text-sm font-semibold`, metadados `text-[11px] text-muted-foreground`.
- Data: formato curto `dd/MM HH:mm` + tempo relativo ("há 2h", "há 12min") via util local pequena.
- Badges: `flex-wrap gap-1`, tamanho `text-[10px] px-1.5 py-0`.
- Select de status: `w-full` (não mais 210px fixo), `h-8`.
- Botões de ação: grid 2 colunas `gap-1.5`, `size="sm"` `h-8`, WhatsApp com ícone+texto, "Marcar pago" idem. "Referências" ocupa linha inteira abaixo.
- Cor de alerta (stagnant) mantida.

### 2. Colunas do Kanban

- Trocar `grid md:grid-cols-2 lg:grid-cols-5` por um layout horizontal com scroll quando estreito:
  - `flex gap-3 overflow-x-auto pb-2 snap-x` no container.
  - Cada coluna: `min-w-[280px] max-w-[300px] flex-1 snap-start` para que em telas grandes 5 colunas caibam igualmente e em telas médias rolem horizontalmente sem espremer.
- Header da coluna fica sticky no topo da coluna: `sticky top-0 bg-muted/30 backdrop-blur z-[1]`.
- Estado vazio: caixa tracejada centralizada (`border border-dashed rounded-lg py-6 text-center text-[11px] text-muted-foreground`) em vez do "Vazio" itálico solto.
- Coluna ganha `rounded-2xl bg-muted/40 p-2 max-h-[calc(100vh-280px)] overflow-y-auto` para scroll interno por coluna.

### 3. Pequenos ajustes

- Util `formatPhoneBR(phone)` inline para mostrar `22 98105-7034` em vez de `22981057034`.
- Util `relativeTime(date)` inline retornando "agora", "há 5min", "há 2h", "há 1d".
- Nenhum dado novo, nenhuma migração, nenhuma alteração na visão Lista.

## Arquivo afetado

- `src/pages/minha-loja/painel/Pedidos.tsx` — adicionar `renderKanbanCard`, helpers de formatação, refatorar layout do `TabsContent value="kanban"`. Manter `renderCard` como está para a Lista.

## Fora do escopo

- Drag & drop entre colunas.
- Alterações em backend, RLS ou tabelas.
- Mudanças na visão Lista, no painel admin ou nas páginas do cliente.
