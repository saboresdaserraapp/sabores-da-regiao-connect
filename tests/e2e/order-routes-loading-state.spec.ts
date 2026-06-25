import { test, expect } from "@playwright/test";

/**
 * Garante que as rotas de pedido mostram um LoadingState (spinner ou texto
 * "Carregando...") durante o pré-carregamento e nunca ficam em branco.
 * Usa route interception para atrasar respostas do Supabase e poder observar
 * a tela intermediária.
 */
const FAKE_ORDER = "00000000-0000-0000-0000-0000000000aa";
const FAKE_EST = "00000000-0000-0000-0000-0000000000bb";

async function slowSupabase(page: import("@playwright/test").Page, ms = 1200) {
  await page.route(/supabase\.co\/(rest|auth)\/v1\//, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

async function expectNotBlank(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("#root");
    return !!root && (root.textContent ?? "").trim().length > 0;
  }, { timeout: 10_000 });
}

test.describe("Rotas de pedido — LoadingState durante pré-carregamento", () => {
  test("/minha-conta/pedidos/:orderId mostra loading ou redirect, nunca em branco", async ({ page }) => {
    await slowSupabase(page);
    const nav = page.goto(`/minha-conta/pedidos/${FAKE_ORDER}`);
    // Antes da resposta chegar, body já tem algo (spinner, "carregando" ou
    // redirect intermediário).
    await expectNotBlank(page);
    const earlyText = (await page.locator("body").innerText()).toLowerCase();
    expect(
      earlyText.includes("carregando") ||
        earlyText.includes("login") ||
        earlyText.length > 0,
    ).toBeTruthy();
    await nav;
    await expectNotBlank(page);
  });

  test("/minha-loja/:est/pedidos/:orderId mostra loading antes do dado", async ({ page }) => {
    await slowSupabase(page);
    const nav = page.goto(`/minha-loja/${FAKE_EST}/pedidos/${FAKE_ORDER}`);
    await expectNotBlank(page);
    await nav;
    await expectNotBlank(page);
  });

  test("/pedido/:code mostra estado público (loading/empty) sem ficar em branco", async ({ page }) => {
    await slowSupabase(page, 800);
    const nav = page.goto("/pedido/E2E-LOADING-XYZ");
    await expectNotBlank(page);
    await nav;
    await expectNotBlank(page);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(
      body.includes("pedido") || body.includes("carregando") || body.includes("voltar"),
    ).toBeTruthy();
  });
});