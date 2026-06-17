Plano para corrigir o pop-up de reajuste do pedido:

1. Tornar o pop-up realmente global para cliente autenticado
- Manter o componente global fora das páginas específicas.
- Remover a exclusão de checkout e permitir que apareça também em tela de pedido, acompanhamento, conta, loja/cardápio e demais rotas do cliente.
- Continuar bloqueando no admin e no painel da loja para não aparecer para lojista/admin.

2. Trocar a busca frágil por uma busca centrada na proposta pendente
- Buscar propostas `sent` vinculadas a pedidos do usuário logado.
- Não depender somente de `orders.status = waiting_business_confirmation`, porque esse filtro pode não refletir o estado real em todos os fluxos.
- Usar `confirmation_flow_status`, `current_confirmation_proposal_id` e fallback por `order_id` para encontrar qualquer proposta ativa ainda pendente.
- Reutilizar a tabela existente `order_confirmation_proposals`; não criar estrutura nova.

3. Garantir que o modal abra e reabra
- Quando existir proposta `sent`, abrir o dialog automaticamente.
- Se o usuário fechar sem aceitar/recusar, reabrir após uma nova checagem curta, porque a ação é obrigatória para o pedido seguir.
- Fechar definitivamente apenas quando a proposta deixar de estar `sent` após aceitar ou recusar.

4. Realtime + polling como redundância
- Manter assinatura em tempo real para `order_confirmation_proposals`.
- Adicionar/ajustar assinatura dos pedidos do usuário para mudanças de `current_confirmation_proposal_id` ou `confirmation_flow_status`.
- Manter polling curto como fallback caso o realtime não dispare no navegador.

5. Preservar isolamento e segurança
- Não mexer em checkout, carrinho, produtos, motoboys ou cálculo de entrega.
- Não misturar chat do pedido, suporte rápido ou tickets.
- Não duplicar tabelas nem criar novo canal.
- O pop-up só consultará dados que o usuário logado já tem permissão para ver.

6. Verificação
- Testar o fluxo com uma proposta `sent` existente.
- Confirmar que aparece na tela do pedido e em outra rota do cliente.
- Confirmar que não aparece em `/admin` nem `/minha-loja`.
- Confirmar que aceitar/recusar remove o pop-up.