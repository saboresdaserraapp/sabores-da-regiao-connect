# Auditoria — Checkout + Página do Pedido com referências

## O que descobri investigando o código

### Fluxo atual hoje
1. **Checkout** (`src/pages/Checkout.tsx`)
   - Carrega referência específica do endereço (`useHouseReference(addressId)`) + referência global (`useHouseReference(undefined)`) e usa a primeira que existir.
   - Quando o usuário envia, cria registro em `order_visual_reference_links` com `private_token` e gera a URL `/referencia/:token`.
   - Salva esse link em `checkout_delivery_info.visual_reference_link` (somente se delivery v2 estiver ligado).
   - Passa metadados (`mediaCount`, `hasVideo`, `hasInstructions`, `hasPins`) para a mensagem do WhatsApp.

2. **Página do pedido** (`src/pages/PedidoTracking.tsx`)
   - Carrega o pedido via RPC `get_order_by_tracking` e renderiza status + detalhes.
   - **Não renderiza nenhuma referência visual** — esse é o gap principal que você descreveu.

3. **Painel da loja** (`OrderReferencesPanel`) já mostra as referências corretamente para o lojista.

### Problemas encontrados (priorizados)

| # | Severidade | Problema | Arquivo |
|---|---|---|---|
| 1 | 🔴 Alta | **A página do pedido do cliente não exibe as imagens/instruções de referência** que foram anexadas no checkout. O cliente não tem visibilidade do que foi enviado. | `PedidoTracking.tsx` |
| 2 | 🟠 Média | **Sem guard de loading**: usuário pode clicar "Enviar" antes de `useHouseReference` terminar, e o link da referência **não é criado** (silenciosamente). | `Checkout.tsx:140` |
| 3 | 🟠 Média | **Checkout não mostra ao usuário** quais referências serão anexadas. Envia "no escuro". Resultado: usuário não sabe que tem (ou que falta) referência cadastrada. | `Checkout.tsx` |
| 4 | 🟡 Baixa | **Auto-fill de endereço só roda quando v2 está ligado** (linha 78: `if (!v2 || ...)`). Em lojas não-v2 o `selectedAddressId` fica vazio, então **só a referência global** é considerada — a específica por endereço nunca é usada. | `Checkout.tsx:77` |
| 5 | 🟡 Baixa | **`checkout_delivery_info` só é inserido quando v2 está ligado**, então em lojas não-v2 o link da referência só existe em `order_visual_reference_links` (recuperável, mas frágil). | `Checkout.tsx:226` |
| 6 | 🟡 Baixa | **`order_visual_reference_links` não tem fallback de mídia direta** — se o `house_references` referenciado for editado/apagado depois, o link mostra dados diferentes do que foi enviado. Snapshot ausente. | DB schema |

## O que vou corrigir nesta rodada

### 1. Mostrar referências na página do pedido do cliente (correção principal)
- Em `PedidoTracking.tsx`, adicionar nova `section` "Referências enviadas para a entrega".
- Buscar `order_visual_reference_links` pelo `order_id`, fazer join com `house_references` + `house_reference_media`.
- Renderizar: galeria de fotos (clicáveis), vídeo (se houver), pins, instruções escritas — mesmo layout limpo da página `/referencia/:token`.
- Se o pedido não for entrega ou não tiver referência, esconder a seção (sem mensagem de erro).

### 2. Endurecer o envio do Checkout
- Desabilitar o botão "Enviar" enquanto `isLoadingHouseRef` for `true` (com tooltip "Carregando referências…").
- Adicionar um card resumo **antes do botão de enviar**, somente quando type = entrega:
  - Se `houseRef` existir: "📎 X fotos, vídeo, instruções serão anexadas à sua entrega" com link para `/minha-conta` editar.
  - Se não existir: aviso opcional "Sem referência cadastrada — você pode adicionar uma em Minha Conta para facilitar futuras entregas" (não-bloqueante).

### 3. Cobrir lojas não-v2
- Mover o `useEffect` de auto-seleção de endereço para rodar **sempre que houver `addresses`**, não só em v2. Continua respeitando `is_default`.
- Salvar o `visual_reference_link` no próprio `orders` (campo dedicado) **ou** garantir que sempre seja criado em `order_visual_reference_links` (já é). Vou usar a segunda opção, já consistente.

### 4. Sem mudanças de banco nesta rodada
- Snapshot de mídia (item 6) exigiria migration + alteração no fluxo de save; deixo isso documentado e pergunto antes de implementar. O risco é baixo no curto prazo porque `house_reference_media` raramente é apagado.

## Critério de pronto
- `tsc --noEmit` continua 0 erros.
- Console limpo na rota `/pedido/:code` e `/e/:slug/checkout`.
- Fluxo manual:
  1. Adicionar produto → checkout → escolher entrega.
  2. Botão "Enviar" mostra estado de loading enquanto referências carregam.
  3. Resumo das referências aparece antes do envio.
  4. Após envio, redireciona para `/pedido/:code` e a nova seção "Referências enviadas" mostra fotos/vídeo/pins corretamente.

## Não vou tocar nesta rodada
- Layout/cores do checkout ou da página de pedido (só adições mínimas).
- Schema do banco (snapshot de mídia fica como follow-up se você confirmar).
- `OrderReferencesPanel` da loja (já funciona).
- Fluxos de motoboy.

Aprovado, eu implemento direto.
