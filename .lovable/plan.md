## Objetivo

1. Tornar cada mensagem do chat visualmente distinta por autor (cliente, lojista, suporte, sistema).
2. Permitir anexar arquivos (até 20 MB), mídia (até 10 MB) e colar conteúdo da área de transferência.

Aplicado nos três canais existentes (Chat do Pedido, Chat de Suporte Rápido, Tickets) reusando estruturas, sem duplicar.

---

## 1. Estilo visual por remetente

Alterar apenas o render das bolhas em:
- `src/components/support/ChatPanel.tsx` (suporte rápido)
- `src/components/OrderChat.tsx` (chat do pedido)
- `src/components/support/TicketDetail.tsx` (tickets)

Regras de layout:

| Remetente | Lado | Cor da bolha | Texto |
|---|---|---|---|
| Você (mine) | direita | `bg-primary` | `text-primary-foreground` |
| Loja | esquerda | `bg-amber-100 border-amber-300` | `text-amber-950` |
| Cliente (visto pelo outro lado) | esquerda | `bg-background border` | `text-foreground` |
| Suporte (admin) | esquerda | `bg-blue-100 border-blue-300` | `text-blue-950` |
| Sistema | centralizado, largura total reduzida | `bg-muted text-muted-foreground` itálico, sem rótulo "Você" | — |
| Nota interna (ticket) | mantém `bg-yellow-50 border-yellow-300` já existente |

Cabeçalho da bolha (rótulo) mantém a lógica atual (`Suporte` / `Loja` / `Cliente` / `Sistema` / `Você`), mas a cor da bolha deixa de depender só de `mine`.

Helper local em cada componente:
```ts
function bubbleClass(role, mine) { ... }
function alignClass(role, mine) { ... }  // sistema => justify-center
```

Tokens semânticos: usar classes Tailwind existentes; não criar tokens novos no `index.css` (mantém a referência visual atual do app, só varia a paleta de bolhas).

---

## 2. Anexos (arquivos, mídia e colar)

### 2.1 Storage
Criar bucket privado único `chat-attachments` via migration.

Estrutura de caminhos:
```
order/{order_id}/{user_id}/{uuid}-{filename}
support/{chat_id}/{user_id}/{uuid}-{filename}
ticket/{ticket_id}/{user_id}/{uuid}-{filename}
```

RLS no `storage.objects` para bucket `chat-attachments`:
- INSERT: usuário autenticado, prefixo `{tipo}/{id}/{auth.uid()}/...` e participação validada pelas mesmas regras dos chats (reusa `has_role`, `is_establishment_member`, `auth.uid() = order.user_id` etc.).
- SELECT: participantes do recurso (cliente do pedido, membro do estabelecimento, admin, autor do ticket).
- DELETE: somente autor ou admin.

URLs servidas via `createSignedUrl` (1 h).

### 2.2 Schema de mensagens
Reusar colunas existentes onde possível:
- `support_ticket_messages.attachments jsonb` já existe → usar.
- `order_messages` e `support_chat_messages`: adicionar coluna `attachments jsonb not null default '[]'::jsonb` (migration).

Formato:
```json
[{ "path": "...", "name": "foto.jpg", "mime": "image/jpeg", "size": 812233, "kind": "image" }]
```

`kind`: `"image" | "video" | "audio" | "file"`.

### 2.3 Hook compartilhado
Novo `src/hooks/useChatAttachments.ts`:
- `uploadAttachments(files, { scope, scopeId })` → valida tamanho, infere `kind`, sobe ao bucket, retorna array no formato acima.
- `getSignedUrl(path)` com cache simples.
- Limites:
  - imagens/vídeo/áudio (`image/*`, `video/*`, `audio/*`): **10 MB**.
  - demais arquivos: **20 MB**.
- Tipos bloqueados: executáveis (`.exe .bat .cmd .msi .sh .app`).

### 2.4 Novo componente `ChatComposer`
`src/components/support/ChatComposer.tsx`:
- Textarea + botão de anexo (ícone `Paperclip`) + botão de enviar.
- `<input type="file" multiple hidden>` aberto pelo clip.
- Drag-and-drop na textarea.
- Handler `onPaste`: capta `clipboardData.files` (imagens coladas) e `text/plain`.
- Lista de anexos pendentes com preview (thumb para imagem, ícone para arquivo) e botão remover.
- Props: `onSend(text, attachments)`, `scope`, `scopeId`, `disabled`.
- Substitui o bloco de input atual em `ChatPanel`, `OrderChat` e `TicketDetail`.

### 2.5 Render de anexos na bolha
Novo `src/components/support/AttachmentList.tsx`:
- Imagem: thumb 160 px, clique abre em nova aba com signed URL.
- Vídeo/áudio: `<video controls>` / `<audio controls>` com signed URL.
- Outros: chip com ícone, nome, tamanho legível e botão download.

### 2.6 Envio
Adaptar:
- `useSendChatMessage` (suporte rápido) → aceitar `attachments`.
- `useSendOrderMessage` em `useOrderMessages.ts` → idem.
- `useSendTicketMessage` em `useSupportTickets.ts` → idem (coluna já existe).

Permitir enviar mensagem somente com anexos (sem texto), desde que `attachments.length > 0`.

---

## 3. Segurança

- RLS dos buckets espelha RLS das tabelas correspondentes; sem novos papéis.
- Triggers existentes de notificação (`handle_order_message`, `handle_support_chat_message`, `handle_support_ticket_message`) não mudam — texto de notificação ganha sufixo `"📎 N anexo(s)"` quando `attachments` não vazio, dentro do mesmo trigger.
- Nada cruza canais: caminhos no Storage e RLS são por escopo.

---

## 4. Fora de escopo (não alterar)

Checkout, carrinho, produtos, motoboys, cálculo de entrega, painel admin fora de suporte, layout geral / referências visuais do app. Apenas as bolhas e o composer dos três chats mudam.

---

## 5. Critérios de aceite

1. Em cada chat, mensagens de cliente, loja, suporte e sistema têm cor e alinhamento distintos.
2. Botão de clip envia arquivos (≤20 MB) e mídias (≤10 MB).
3. Colar (Ctrl+V) imagem ou texto na caixa funciona.
4. Anexos aparecem na bolha (thumb/preview ou chip) e abrem via URL assinada.
5. Notificações continuam roteadas corretamente por canal.
6. RLS bloqueia download por quem não é participante.

---

## Detalhes técnicos (migrations)

```sql
-- 1) Colunas attachments
alter table public.order_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.support_chat_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- 2) Bucket
insert into storage.buckets (id, name, public)
values ('chat-attachments','chat-attachments', false)
on conflict (id) do nothing;

-- 3) Policies storage.objects para bucket 'chat-attachments'
--    (INSERT/SELECT/DELETE conforme regras acima, reusando helpers)
```
