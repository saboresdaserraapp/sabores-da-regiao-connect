# Checkout mais inteligente: região automática, dados reaproveitados e pagamento selecionável

## Objetivo

No `/checkout/:slug`, eliminar redigitação e fazer o sistema reconhecer automaticamente a região do endereço escolhido. Pagamento passa a ser selecionado entre as formas aceitas pela loja, sem texto livre.

## 1. Reconhecimento automático da região de entrega

Hoje o `matchRegionByName` só roda a partir de `data.neighborhood`/`data.popular_location_name` digitados e o `useEffect` trava (`if (selectedRegion) return`), então trocar de endereço salvo não re-detecta.

Mudanças em `src/pages/Checkout.tsx`:

- Quando o usuário seleciona um endereço salvo (clique nos cards ou auto-default no `useEffect`), além de preencher `data`, executar `matchRegionByName(regions, address.neighborhood, address.popular_location_name)` e gravar em `selectedRegion`.
- Re-rodar o auto-match sempre que `selectedAddressId`, `regions` ou os campos relevantes de `data` mudarem (remover o early-return `if (selectedRegion)` e usar como dependência a chave do endereço).
- Se nenhuma região bater, manter o fallback atual (lista manual + cálculo por distância via `resolveDeliveryFeeWithDistance`, que já existe).
- Mostrar visualmente: "Região detectada: **<nome>**" (já existe via `deliveryInfo.autoMatched`) e, quando vier por seleção do card de endereço, marcar a região correspondente na lista para feedback.

## 2. Reaproveitar dados do perfil e do endereço salvo

Hoje o formulário "Seus dados" sempre mostra Nome, WhatsApp e (em entrega) Rua/Número/Bairro mesmo quando o usuário logado já tem endereço padrão.

Mudanças:

- Novo hook leve `useProfile()` (ou query inline) lendo `profiles` (`display_name`, `phone`) do usuário logado.
- No `useEffect` inicial, preencher `data.name`/`data.phone` priorizando: `address.customer_name/phone` → `profile.display_name/phone` → vazio.
- Esconder o bloco "Seus dados" quando:
  - usuário está logado, **e**
  - há `selectedAddressId` (em entrega) **ou** há nome+telefone vindos do perfil (retirada/local).
  Substituir por um cartão compacto: "Pedido em nome de **{nome}** · {telefone}" com botão "Editar" que reabre os inputs (estado `editContact`).
- Em entrega, **não** mostrar mais os campos Rua/Número/Bairro quando há endereço selecionado — eles já vêm do card. Manter apenas se o usuário clicar "Editar endereço" (abre o `Dialog` existente, já presente).
- Para usuários não logados (checkout convidado), manter o formulário atual.

## 3. Forma de pagamento selecionável

Hoje `<Field label="Pagamento" />` é texto livre. Trocar por um seletor com as formas aceitas pela loja (`est.payments`, já carregado).

- Adicionar `import { RadioGroup, RadioGroupItem }` de `@/components/ui/radio-group` e `Label`.
- Renderizar uma grade de chips/radios com os valores de `e.payments` (ex.: Pix, Crédito, Débito, Dinheiro). Selecionado grava em `data.payment`.
- Se a loja não tiver `payments` cadastrados, fallback para `["Pix", "Dinheiro"]`.
- Validar no `onSend`: pagamento obrigatório (toast "Selecione a forma de pagamento").
- Quando "Dinheiro" for selecionado, exibir um input opcional "Troco para R$ …" (grava em `data.note` ou novo `data.change_for`).

## 4. Detalhes técnicos

- Arquivos editados:
  - `src/pages/Checkout.tsx` — auto-match de região ao trocar endereço, reaproveitamento de dados do perfil, esconder formulário redundante, seletor de pagamento.
  - `src/hooks/useProfile.ts` (novo, ~20 linhas) — `useQuery(["profile", user.id])` em `profiles` retornando `display_name` e `phone`.
- Sem mudanças em `deliveryFee.ts`, `useAddresses.ts`, `useDeliverySettings.ts` ou schema do banco.
- Sem mudanças no fluxo de submissão (`onSend`) além da validação de pagamento e do novo opcional de troco.

## 5. Fora do escopo

- Geocoding reverso por CEP (poderia melhorar o match, mas exige API externa — proponho em fase posterior se desejado).
- Mudar o formato salvo do pagamento no banco (continua string em `orders.payment_method`).
