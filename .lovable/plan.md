## Problema

Hoje o sininho mostra TODAS as notificações do usuário misturadas. Quando a mesma conta é dona de loja e também cliente, chegam juntas:
- Status do pedido feito como cliente
- Mensagens no chat do pedido (como cliente)
- Novos pedidos recebidos na loja
- Aceite/recusa de proposta de frete (loja)
- Suporte de loja vs suporte de cliente

## Solução

Classificar cada notificação como **"loja"** ou **"cliente"** e exibir em **duas abas** dentro do popover do sininho, com contadores de não lidas independentes. O badge externo do sino mostra a soma, mas a aba ativa por padrão depende da rota atual:
- Em `/minha-loja/*` ou `/admin/*` → abre na aba **Loja**
- Demais rotas → abre na aba **Cliente**

Nenhuma mudança de backend, RLS, triggers ou tabelas. Apenas classificação no front a partir do `type` + `related_establishment_id` cruzado com `useMyEstablishmentIds()`.

### Regra de classificação (frontend)

Uma notificação é **de loja** quando:
- `related_establishment_id` pertence a um estabelecimento do usuário, E
- o `type` é voltado ao lojista:
  - `new_order_message` (novo pedido recebido na loja)
  - `order_delivery_fee_accepted` / `order_delivery_fee_rejected` (cliente respondeu proposta)
  - `support_chat_waiting`, `support_ticket_created` (admin/loja)
  - `support_chat_*` / `support_ticket_*` quando o destino é o painel da loja

É **de cliente** quando:
- `type` é `order_status_update`, `order_chat_message`, `order_delivery_fee_proposal` (sempre — são ações dirigidas ao comprador), OU
- notificação de suporte sem `establishment_id` próprio do usuário (suporte de cliente).

Notificações sem rota/origem clara caem em "Cliente" por padrão.

## Arquivos

- **`src/components/NotificationCenter.tsx`**
  - Adicionar função `bucketFor(n)` retornando `"loja" | "cliente"` usando a regra acima + `myEstablishments`.
  - Adicionar `Tabs` (shadcn) com duas abas: "Cliente" e "Loja", cada uma com seu próprio contador de não lidas.
  - Lista filtrada por aba; "Marcar todas como lidas" passa a marcar só as da aba ativa.
  - Aba inicial decidida por `useLocation()`: rota inicia com `/minha-loja` ou `/admin` → "Loja"; caso contrário "Cliente".
  - Badge do sino continua somando ambas.

Sem alterações em `useNotifications`, rotas ou esquema.
