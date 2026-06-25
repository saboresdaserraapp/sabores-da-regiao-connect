import type { BrowserContext, Page } from "@playwright/test";

/**
 * Realiza login via UI nas rotas /login. Espera que `VITE_SUPABASE_*` esteja
 * configurado no app de desenvolvimento. Retorna após a navegação concluir.
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha/i).first().fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL((url) => !/\/login(\?|$)/.test(url.pathname), { timeout: 15_000 });
}

export async function openContextLoggedAs(
  browser: import("@playwright/test").Browser,
  email: string,
  password: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();
  await loginAs(page, email, password);
  return { context, page };
}

export function requiredEnv() {
  return {
    customerEmail: process.env.PW_TEST_CUSTOMER_EMAIL ?? "",
    customerPassword: process.env.PW_TEST_CUSTOMER_PASSWORD ?? "",
    storeEmail: process.env.PW_TEST_STORE_EMAIL ?? "",
    storePassword: process.env.PW_TEST_STORE_PASSWORD ?? "",
    establishmentId: process.env.PW_TEST_ESTABLISHMENT_ID ?? "",
    customerUserId: process.env.PW_TEST_CUSTOMER_USER_ID ?? "",
  };
}

export function hasFullChatEnv(env = requiredEnv()): boolean {
  return Boolean(
    env.customerEmail &&
      env.customerPassword &&
      env.storeEmail &&
      env.storePassword &&
      env.establishmentId,
  );
}