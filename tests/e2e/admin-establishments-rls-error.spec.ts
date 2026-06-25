import { test, expect } from "@playwright/test";

/**
 * Força uma falha de RLS na query do painel /admin/estabelecimentos e
 * verifica que aparece a mensagem amigável + botão "Tentar novamente",
 * e que o botão refaz a request com sucesso quando o mock é desativado.
 */

const ADMIN_EMAIL = process.env.PW_TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.PW_TEST_ADMIN_PASSWORD ?? "";

test.describe("Admin Estabelecimentos — erro de RLS amigável + retry", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "PW_TEST_ADMIN_* ausentes");

  test("mostra mensagem e retry funciona", async ({ page }) => {
    // Login admin pela rota dedicada.
    await page.goto("/admin/login");
    await page.getByLabel(/e-?mail/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/senha/i).first().fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });

    // Intercepta a query da tabela establishments e devolve erro de RLS.
    let block = true;
    await page.route(/supabase\.co\/rest\/v1\/establishments\b/, async (route) => {
      if (block) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            code: "42P17",
            message: "infinite recursion detected in policy for relation \"establishments\"",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/admin/estabelecimentos");

    const errorBox = page.getByTestId("admin-estabs-error");
    await expect(errorBox).toBeVisible({ timeout: 10_000 });
    await expect(errorBox).toContainText(/não foi possível carregar/i);
    await expect(errorBox).toContainText(/regras de segurança|permissão/i);

    const retry = page.getByRole("button", { name: /tentar novamente/i });
    await expect(retry).toBeVisible();

    // Libera as próximas requests e clica em retry → erro deve sumir.
    block = false;
    await retry.click();
    await expect(errorBox).toHaveCount(0, { timeout: 10_000 });
  });
});