import { expect, test } from "@playwright/test";
import { createOrder, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Garante que um visitante deslogado consegue abrir /pedido/:code e enxerga
 * conteúdo real (status + detalhes/itens), nunca uma tela em branco.
 */
test.describe("/pedido/:code — visitante deslogado", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("renderiza status e detalhes do pedido sem auth", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante E2E",
      status: "new",
    });

    // Contexto novo, sem nenhuma sessão Supabase.
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1800 },
    });
    const page = await context.newPage();

    try {
      await page.goto(`/pedido/${created.tracking_code}`);

      // Cabeçalho com o código aparece (não-vazio).
      await expect(page.getByText(created.tracking_code)).toBeVisible({ timeout: 15_000 });
      // Sessão "Status do pedido" e "Detalhes do pedido" presentes.
      await expect(page.getByRole("heading", { name: /status do pedido/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /detalhes do pedido/i })).toBeVisible();

      // Não pode renderizar empty state de "não encontrado".
      await expect(page.getByText(/pedido não encontrado/i)).toHaveCount(0);

      // body deve ter conteúdo real
      const bodyText = (await page.locator("body").innerText()).trim();
      expect(bodyText.length).toBeGreaterThan(40);
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});