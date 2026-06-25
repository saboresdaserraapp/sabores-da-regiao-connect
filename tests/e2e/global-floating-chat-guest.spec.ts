import { expect, test } from "@playwright/test";
import { createOrder, createMessage, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Visitante deslogado: abre /pedido/:code, recebe uma nova mensagem do
 * estabelecimento e vê o badge/contador do chat flutuante atualizar.
 * A aba Suporte continua exigindo login.
 */
test.describe("GlobalFloatingChat — visitante (sem login)", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("badge do chat aparece após mensagem da loja e Suporte pede login", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante Chat E2E",
      status: "waiting_business_confirmation",
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();

    try {
      // Sem nenhuma sessão.
      await page.goto(`/pedido/${created.tracking_code}`);
      await expect(page.getByText(created.tracking_code)).toBeVisible({ timeout: 15_000 });

      // O FAB do chat flutuante deve aparecer mesmo deslogado.
      const fab = page.getByTestId("floating-chat-fab");
      await expect(fab).toBeVisible({ timeout: 10_000 });
      // Sem mensagens novas ainda → sem badge.
      await expect(page.getByTestId("floating-chat-unread-badge")).toHaveCount(0);

      // O estabelecimento envia uma mensagem nova.
      await createMessage({
        order_id: created.id,
        sender_type: "business",
        establishment_id: env.establishmentId,
        message: "Olá! Pedido recebido — confirmamos em instantes.",
      });

      // Hook do guest faz polling a cada 15s. Aguardamos a badge aparecer.
      await expect(page.getByTestId("floating-chat-unread-badge")).toBeVisible({ timeout: 25_000 });

      // Abre o painel e confirma que a aba Suporte exige login.
      await fab.click();
      await expect(page.getByTestId("floating-chat-panel")).toBeVisible();
      await page.getByRole("tab", { name: /suporte/i }).click();
      await expect(page.getByText(/entre na sua conta/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /entrar/i })).toBeVisible();
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});
