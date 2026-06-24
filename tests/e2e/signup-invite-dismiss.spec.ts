import { test, expect, Route } from "@playwright/test";

/**
 * Verifies that clicking "Agora não" in SignupInviteDialog prevents the dialog
 * from re-appearing for the same tracking_code, even after a full reload AND
 * after wiping localStorage (so the only signal left is the DB record).
 *
 * We stub the Supabase REST endpoints so the test does not need a real order.
 */

const TRACKING = "SDS-TEST01";

type DismissalRow = {
  id: string;
  tracking_code: string;
  dismissed_at: string;
  source: string;
  campaign: string;
};

test.describe("SignupInviteDialog — Agora não persistence", () => {
  test("does not reappear after refresh + localStorage wipe", async ({ page }) => {
    const dismissals: DismissalRow[] = [];

    await page.route(/\/rest\/v1\/rpc\/get_order_by_tracking/, async (route: Route) => {
      const fakeOrder = {
        id: "00000000-0000-0000-0000-000000000001",
        tracking_code: TRACKING,
        status: "delivered",
        customer_name: "Cliente Teste",
        customer_phone: "11912345678",
        establishment_id: "00000000-0000-0000-0000-000000000002",
        establishment_name: "Loja Teste",
        establishment_slug: "loja-teste",
        establishment_whatsapp: null,
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([fakeOrder]),
      });
    });

    await page.route(/\/rest\/v1\/signup_invite_dismissals.*/, async (route: Route) => {
      const req = route.request();
      const method = req.method();
      const url = new URL(req.url());

      if (method === "GET") {
        const codeFilter = url.searchParams.get("tracking_code") ?? "";
        const wanted = codeFilter.replace(/^eq\./, "");
        const match = dismissals.find((d) => d.tracking_code === wanted);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(match ? [match] : []),
        });
        return;
      }
      if (method === "POST") {
        const payload = JSON.parse(req.postData() ?? "{}");
        const items = Array.isArray(payload) ? payload : [payload];
        const inserted = items.map((p: Partial<DismissalRow>, i: number) => ({
          id: `dis-${dismissals.length + i + 1}`,
          dismissed_at: new Date().toISOString(),
          campaign: "post_delivery_invite",
          source: "shown",
          tracking_code: TRACKING,
          ...p,
        }));
        dismissals.push(...inserted);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(inserted),
        });
        return;
      }
      await route.fallback();
    });

    // Block any other supabase channels/queries we don't need.
    await page.route(/\/realtime\/v1\//, (route) => route.abort());

    await page.goto(`/pedido/publico/${TRACKING}`);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Agora não/i }).click();
    await expect(dialog).toBeHidden();

    // The DB stub must now contain at least a "shown" + "dismiss" record.
    expect(dismissals.length).toBeGreaterThanOrEqual(2);
    expect(dismissals.some((d) => d.source === "dismiss")).toBe(true);

    // Wipe localStorage so only the DB stub can prevent the dialog.
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Give the dialog time to (incorrectly) appear if persistence is broken.
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});