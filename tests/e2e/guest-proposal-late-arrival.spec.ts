import { expect, test } from "@playwright/test";
import { createOrder, createProposal, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { requiredEnv } from "./utils/auth";

/**
 * Garante que o pop-up de aceite aparece mesmo quando o visitante carrega
 * /pedido/:code antes da proposta estar pronta — graças ao polling do
 * GuestProposalDialog.
 */
test.describe("/pedido/:code — pop-up aparece quando proposta chega depois", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!env.establishmentId, "PW_TEST_ESTABLISHMENT_ID ausente.");

  test("polling detecta proposta criada após a navegação inicial", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_name: "Visitante Late Proposal E2E",
      status: "waiting_business_confirmation",
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
    const page = await context.newPage();

    try {
      // Visita primeiro, SEM proposta ainda — nenhum dialog aparece.
      await page.goto(`/pedido/${created.tracking_code}`);
      await expect(page.getByText(created.tracking_code).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // A loja agora envia a proposta.
      await createProposal({
        order_id: created.id,
        establishment_id: env.establishmentId,
        proposed_total: 27,
        note: "Proposta enviada após navegação.",
      });

      // O polling do hook (8s) deve abrir o dialog em breve.
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /confirme o valor final/i }))
        .toBeVisible({ timeout: 20_000 });
      await expect(dialog.getByText("R$ 27,00")).toBeVisible();
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});