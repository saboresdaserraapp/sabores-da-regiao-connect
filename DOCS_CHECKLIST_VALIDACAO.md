
# Checklist de Validação de Legados e Atualizações

Para garantir que a transição entre cadastros legados (simples) e novos (completos/v2) ocorra sem erros no cardápio público, carrinho e WhatsApp, siga este checklist:

## 1. Cadastro de Produtos (Admin)
- [ ] **Persistência de Opcionais (JSONB):** Verificar se produtos criados com a lista simples de adicionais no `PainelProdutos.tsx` salvam corretamente na coluna `options` (JSONB) e se esses dados persistem ao editar.
- [ ] **Validação de Preços:** No `EditarProduto.tsx`, confirmar se o `promotional_price` é bloqueado caso seja maior ou igual ao `price`.
- [ ] **Selo de Promoção:** Garantir que o `promotion_label` seja salvo e que, na ausência dele, o sistema use um padrão (ex: "Promoção") se `promo` estiver ativo.
- [ ] **Estoque Legado:** Verificar se produtos sem `track_stock` definido (nulo) são tratados como estoque infinito/disponível por padrão.

## 2. Cardápio Público (`Establishment.tsx`)
- [ ] **Carregamento Híbrido:** O card de produto deve exibir o preço promocional (se ativo) e o selo.
- [ ] **Fallback de Adicionais:** O modal de preview deve detectar se o produto usa `product_option_groups` (V2) ou `options` (Legado JSONB) e renderizar a interface correta para ambos.
- [ ] **Cálculo de Subtotal no Modal:** O preço base deve ser o promocional (se ativo) somado aos adicionais selecionados, multiplicado pela quantidade.
- [ ] **Obrigatoriedade:** Validar se o botão "Adicionar" bloqueia a ação caso existam grupos obrigatórios (V2) sem seleção.

## 3. Carrinho e Checkout
- [ ] **Estrutura do Item:** O objeto `CartItem` no `cart.ts` deve receber `unitPrice` calculado corretamente (preço promo + adicionais).
- [ ] **Persistência LocalStorage:** Verificar se itens com a estrutura legada de `options` no LocalStorage não quebram o checkout após a atualização do código.
- [ ] **Exibição no Checkout:** Os adicionais devem aparecer listados com seus respectivos preços extras, se houver.

## 4. Envio ao WhatsApp (`whatsapp.ts`)
- [ ] **Formatação da Mensagem:** Garantir que o loop de itens inclua o nome do produto, quantidade, subtotal do item e a lista de adicionais/observações.
- [ ] **Valores Numéricos:** Forçar a conversão `Number()` em todos os cálculos de preço para evitar `NaN` na mensagem final.
- [ ] **Link de Rastreio:** Confirmar se o `trackingCode` está sendo gerado e incluído corretamente no final da mensagem.

---
*Este checklist deve ser consultado a cada alteração estrutural nas tabelas `products`, `product_option_groups` ou no fluxo do `cart.ts`.*
