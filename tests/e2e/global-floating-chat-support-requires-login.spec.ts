import { expect, test } from "@playwright/test";

/**
 * Visitante deslogado: a aba Suporte do GlobalFloatingChat deve exibir o
 * estado "entre na sua conta" com CTA para /auth e nunca renderizar o
 * painel real de mensagens do suporte.
 */
test.describe("GlobalFloatingChat — aba Suporte exige login", () => {
  test("renderiza estado de login para visitante e mostra CTA Entrar", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();
    try {
      await page.goto("/");

      const fab = page.getByTestId("floating-chat-fab");
      await expect(fab).toBeVisible({ timeout: 15_000 });
      await fab.click();
      await expect(page.getByTestId("floating-chat-panel")).toBeVisible();

      await page.getByRole("tab", { name: /suporte/i }).click();

      await expect(page.getByText(/entre na sua conta/i)).toBeVisible();
      const entrar = page.getByRole("link", { name: /entrar/i });
      await expect(entrar).toBeVisible();
      await expect(entrar).toHaveAttribute("href", /\/auth/);

      // NÃO deve renderizar o botão "Iniciar chat com o suporte" (apenas para logados).
      await expect(page.getByRole("button", { name: /iniciar chat com o suporte/i })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});