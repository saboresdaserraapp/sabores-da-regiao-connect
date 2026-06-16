# Edição da taxa de entrega com aceite do cliente

## Auditoria (Fase 0) — o que já existe

Quase toda a infraestrutura já está pronta. Vamos **reutilizar**:

- Tabela `order_confirmation_proposals` (com todos os campos e CHECK de status).
- Colunas em `orders`: `final_subtotal`, `final_delivery_fee`, `final_discount`, `final_extra_fee`, `final_total`, `business_confirmation_note`, `customer_accepted_proposal_at`, `customer_rejected_proposal_at`, `confirmed_at`, `current_confirmation_proposal_id`, `confirmation_flow_status`.
- RPCs `accept_order_proposal` e `reject_order_proposal`.
- Trigger `supersede_previous_proposals` (já marca anteriores como superseded e atualiza `current_confirmation_proposal_id` + `confirmation_flow_status='proposal_sent_to_customer'`).
- Trigger `handle_order_status_change_notification` (já notifica o cliente em mudanças de status).
- Tabelas `order_status_history`, `order_messages`, `notifications`.
- Componentes: `SendProposalDialog`, `ProposalAcceptCard`.
- Lib `src/lib/orderProposals.ts`: `sendProposal`, `acceptProposal`, `rejectProposal`, `registerWhatsappAcceptance`, `confirmWithoutChange`, `fetchActiveProposal`.

**Não vai ser criado** nada novo no banco. Nenhuma migration. Nenhum componente duplicado.

## Lacunas a preencher

1. Painel `/minha-loja/:id/pedidos` (`Pedidos.tsx`) não usa `SendProposalDialog` nem bloqueia avanço de status.
2. Checkout não exibe o aviso sobre taxa estimada.
3. `OrderHistoryDetailsDialog` (perfil cliente) não mostra a proposta para aceitar/recusar.
4. Falta o botão "Registrar aceite pelo WhatsApp".

## Plano de implementação

### 1. `src/pages/minha-loja/painel/Pedidos.tsx`

- Carregar, junto da query de pedidos, os campos novos: `final_delivery_fee`, `final_total`, `confirmation_flow_status`, `current_confirmation_proposal_id`.
- Em `renderCard` e `renderKanbanCard`:
  - Mostrar selo da proposta a partir de `confirmation_flow_status`: "Frete a definir", "Aguardando aceite", "Cliente aceitou", "Cliente recusou", "Confirmado".
  - Mostrar `Taxa final` e `Total final` quando existirem.
  - Botão **Editar frete** que abre `SendProposalDialog` (props: `orderId`, `establishmentId`, `defaultSubtotal=o.subtotal`, `defaultDeliveryFee=o.final_delivery_fee ?? o.delivery_fee`, `onSent=refetch`).
  - Botão **Registrar aceite WhatsApp** (visível só quando `confirmation_flow_status='proposal_sent_to_customer'`). Abre `AlertDialog` com checkbox obrigatório e chama `registerWhatsappAcceptance`.
- Status select: interceptar `onValueChange`. Se o novo status estiver em `["confirmed_by_business","preparing","ready_for_pickup","out_for_delivery","delivered"]` **e** o pedido for de entrega (`address_id` não nulo) **e** `confirmation_flow_status` não estiver em `["customer_accepted","confirmed","not_required"]`, abrir um toast com aviso e o `SendProposalDialog` ao invés de salvar.

### 2. `src/pages/Checkout.tsx`

Acima do botão "Enviar pedido" e perto do total, quando `type==='entrega'`, adicionar bloco informativo:

> "A taxa de entrega exibida é uma estimativa inicial. O estabelecimento poderá revisar o valor conforme o endereço, acesso ao local, distância real, estrada ruim, chuva, tempestade ou outras adversidades. Caso haja reajuste, você receberá uma proposta com o valor final e o pedido só seguirá após sua confirmação."

E logo abaixo do total: "Valor final sujeito à confirmação do estabelecimento."

Garantir que o botão final continua dizendo "Enviar pedido para confirmação no WhatsApp" (verificar e ajustar texto se necessário). Confirmar que `user_id: session?.user.id ?? null` já está sendo gravado no insert (auditar e corrigir caso esteja faltando).

### 3. `src/components/profile/OrderHistoryDetailsDialog.tsx`

No topo do conteúdo do dialog, montar `<ProposalAcceptCard orderId={order.id} onChanged={refetch} />`. Componente já se auto-esconde quando não há proposta ativa.

Também exibir `final_total`/`final_delivery_fee` no resumo, quando presentes, ao invés de só `total`/`delivery_fee`.

### 4. WhatsApp message (Painel Pedidos)

Atualizar a função `msgStr` em `Pedidos.tsx` para incluir o trecho da proposta quando existir taxa final diferente da estimada, no formato pedido (subtotal, taxa estimada, taxa final, total final, observação, aviso). Suprimir linhas com valor `null`/`undefined`.

## Itens fora deste escopo (não tocar)

- Painel admin.
- Checkout flow além do aviso e do `user_id`.
- Carrinho, produtos, motoboys, referências visuais (apenas leitura no card).
- Não rodar nenhuma migration; não criar tabela/coluna/função/componente novos.

## Critérios de aceite

- Loja edita frete pelo card → proposta `sent` criada, `confirmation_flow_status='proposal_sent_to_customer'`, pedido permanece `waiting_business_confirmation`.
- Cliente vê o card de proposta em `Minha Conta › detalhes do pedido` e aceita/recusa.
- Tentativa de mudar status para confirmado/preparo/etc sem aceite é bloqueada com toast e abre o dialog de frete.
- Botão "Registrar aceite WhatsApp" confirma o pedido manualmente.
- Pedidos antigos sem proposta continuam abrindo normalmente (campos `final_*` ausentes ficam ocultos).
