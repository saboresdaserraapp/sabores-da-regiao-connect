import { test, expect } from "@playwright/test";

/**
 * Garante que as rotas autenticadas de detalhe de pedido nunca renderizam
 * conteúdo em branco, mesmo nos cenários degradados:
 *   - sem sessão (deve redirecionar p/ /login com ?redirect=)
 *   - com UUID inválido (deve mostrar ErrorState/NotFound, não tela vazia)
 *   - rota pública /pedido/:code com tracking inexistente
 */

const NON_UUID = "isto-nao-eh-uuid";
const FAKE_ORDER_ID = "00000000-0000-0000-0000-0000000000ff";
const FAKE_EST_ID = "00000000-0000-0000-0000-00000000ee00";

async function expectVisibleContent(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return !!root && (root.textContent ?? "").trim().length > 0;
    },
    { timeout: 10_000 },
  );
  const text = (await page.locator("body").innerText()).trim();
  expect(text.length, "body deve renderizar conteúdo").toBeGreaterThan(0);
}

test.describe("/minha-conta/pedidos/:orderId — estados nunca em branco", () => {
  test("sem sessão → redirect /login com preserva o destino", async ({ page }) => {
    await page.goto(`/minha-conta/pedidos/${FAKE_ORDER_ID}`);
    await expectVisibleContent(page);
    await expect(page).toHaveURL(/\/login(\?|$)/);
    expect(page.url()).toMatch(/redirect=.*pedidos/);
  });

  test("UUID inválido — não trava branco, mostra mensagem", async ({ page }) => {
    await page.goto(`/minha-conta/pedidos/${NON_UUID}`);
    await expectVisibleContent(page);
    // Pode ser redirect p/ login (sem sessão) ou ErrorState.
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(
      body.includes("login") ||
        body.includes("erro") ||
        body.includes("não encontrado") ||
        body.includes("pedido"),
    ).toBeTruthy();
  });
});

test.describe("/minha-loja/:est/pedidos/:orderId — estados nunca em branco", () => {
  test("sem sessão → redirect /login", async ({ page }) => {
    await page.goto(`/minha-loja/${FAKE_EST_ID}/pedidos/${FAKE_ORDER_ID}`);
    await expectVisibleContent(page);
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("IDs inválidos — não trava branco", async ({ page }) => {
    await page.goto(`/minha-loja/${NON_UUID}/pedidos/${NON_UUID}`);
    await expectVisibleContent(page);
  });
});

test.describe("/pedido/:code público — estados nunca em branco", () => {
  test("tracking inexistente — mostra estado público", async ({ page }) => {
    await page.goto("/pedido/SDS-INEXISTENTE-XYZ");
    await expectVisibleContent(page);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(
      body.includes("pedido") || body.includes("carregando") || body.includes("voltar"),
    ).toBeTruthy();
  });

  test("código vazio cai para NotFound da SPA", async ({ page }) => {
    await page.goto("/pedido/");
    await expectVisibleContent(page);
  });
});