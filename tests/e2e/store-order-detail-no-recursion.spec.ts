import { expect, test } from "@playwright/test";
import { hasFullChatEnv, loginAs, requiredEnv } from "./utils/auth";
import { createOrder, deleteOrder, shouldSkipSeed } from "./utils/seed";

/**
 * Garante que /minha-loja/:est/pedidos/:orderId abre normalmente para um lojista
 * logado e NÃO mostra erro de "infinite recursion detected" vindo das policies
 * de RLS (regressão histórica em establishments × establishment_owners).
 */
test.describe("store order detail — sem infinite recursion", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  test.skip(!hasFullChatEnv(), "Credenciais PW_TEST_* incompletas.");

  test("lojista abre detalhes do pedido sem erro de RLS", async ({ page }) => {
    const env = requiredEnv();
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_user_id: env.customerUserId || undefined,
      customer_name: "Cliente E2E",
      status: "new",
    });

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    try {
      await loginAs(page, env.storeEmail, env.storePassword);
      await page.goto(`/minha-loja/${env.establishmentId}/pedidos/${created.id}`);

      // A página renderiza conteúdo real (não a tela de erro genérica).
      await expect(page.getByRole("heading", { name: /dados do cliente/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole("heading", { name: /itens do pedido/i })).toBeVisible();
      await expect(page.getByTestId("admin-estabs-error")).toHaveCount(0);
      await expect(page.getByText(/não foi possível carregar este pedido/i)).toHaveCount(0);
      await expect(page.getByText(/infinite recursion/i)).toHaveCount(0);
      await expect(page.getByText(/schema cache|relationship between 'orders' and 'establishments'/i)).toHaveCount(0);
      await expect(page.getByText(/algo deu errado/i)).toHaveCount(0);

      const recursionInConsole = errors.some((e) => /infinite recursion/i.test(e));
      expect(recursionInConsole, `console errors: ${errors.join(" | ")}`).toBe(false);
    } finally {
      await deleteOrder(created.id).catch(() => {});
    }
  });
});