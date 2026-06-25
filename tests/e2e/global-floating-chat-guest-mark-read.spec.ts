import { expect, test } from "@playwright/test";
import { createOrder, createMessage, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Visitante deslogado: ao abrir /pedido/:code e "ler" as mensagens, a
 * badge de não lidas e o contador da aba Estabelecimento são zerados
 * imediatamente (sem precisar esperar polling).
 */
test.describe("GlobalFloatingChat — visitante zera badge ao ler", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("badge volta a zero após visitar /pedido/:code", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante Read E2E",
      status: "waiting_business_confirmation",
    });
    await createMessage({
      order_id: created.id,
      sender_type: "business",
      establishment_id: env.establishmentId,
      message: "Mensagem pré-existente da loja.",
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();

    try {
      // Primeiro registramos o tracking_code no localStorage SEM marcar como lido,
      // forçando a página a recalcular. Para simular "mensagem chegou antes de ler",
      // injetamos o código direto no storage e abrimos a Home.
      await page.goto("/");
      await page.evaluate((code) => {
        const KEY = "sabores:recent_order_codes";
        const list = [code];
        window.localStorage.setItem(KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("recent-order-codes-changed"));
      }, created.tracking_code);

      // Aguarda a badge aparecer (polling do hook guest carrega as mensagens).
      await expect(page.getByTestId("floating-chat-unread-badge")).toBeVisible({ timeout: 25_000 });

      // Agora visita /pedido/:code → markGuestSeen é chamado e a badge zera.
      await page.goto(`/pedido/${created.tracking_code}`);
      await expect(page.getByText(created.tracking_code)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("floating-chat-unread-badge")).toHaveCount(0, { timeout: 10_000 });
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});