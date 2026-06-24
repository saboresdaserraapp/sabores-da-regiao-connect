import { test, expect } from "@playwright/test";

const FILTERS =
  "?start=2026-06-01&end=2026-06-10&campaign=post_delivery_invite&q=SDS&sort=tracking_code&dir=asc";

test.describe("/admin/convites-cadastro — query params survive navigation", () => {
  test("restores filters from URL on initial load and after reload", async ({ page }) => {
    // Stub the unauthenticated route so we don't need an admin session in CI.
    // The component reads from URL synchronously regardless of data state.
    await page.goto(`/admin/convites-cadastro${FILTERS}`);

    // Inputs hydrated from URL
    await expect(page.getByLabel("Desde")).toHaveValue("2026-06-01");
    await expect(page.getByLabel("Até")).toHaveValue("2026-06-10");
    await expect(page.getByLabel("Busca rápida")).toHaveValue("SDS");

    // Update one filter and confirm the URL follows the state
    await page.getByLabel("Busca rápida").fill("MESA-42");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("MESA-42");

    // Reload — state must persist
    await page.reload();
    await expect(page.getByLabel("Busca rápida")).toHaveValue("MESA-42");
    await expect(page.getByLabel("Desde")).toHaveValue("2026-06-01");
    await expect(page.getByLabel("Até")).toHaveValue("2026-06-10");

    // Sorted column carries aria-sort
    const sorted = page.locator('[aria-sort="ascending"]');
    await expect(sorted).toContainText(/Pedido/i);
  });
});
