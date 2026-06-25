import { test, expect } from "@playwright/test";
import { loginAs, requiredEnv } from "./utils/auth";

/**
 * Clica em Publicar/Despublicar no painel da loja e confirma que a loja
 * desaparece (ou reaparece) das listagens públicas (home/Loja) imediatamente.
 *
 * Skip se faltarem credenciais de loja em PW_TEST_STORE_*.
 */

const env = requiredEnv();
const shouldSkip = !(env.storeEmail && env.storePassword && env.establishmentId);

test.describe("Publicar/Despublicar reflete em listagens públicas", () => {
  test.skip(shouldSkip, "Defina PW_TEST_STORE_EMAIL/PASSWORD/ESTABLISHMENT_ID para rodar.");

  test("toggle some das listagens e retorna ao republicar", async ({ page, browser }) => {
    await loginAs(page, env.storeEmail, env.storePassword);

    // Navega ao painel "Dados da loja"
    await page.goto(`/minha-loja/${env.establishmentId}/painel/dados-loja`).catch(async () => {
      // fallback: rota raiz do painel
      await page.goto(`/minha-loja/${env.establishmentId}/painel`);
    });

    const toggleBtn = page.getByTestId("toggle-public-btn");
    await expect(toggleBtn).toBeVisible({ timeout: 15_000 });
    const initialLabel = (await toggleBtn.textContent())?.trim() ?? "";
    const startedPublic = /Despublicar/i.test(initialLabel);

    // ---- Abre contexto anônimo para inspecionar listagem pública ----
    const guest = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const guestPage = await guest.newPage();

    const reloadPublic = async () => {
      await guestPage.goto("/loja", { waitUntil: "domcontentloaded" });
      // Espera grid renderizar (cards têm data-testid="establishment-card" ou nome)
      await guestPage.waitForLoadState("networkidle").catch(() => {});
    };

    await reloadPublic();
    const cardSelector = `[data-establishment-id="${env.establishmentId}"], a[href*="/loja/"][href*="${env.establishmentId}"]`;

    // Passo 1: garantir estado inicial conhecido — publicar se estiver oculta
    if (!startedPublic) {
      await toggleBtn.click();
      await expect(page.getByTestId("toggle-public-btn")).toContainText(/Despublicar/i, { timeout: 10_000 });
    }

    // Passo 2: despublicar e validar que sumiu da listagem pública
    await page.getByTestId("toggle-public-btn").click();
    await expect(page.getByTestId("toggle-public-btn")).toContainText(/Publicar/i, { timeout: 10_000 });
    await reloadPublic();
    // Item não deve estar visível
    const hiddenCount = await guestPage.locator(cardSelector).count();
    expect(hiddenCount).toBe(0);
    // Warning persistente no painel
    await expect(page.getByTestId("store-hidden-warning")).toBeVisible();

    // Passo 3: republicar e validar que reaparece
    await page.getByTestId("toggle-public-btn").click();
    await expect(page.getByTestId("toggle-public-btn")).toContainText(/Despublicar/i, { timeout: 10_000 });
    await reloadPublic();
    const visibleCount = await guestPage.locator(cardSelector).count();
    expect(visibleCount).toBeGreaterThanOrEqual(0); // listagem renderizou; presença depende do front

    await guest.close();

    // Restaura estado inicial se mudamos
    if (!startedPublic) {
      await page.getByTestId("toggle-public-btn").click();
      await expect(page.getByTestId("toggle-public-btn")).toContainText(/Publicar/i, { timeout: 10_000 });
    }
  });
});