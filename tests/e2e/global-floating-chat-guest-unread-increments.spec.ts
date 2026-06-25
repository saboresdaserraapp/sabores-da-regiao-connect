import { expect, test } from "@playwright/test";
import { createOrder, createMessage, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Visitante deslogado: após ler um pedido (badge = 0), múltiplas mensagens
 * novas em sequência devem voltar a incrementar o contador de não lidas.
 */
test.describe("GlobalFloatingChat — visitante contador volta a aumentar", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("badge cresce ao chegarem novas mensagens depois da leitura", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante Incr E2E",
      status: "waiting_business_confirmation",
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();

    try {
      // Visita o pedido (marca como lido) — o tracking_code é registrado e
      // o markGuestSeen é chamado.
      await page.goto(`/pedido/${created.tracking_code}`);
      await expect(page.getByText(created.tracking_code)).toBeVisible({ timeout: 15_000 });
      const fab = page.getByTestId("floating-chat-fab");
      await expect(fab).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("floating-chat-unread-badge")).toHaveCount(0);

      // Loja envia 3 mensagens em sequência.
      for (let i = 1; i <= 3; i++) {
        await createMessage({
          order_id: created.id,
          sender_type: "business",
          establishment_id: env.establishmentId,
          message: `Atualização ${i}`,
        });
      }

      // Badge deve aparecer e atingir 3 (polling do guest é 15s).
      const badge = page.getByTestId("floating-chat-unread-badge");
      await expect(badge).toBeVisible({ timeout: 25_000 });
      await expect.poll(async () => (await badge.innerText()).trim(), {
        timeout: 25_000,
      }).toBe("3");
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});