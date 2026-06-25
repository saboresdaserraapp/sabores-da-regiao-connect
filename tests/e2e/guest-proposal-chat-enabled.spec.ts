import { expect, test } from "@playwright/test";
import { createOrder, createProposal, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Após aceitar a taxa, o composer de chat do visitante fica imediatamente
 * habilitado (sem aviso de bloqueio) e a mensagem é enviada com sucesso.
 */
test.describe("/pedido/:code — chat liberado após aceitar a taxa", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("composer do chat fica disponível e envia mensagem", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante Chat Habilitado E2E",
      status: "waiting_business_confirmation",
    });
    await createProposal({
      order_id: created.id,
      establishment_id: env.establishmentId,
      proposed_total: 42,
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();

    try {
      await page.goto(`/pedido/${created.tracking_code}`);
      await expect(page.getByText(created.tracking_code).first()).toBeVisible({ timeout: 15_000 });

      // Aceita a proposta.
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
      await page.getByTestId("guest-accept-proposal").click();
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });

      // Abre o FAB e entra no chat do pedido.
      await page.getByTestId("floating-chat-fab").click();
      const item = page.getByTestId("floating-chat-order-item").first();
      if (await item.isVisible().catch(() => false)) {
        await item.click();
      }

      // Composer disponível, sem aviso "faça login para responder".
      const input = page.getByTestId("guest-chat-input");
      const sendBtn = page.getByTestId("guest-chat-send");
      await expect(input).toBeVisible({ timeout: 10_000 });
      await expect(input).toBeEnabled();
      await expect(page.getByText(/faça login para responder/i)).toHaveCount(0);

      await input.fill("Olá! Esta é uma mensagem de teste de visitante.");
      await expect(sendBtn).toBeEnabled();
      await sendBtn.click();

      // A mensagem aparece na conversa.
      await expect(
        page.getByText(/esta é uma mensagem de teste de visitante/i),
      ).toBeVisible({ timeout: 15_000 });

      // Input volta vazio (envio concluído).
      await expect(input).toHaveValue("");
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});