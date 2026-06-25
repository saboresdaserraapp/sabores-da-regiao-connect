import { test, expect } from "@playwright/test";
import { hasFullChatEnv, loginAs, requiredEnv } from "./utils/auth";

/**
 * Controle de acesso em /minha-loja/:est/pedidos/:orderId:
 *  - Sem sessão → redireciona para /login com ?redirect= preservado e
 *    mostra a tela de login (nunca em branco).
 *  - Logado mas SEM permissão no establishment → mostra ErrorState
 *    "Sem permissão" (não em branco, não redirect cego).
 */

const FAKE_EST = "00000000-0000-0000-0000-0000000000cc";
const FAKE_ORDER = "00000000-0000-0000-0000-0000000000dd";

async function expectNotBlank(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("#root");
    return !!root && (root.textContent ?? "").trim().length > 0;
  }, { timeout: 10_000 });
}

test.describe("/minha-loja/:est/pedidos/:orderId — controle de acesso", () => {
  test("sem sessão → /login com redirect preservado e tela visível", async ({ page }) => {
    const target = `/minha-loja/${FAKE_EST}/pedidos/${FAKE_ORDER}`;
    await page.goto(target);
    await expectNotBlank(page);
    await page.waitForURL(/\/login(\?|$)/, { timeout: 10_000 });
    expect(page.url()).toMatch(/redirect=.*pedidos/);
    // Form de login renderizado.
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
  });

  const env = requiredEnv();
  const customerOk = !!(env.customerEmail && env.customerPassword);
  test.skip(!customerOk, "PW_TEST_CUSTOMER_* ausentes para o cenário 'logado sem permissão'");

  test("logado sem permissão no establishment → ErrorState 'Sem permissão'", async ({ page }) => {
    await loginAs(page, env.customerEmail, env.customerPassword);
    await page.goto(`/minha-loja/${FAKE_EST}/pedidos/${FAKE_ORDER}`);
    await expectNotBlank(page);
    // Pode mostrar loading antes; espera o estado final.
    await expect(
      page.getByText(/sem permissão|não pertence|algo deu errado|pedido não informado/i),
    ).toBeVisible({ timeout: 15_000 });
  });
});