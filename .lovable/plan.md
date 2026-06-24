## Auditoria rápida

| Demanda | Situação atual | Ação |
|---|---|---|
| Snapshot do carrinho (itens, subtotal, taxa, total) salvo junto com `tracking_code` | **Já existe.** A tabela `orders` salva `items` (jsonb com `product_name_snapshot`, `quantity`, `unit_price_snapshot`, `selected_options_snapshot_json`, `total_price`), `subtotal`, `delivery_fee`, `total`, `tracking_code` e `status_history`. A RPC `get_order_by_tracking` já devolve tudo isso para a tela de acompanhamento. | **Nenhuma** mudança de schema. Só ajustar a UI (item 4). |
| Rota `/pedido/{code}` para status + histórico | **Já existe.** `App.tsx` registra `<Route path="/pedido/:code" element={<PedidoTracking />} />` que distribui entre `PedidoTrackingPublic` (visitante), `PedidoCliente` (dono do pedido) e `PedidoDetalhesLoja` (estabelecimento). `PedidoTrackingPublic` já mostra `OrderStatusStepper`, resposta da loja, total, itens e atualiza em tempo real via canal Realtime + polling 30s. | **Nenhuma** mudança. Pode receber pequenos polimentos no item 4. |
| Botão copiar/compartilhar link em `/checkout` (tela de confirmação) | Parcial: o `ConfirmationScreen` recém-criado tem "Copiar" do **código**, mas não do **link** `/pedido/{code}`, e não usa `navigator.share`. | **Ajustar** — adicionar botão "Copiar link" e botão "Compartilhar" (Web Share API com fallback para copiar). |
| Botão reenviar WhatsApp na tela de confirmação | **Não existe.** O `ConfirmationScreen` não guarda a mensagem nem o WhatsApp do estabelecimento. | **Adicionar** — incluir `whatsapp` e `whatsappMessage` no snapshot e renderizar botão "Reenviar pelo WhatsApp". |

## O que muda — só frontend

### `src/pages/Checkout.tsx`

1. Estender o tipo `ConfirmationSnapshot`:
   - `whatsapp: string` (do estabelecimento)
   - `whatsappMessage: string` (a `msg` já construída via `buildWhatsappMessage`)
   - `trackingUrl: string` (montada com `${window.location.origin}/pedido/${trackingCode}`)
2. Preencher esses três campos no objeto `snapshot` antes do `setConfirmation`.
3. Em `ConfirmationScreen`:
   - Adicionar dois botões abaixo do bloco do código: **Copiar link** (usa `navigator.clipboard.writeText(trackingUrl)`) e **Compartilhar** (tenta `navigator.share({ title, text, url })` e cai para copiar quando indisponível). Reaproveitar o estado `trackingCopied` e adicionar `linkCopied`.
   - Adicionar um botão `Reenviar pelo WhatsApp` (verde, ícone `MessageCircle`) acima de "Ver acompanhamento", que chama `window.open(whatsappLink(whatsapp, whatsappMessage), "_blank")`.
4. Pequeno polimento: incluir o `trackingUrl` em um campo `aria-label`/`title` para acessibilidade do botão de copiar link.

### Nada a tocar
- Migração de banco: **não precisa**, snapshot já persiste em `orders.items` + colunas de totais.
- Rota `/pedido/:code`: **não precisa**, já existe e já consome o snapshot via RPC `get_order_by_tracking`.
- `PedidoTrackingPublic`, `PedidoCliente`, `useOrderTracking`: **não precisam** de mudança para atender as 4 demandas.

## Detalhes técnicos

- `whatsappLink` e `buildWhatsappMessage` já estão importados em `Checkout.tsx`. Vou apenas guardar a `msg` resultante (linha 333) em uma variável já existente e referenciá-la no snapshot.
- Web Share API: detectar via `if (typeof navigator !== "undefined" && "share" in navigator)`. Fallback para clipboard com toast informativo.
- Reenviar: como a `msg` é a mesma já enviada e o `tracking_code` é o mesmo, não há gravação adicional no banco — apenas abre `wa.me` de novo.
- Sem novos componentes ou arquivos. Sem mudanças em RLS, RPC, hooks ou rotas.

## Fora de escopo
- Persistir `whatsapp_message` editada para reenvio: a coluna `orders.whatsapp_message` já é atualizada após o primeiro envio; reusamos a `msg` em memória, evitando uma leitura extra.
- Encurtador de URL: não é necessário — `wa.me` aceita o link inteiro do tracking.
