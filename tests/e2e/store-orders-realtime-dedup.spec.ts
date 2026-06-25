import { test, expect } from "@playwright/test";
import { hasFullChatEnv, loginAs, requiredEnv } from "./utils/auth";
import { createOrder, deleteOrder, shouldSkipSeed } from "./utils/seed";

/**
 * Valida que polling + realtime no painel do lojista não duplicam cards
 * e que toasts não disparam mais de uma vez para o mesmo evento.
 *
 * Requisitos: variáveis de env de loja autenticada e seed habilitado.
 */

test.describe("Painel do lojista — polling + realtime não duplicam", () => {
  const env = requiredEnv();
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente");
  test.skip(!hasFullChatEnv(env), "Credenciais PW_TEST_STORE_* / PW_TEST_ESTABLISHMENT_ID ausentes");

  let createdOrderIds: string[] = [];

  test.afterEach(async () => {
    for (const id of createdOrderIds.splice(0)) {
      try {
        await deleteOrder(id);
      } catch {
        /* ignore */
      }
    }
  });

  test("novo pedido aparece como card único; toast 'Novo pedido' não duplica", async ({ page }) => {
    await loginAs(page, env.storeEmail, env.storePassword);
    await page.goto(`/minha-loja/${env.establishmentId}/pedidos`);
    await page.waitForLoadState("networkidle");

    // Captura toasts emitidos durante a janela do teste.
    const toastTexts: string[] = [];
    await page.exposeFunction("__pwOnToast", (text: string) => {
      toastTexts.push(text);
    });
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement && /toast|sonner/i.test(n.className)) {
              const t = n.textContent ?? "";
              if (t.trim()) (window as any).__pwOnToast(t.trim());
            }
          });
        }
      });
      observer.observe(document.body, { subtree: true, childList: true });
    });

    const code = `E2E-DEDUP-${Date.now().toString(36).toUpperCase()}`;
    const order = await createOrder({
      establishment_id: env.establishmentId,
      tracking_code: code,
      customer_name: `Cliente Dedup ${code}`,
    });
    createdOrderIds.push(order.id);

    // Aguarda o card aparecer. O componente exibe o tracking_code.
    const cardMatcher = page.getByText(code, { exact: false });
    await expect(cardMatcher).toBeVisible({ timeout: 15_000 });

    // Força um refresh (window focus) para combinar polling + realtime.
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForTimeout(2000);

    // Card único.
    expect(await cardMatcher.count()).toBe(1);

    // Toast 'Novo pedido' aparece no máximo uma vez para o mesmo evento.
    const novoCount = toastTexts.filter((t) => /novo pedido/i.test(t)).length;
    expect(novoCount, `toasts capturados: ${JSON.stringify(toastTexts)}`).toBeLessThanOrEqual(1);
  });
});