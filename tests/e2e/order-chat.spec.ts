import { test, expect } from "@playwright/test";
import { hasFullChatEnv, loginAs, requiredEnv } from "./utils/auth";
import { createOrder, deleteOrder, shouldSkipSeed } from "./utils/seed";

/**
 * Chat E2E completo: cliente envia, loja responde, ambos veem.
 * Usa a rota DEV-only `/__dev__/order-chat` para isolar o <OrderChat />
 * e remover dependências de toda a árvore de detalhes do pedido em cada
 * lado. As rotas reais (`/minha-conta/pedidos/:id` e
 * `/minha-loja/:est/pedidos/:id`) continuam cobertas pelo spec
 * `order-detail-states.spec.ts` e podem ser visitadas neste teste como
 * verificação adicional opcional.
 *
 * Pré-requisitos no ambiente Playwright:
 *   - E2E_SEED_SECRET (mesmo do projeto)
 *   - PW_TEST_CUSTOMER_EMAIL / PW_TEST_CUSTOMER_PASSWORD / PW_TEST_CUSTOMER_USER_ID
 *   - PW_TEST_STORE_EMAIL / PW_TEST_STORE_PASSWORD
 *   - PW_TEST_ESTABLISHMENT_ID (loja gerenciada pelo usuário acima)
 */

test.describe("Chat do pedido (cliente ↔ loja) via /__dev__/order-chat", () => {
  const env = requiredEnv();
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente");
  test.skip(!hasFullChatEnv(env) || !env.customerUserId, "Credenciais E2E ausentes");

  let orderId: string | null = null;

  test.afterAll(async () => {
    if (orderId) {
      try {
        await deleteOrder(orderId);
      } catch {
        /* ignore */
      }
    }
  });

  test("cliente envia, loja responde, ambos veem ambas as mensagens", async ({ browser }) => {
    const order = await createOrder({
      establishment_id: env.establishmentId,
      customer_user_id: env.customerUserId,
      customer_name: "Cliente E2E Chat",
    });
    orderId = order.id;

    // Contexto 1: cliente
    const customerCtx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const customerPage = await customerCtx.newPage();
    await loginAs(customerPage, env.customerEmail, env.customerPassword);
    await customerPage.goto(`/__dev__/order-chat?orderId=${order.id}&as=customer`);
    await expect(customerPage.getByTestId("harness-info")).toBeVisible();

    // Contexto 2: loja
    const storeCtx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const storePage = await storeCtx.newPage();
    await loginAs(storePage, env.storeEmail, env.storePassword);
    await storePage.goto(
      `/__dev__/order-chat?orderId=${order.id}&as=business&establishmentId=${env.establishmentId}`,
    );
    await expect(storePage.getByTestId("harness-info")).toBeVisible();

    // Cliente envia mensagem
    const clientMsg = `Olá da E2E ${Date.now()}`;
    await customerPage.getByPlaceholder(/digite sua mensagem/i).fill(clientMsg);
    await customerPage.getByRole("button", { name: /enviar/i }).click();
    await expect(customerPage.getByText(clientMsg)).toBeVisible({ timeout: 10_000 });

    // Loja vê a mensagem do cliente (via realtime)
    await expect(storePage.getByText(clientMsg)).toBeVisible({ timeout: 15_000 });

    // Loja responde
    const storeMsg = `Resposta da loja ${Date.now()}`;
    await storePage.getByPlaceholder(/digite sua mensagem/i).fill(storeMsg);
    await storePage.getByRole("button", { name: /enviar/i }).click();
    await expect(storePage.getByText(storeMsg)).toBeVisible({ timeout: 10_000 });

    // Cliente vê a resposta
    await expect(customerPage.getByText(storeMsg)).toBeVisible({ timeout: 15_000 });

    // Verificação extra: abrir a rota REAL de detalhes do lado do cliente e
    // confirmar que as duas mensagens aparecem por lá também.
    await customerPage.goto(`/minha-conta/pedidos/${order.id}`);
    await expect(customerPage.getByText(clientMsg).first()).toBeVisible({ timeout: 15_000 });
    await expect(customerPage.getByText(storeMsg).first()).toBeVisible({ timeout: 15_000 });

    // E a rota real de detalhes do lado da loja também.
    await storePage.goto(`/minha-loja/${env.establishmentId}/pedidos/${order.id}`);
    await expect(storePage.getByText(clientMsg).first()).toBeVisible({ timeout: 15_000 });
    await expect(storePage.getByText(storeMsg).first()).toBeVisible({ timeout: 15_000 });

    await customerCtx.close();
    await storeCtx.close();
  });
});