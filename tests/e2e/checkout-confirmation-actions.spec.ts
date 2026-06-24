import { test, expect } from "@playwright/test";

test.describe("TrackingShareActions on confirmation screen", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("copy link writes the tracking URL to the clipboard", async ({ page }) => {
    await page.goto("/debug/share-actions");
    await expect(page.getByRole("button", { name: /copiar link/i })).toBeVisible();
    await page.getByRole("button", { name: /copiar link/i }).click();
    await expect(page.getByRole("button", { name: /link copiado/i })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe("http://localhost:8080/pedido/SDS-TST001");
  });

  test("share falls back to clipboard when navigator.share is missing", async ({ page }) => {
    await page.addInitScript(() => {
      // Chromium headless ships without navigator.share; ensure it stays absent.
      try { delete (navigator as unknown as { share?: unknown }).share; } catch { /* noop */ }
    });
    await page.goto("/debug/share-actions");
    await page.getByRole("button", { name: /compartilhar/i }).click();
    await expect(page.getByRole("button", { name: /link copiado/i })).toBeVisible();
  });

  test("reenviar pelo WhatsApp opens wa.me with same tracking code", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __opened?: string[] }).__opened = [];
      const orig = window.open;
      window.open = (url?: string | URL) => {
        (window as unknown as { __opened: string[] }).__opened.push(String(url ?? ""));
        return null as unknown as Window;
      };
      // keep reference to silence unused-var lint
      void orig;
    });
    await page.goto("/debug/share-actions");
    await page.getByRole("button", { name: /reenviar pedido pelo whatsapp/i }).click();
    await page.waitForFunction(
      () => ((window as unknown as { __opened?: string[] }).__opened?.length ?? 0) > 0,
    );
    const opened = await page.evaluate(
      () => (window as unknown as { __opened: string[] }).__opened,
    );
    expect(opened.length).toBe(1);
    expect(opened[0]).toContain("wa.me/5511999990001");
    expect(opened[0]).toContain(encodeURIComponent("SDS-TST001"));
  });

  test("cancelar pedido confirma e não dispara registro extra de WhatsApp", async ({ page }) => {
    const waCalls: string[] = [];
    let cancelCalls = 0;

    await page.route("**/rest/v1/rpc/customer_cancel_order", async (route) => {
      cancelCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.route("**/rest/v1/rpc/register_whatsapp_resend", async (route) => {
      waCalls.push("register_whatsapp_resend");
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.route("**/rest/v1/rpc/log_whatsapp_send", async (route) => {
      waCalls.push("log_whatsapp_send");
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/debug/share-actions");
    await page.getByRole("button", { name: /cancelar pedido/i }).click();
    await page.getByPlaceholder(/motivo/i).fill("Mudei de ideia");
    await page.getByRole("button", { name: /confirmar cancelamento/i }).click();

    await expect(page.getByTestId("canceled-flag")).toBeVisible();
    expect(cancelCalls).toBe(1);
    expect(waCalls).toEqual([]);
  });
});
