import { expect, test } from "@playwright/test";
import { createOrder, createMessage, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Visitante deslogado: clicar em um pedido na lista do GlobalFloatingChat
 * deve abrir o chat daquele pedido e manter o painel em estado consistente
 * (cabeçalho com tracking_code, mensagens carregadas, botão de voltar
 * funciona e devolve para a lista).
 */
test.describe("GlobalFloatingChat — visitante abre chat do pedido", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("clique no item abre conversa e botão voltar retorna à lista", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante Open E2E",
      status: "waiting_business_confirmation",
    });
    await createMessage({
      order_id: created.id,
      sender_type: "business",
      establishment_id: env.establishmentId,
      message: "Mensagem inicial da loja para teste de abertura.",
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();

    try {
      // Registra o código e abre Home para o FAB global.
      await page.goto(`/pedido/${created.tracking_code}`);
      await expect(page.getByText(created.tracking_code)).toBeVisible({ timeout: 15_000 });
      await page.goto("/");

      const fab = page.getByTestId("floating-chat-fab");
      await expect(fab).toBeVisible({ timeout: 15_000 });
      await fab.click();
      await expect(page.getByTestId("floating-chat-panel")).toBeVisible();

      // O painel pode auto-abrir o primeiro pedido. Se já estiver no chat,
      // voltamos para a lista para validar o clique no item.
      const back = page.getByRole("button", { name: /voltar/i });
      if (await back.isVisible().catch(() => false)) {
        await back.click();
      }

      // A lista deve mostrar pelo menos um item de pedido.
      const item = page.getByTestId("floating-chat-order-item").first();
      await expect(item).toBeVisible({ timeout: 20_000 });
      await item.click();

      // Cabeçalho do chat: mostra o tracking_code e a mensagem da loja.
      await expect(
        page.getByTestId("floating-chat-panel").getByText(created.tracking_code, { exact: false }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/mensagem inicial da loja/i)).toBeVisible({ timeout: 10_000 });

      // Botão voltar retorna para a lista.
      await page.getByRole("button", { name: /voltar/i }).click();
      await expect(page.getByTestId("floating-chat-order-item").first()).toBeVisible();

      // Painel continua aberto e consistente após o ciclo.
      await expect(page.getByTestId("floating-chat-panel")).toBeVisible();
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});