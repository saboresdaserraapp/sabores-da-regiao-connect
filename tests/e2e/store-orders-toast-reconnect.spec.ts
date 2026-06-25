import { test, expect } from "@playwright/test";
import { hasFullChatEnv, loginAs, requiredEnv } from "./utils/auth";
import { createOrder, deleteOrder, shouldSkipSeed } from "./utils/seed";

/**
 * Reload + reconexão de realtime não devem disparar o mesmo toast duas
 * vezes para o mesmo INSERT de pedido. O componente guarda os event-ids
 * já notificados num Set persistente entre renders; reload limpa o Set,
 * mas o evento original já foi consumido antes da reconexão.
 *
 * Estratégia do teste:
 *  1) Loja autenticada abre o painel.
 *  2) Seed cria um pedido — toast aparece 1 vez.
 *  3) Forçamos um "reconnect" derrubando todos os channels do Supabase
 *     e disparando focus/visibility (o polling refaz a query).
 *  4) Reload completo da página.
 *  5) Asserção: ao longo de toda a janela, o toast "Novo pedido" aparece
 *     no máximo 1x para aquele pedido (event-id estável). Aceita 0 após o
 *     reload — o card permanece, sem novo toast.
 */

test.describe("Painel do lojista — toasts não duplicam em reload/reconexão", () => {
  const env = requiredEnv();
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente");
  test.skip(!hasFullChatEnv(env), "Credenciais PW_TEST_STORE_* ausentes");

  const createdOrderIds: string[] = [];

  test.afterEach(async () => {
    for (const id of createdOrderIds.splice(0)) {
      try {
        await deleteOrder(id);
      } catch {
        /* ignore */
      }
    }
  });

  test("um único toast por evento, mesmo após reconexão e reload", async ({ page }) => {
    await loginAs(page, env.storeEmail, env.storePassword);
    await page.goto(`/minha-loja/${env.establishmentId}/pedidos`);
    await page.waitForLoadState("networkidle");

    // Instala observer que conta toasts entre janelas (sobrevive a reload
    // via window.name).
    async function installToastCounter() {
      await page.evaluate(() => {
        // counts persistem entre reloads via sessionStorage
        if (!sessionStorage.getItem("__pwToasts")) sessionStorage.setItem("__pwToasts", "[]");
        const push = (t: string) => {
          const arr = JSON.parse(sessionStorage.getItem("__pwToasts") ?? "[]");
          arr.push(t);
          sessionStorage.setItem("__pwToasts", JSON.stringify(arr));
        };
        const obs = new MutationObserver((mutations) => {
          for (const m of mutations) {
            m.addedNodes.forEach((n) => {
              if (n instanceof HTMLElement && /toast|sonner/i.test(n.className)) {
                const t = (n.textContent ?? "").trim();
                if (t) push(t);
              }
            });
          }
        });
        obs.observe(document.body, { subtree: true, childList: true });
      });
    }
    await installToastCounter();

    // Cria pedido — toast deve aparecer 1x
    const code = `E2E-RECON-${Date.now().toString(36).toUpperCase()}`;
    const order = await createOrder({
      establishment_id: env.establishmentId,
      tracking_code: code,
      customer_name: `Cliente Recon ${code}`,
    });
    createdOrderIds.push(order.id);

    await expect(page.getByText(code, { exact: false })).toBeVisible({ timeout: 15_000 });

    // Simula reconexão: remove channels + dispara focus/visibility
    await page.evaluate(async () => {
      const s = (window as any).supabase ?? (window as any).__supabase;
      try {
        s?.removeAllChannels?.();
      } catch {
        /* noop */
      }
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(2500);

    // Reload completo
    await page.reload();
    await page.waitForLoadState("networkidle");
    await installToastCounter();
    await expect(page.getByText(code, { exact: false })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    const allToasts = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("__pwToasts") ?? "[]") as string[],
    );
    const novoCount = allToasts.filter((t) => /novo pedido/i.test(t)).length;
    expect(
      novoCount,
      `toasts capturados (esperado ≤1): ${JSON.stringify(allToasts)}`,
    ).toBeLessThanOrEqual(1);

    // Card único após tudo
    expect(await page.getByText(code, { exact: false }).count()).toBe(1);
  });
});