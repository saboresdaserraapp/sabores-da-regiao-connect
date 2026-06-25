import { test, expect } from "@playwright/test";
import { hasFullChatEnv, loginAs, requiredEnv } from "./utils/auth";
import { createMessage, createOrder, deleteOrder, shouldSkipSeed } from "./utils/seed";

/**
 * No detalhe do pedido do lojista, mensagens recebidas via realtime + polling
 * não podem duplicar cards nem disparar toasts repetidos para o mesmo evento.
 */
test.describe("Detalhe do pedido (lojista) — sem duplicação realtime/polling", () => {
  const env = requiredEnv();
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente");
  test.skip(!hasFullChatEnv(env), "Credenciais PW_TEST_STORE_* ausentes");

  const createdOrderIds: string[] = [];
  test.afterEach(async () => {
    for (const id of createdOrderIds.splice(0)) {
      try { await deleteOrder(id); } catch { /* ignore */ }
    }
  });

  test("mensagens únicas mesmo após reconexão/polling forçado", async ({ page }) => {
    const code = `E2E-DET-${Date.now().toString(36).toUpperCase()}`;
    const order = await createOrder({
      establishment_id: env.establishmentId,
      tracking_code: code,
      customer_name: `Cliente Det ${code}`,
    });
    createdOrderIds.push(order.id);

    await loginAs(page, env.storeEmail, env.storePassword);
    await page.goto(`/minha-loja/${env.establishmentId}/pedidos/${order.id}`);
    await page.waitForLoadState("networkidle");

    // Observa toasts entre janelas
    await page.evaluate(() => {
      sessionStorage.setItem("__pwToasts", "[]");
      const push = (t: string) => {
        const arr = JSON.parse(sessionStorage.getItem("__pwToasts") ?? "[]");
        arr.push(t);
        sessionStorage.setItem("__pwToasts", JSON.stringify(arr));
      };
      new MutationObserver((muts) => {
        for (const m of muts) m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && /toast|sonner/i.test(n.className)) {
            const t = (n.textContent ?? "").trim();
            if (t) push(t);
          }
        });
      }).observe(document.body, { subtree: true, childList: true });
    });

    const uniqueMsg = `PING-${code}`;
    await createMessage({
      order_id: order.id,
      sender_type: "customer",
      sender_user_id: env.customerUserId || undefined,
      message: uniqueMsg,
    });

    // Espera mensagem aparecer (via realtime)
    await expect(page.getByText(uniqueMsg).first()).toBeVisible({ timeout: 15_000 });

    // Força reconexão + polling
    await page.evaluate(() => {
      const s = (window as any).supabase ?? (window as any).__supabase;
      try { s?.removeAllChannels?.(); } catch { /* noop */ }
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(2500);

    // Card único da mensagem
    expect(await page.getByText(uniqueMsg).count(),
      "mensagem não pode duplicar após reconexão").toBe(1);

    // Toasts: no máximo 1 contendo o mesmo texto/evento
    const toasts = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("__pwToasts") ?? "[]") as string[],
    );
    const dupes = toasts.filter((t) => t.includes(uniqueMsg));
    expect(dupes.length, `toasts duplicados: ${JSON.stringify(toasts)}`).toBeLessThanOrEqual(1);
  });
});