import { expect, test } from "@playwright/test";
import { hasFullChatEnv, loginAs, requiredEnv } from "./utils/auth";
import { createOrder, deleteOrder, shouldSkipSeed } from "./utils/seed";

/**
 * Fluxo: lojista logado entra em /minha-loja/:est/painel/pedidos, clica em
 * "Abrir detalhes" para o pedido recém-criado, e a tela de detalhes carrega
 * sem erros — incluindo o link/estado para abrir conversa no WhatsApp.
 */
test.describe("store orders — abrir detalhes + WhatsApp", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  test.skip(!hasFullChatEnv(), "Credenciais PW_TEST_* incompletas.");

  test("clicar em Abrir detalhes renderiza o pedido e o botão WhatsApp", async ({ page }) => {
    const env = requiredEnv();
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_user_id: env.customerUserId || undefined,
      customer_name: "Cliente WA E2E",
      customer_phone: "11999990000",
      status: "new",
    });

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    try {
      await loginAs(page, env.storeEmail, env.storePassword);
      await page.goto(`/minha-loja/${env.establishmentId}/painel/pedidos`);

      // Erro genérico não deve aparecer na lista.
      await expect(page.getByTestId("orders-load-error")).toHaveCount(0);

      // Localiza o pedido pelo tracking_code e clica em Abrir detalhes.
      const trackingChip = page.getByText(created.tracking_code, { exact: false }).first();
      await expect(trackingChip).toBeVisible({ timeout: 15_000 });
      // Pode haver múltiplos "Abrir detalhes" — pegamos o que pertence à mesma row.
      const row = page.locator(`text=${created.tracking_code}`).first().locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
      await row.getByRole("link", { name: /abrir detalhes/i }).first().click();

      await page.waitForURL(new RegExp(`/minha-loja/${env.establishmentId}/pedidos/${created.id}`));

      await expect(page.getByRole("heading", { name: /dados do cliente/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: /itens do pedido/i })).toBeVisible();

      // Botões WhatsApp do painel de ações.
      const waActions = page.getByTestId("wa-actions");
      await expect(waActions.getByTestId("wa-open")).toBeVisible();
      await expect(waActions.getByTestId("wa-copy")).toBeVisible();

      // Timeline carrega (estado válido = lista, vazio ou erro com retry — nunca em branco).
      const timeline = page.getByTestId("store-order-timeline");
      await expect(timeline).toBeVisible();
      await expect(async () => {
        const hasList = await timeline.getByTestId("wa-events-timeline").count();
        const hasEmpty = await timeline.getByTestId("wa-events-empty").count();
        const hasError = await timeline.getByTestId("wa-events-error").count();
        expect(hasList + hasEmpty + hasError).toBeGreaterThan(0);
      }).toPass({ timeout: 10_000 });

      await expect(page.getByText(/infinite recursion/i)).toHaveCount(0);
      const recursion = consoleErrors.some((e) => /infinite recursion/i.test(e));
      expect(recursion, `console errors: ${consoleErrors.join(" | ")}`).toBe(false);
    } finally {
      await deleteOrder(created.id).catch(() => {});
    }
  });
});