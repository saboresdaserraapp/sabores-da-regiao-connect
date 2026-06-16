## Objetivo
Três ajustes pequenos relacionados ao fluxo de pedidos: comunicação rápida nas referências, exibir telefone do cliente e permitir lançar a taxa de entrega em tempo real com separação no financeiro.

## 1) Botão de WhatsApp nas telas de referência
Adicionar um botão "WhatsApp" nos cabeçalhos de:
- `src/pages/DeliveryReference.tsx`
- `src/pages/VisualReference.tsx`
- `src/components/orders/CustomerReferencesPanel.tsx` (painel embutido)

Comportamento:
- Usar link `https://wa.me/<numero>?text=<msg>` (formato universal: desktop abre WhatsApp Web em nova aba, mobile abre o app).
- `target="_blank"` + `rel="noopener noreferrer"` para nunca tirar o usuário da página de referências.
- Mensagem pré-preenchida com nome da loja e código do pedido (ex.: "Olá! Sou da entrega do pedido SDS-XXXX").
- Botão só aparece se `order.customer_phone` existir.
- Estilo: variant outline com ícone do WhatsApp (lucide `MessageCircle` já usado no projeto).

## 2) Telefone do cliente na página do pedido (cliente)
Em `src/pages/minha-conta/PedidoDetalhes.tsx` adicionar uma linha "Telefone" no bloco de informações do cliente, mostrando `order.customer_phone` formatado. (No painel da loja já existe em `pedidos/PedidoDetalhes.tsx` linha 142.)

## 3) Taxa de entrega em tempo real + separação no financeiro
Backend já permite (`orders.delivery_fee` é atualizável pelo painel — fluxo existente em `pedidos/PedidoDetalhes.tsx`). Ajustes:

- **Painel do pedido (`src/pages/minha-loja/pedidos/PedidoDetalhes.tsx`):**
  - Garantir que ao salvar a taxa, `total` (= `subtotal + delivery_fee`) também é recalculado e persistido, para o cliente e relatórios verem o valor correto.
  - Mostrar feedback (toast) "Taxa atualizada — cliente verá o novo total".
  - Como a `orders` tem realtime habilitada, a tela do cliente (`minha-conta/PedidoDetalhes`) atualiza automaticamente — apenas confirmar que o componente reage à mudança (usa `useOrder` com subscription).

- **Relatórios (`src/pages/minha-loja/painel/Financeiro.tsx` e/ou `Metricas.tsx`):**
  - Adicionar coluna/cartão "Receita de entregas" = soma de `delivery_fee` dos pedidos entregues no período.
  - Receita da loja (produtos) = soma de `subtotal`.
  - Receita total = subtotal + delivery_fee.
  - Sem mudança de schema — apenas leitura agregada.

## Detalhes técnicos
- Reuso do helper `src/lib/whatsapp.ts` para montar o link (verificar e estender se necessário).
- Sem migrations: campos `delivery_fee` e `customer_phone` já existem em `orders`.
- Sem mudanças de RLS.

## Fora de escopo
- Cobrança automática / split de pagamento.
- Edição da taxa pelo cliente.
- Notificação push extra ao alterar taxa (só o toast + realtime já existente).
