import { expect, test } from "@playwright/test";
import { createOrder, createProposal, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Fluxo completo do visitante:
 *   1. Abre /pedido/:code
 *   2. Pop-up da taxa aparece (proposta `sent`)
 *   3. Aceita a proposta
 *   4. A conversa do pedido fica disponível no GlobalFloatingChat
 */
test.describe("/pedido/:code — visitante aceita proposta", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("aceita a taxa e a conversa aparece no GlobalFloatingChat", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante Proposta E2E",
      status: "waiting_business_confirmation",
    });
    await createProposal({
      order_id: created.id,
      establishment_id: env.establishmentId,
      proposed_subtotal: 25,
      proposed_delivery_fee: 9,
      proposed_total: 34,
      note: "Taxa ajustada para teste E2E.",
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();

    try {
      await page.goto(`/pedido/${created.tracking_code}`);
      await expect(page.getByText(created.tracking_code).first()).toBeVisible({ timeout: 15_000 });

      // 1. Pop-up aparece (polling/refetch garante mesmo se a proposta for nova).
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /confirme o valor final/i }))
        .toBeVisible({ timeout: 20_000 });
      await expect(dialog.getByText("R$ 34,00")).toBeVisible();

      // 2. Aceitar.
      await page.getByTestId("guest-accept-proposal").click();
      await expect(page.getByText(/pedido confirmado/i)).toBeVisible({ timeout: 10_000 });

      // 3. Dialog fecha.
      await expect(dialog).toBeHidden({ timeout: 10_000 });

      // 4. A conversa aparece no GlobalFloatingChat (badge ou item da lista).
      const fab = page.getByTestId("floating-chat-fab");
      await expect(fab).toBeVisible({ timeout: 10_000 });
      await fab.click();
      await expect(page.getByTestId("floating-chat-panel")).toBeVisible();

      // Volta para a lista se já abriu direto no chat.
      const back = page.getByRole("button", { name: /voltar/i });
      if (await back.isVisible().catch(() => false)) await back.click();

      await expect(page.getByTestId("floating-chat-order-item").first())
        .toBeVisible({ timeout: 15_000 });
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});