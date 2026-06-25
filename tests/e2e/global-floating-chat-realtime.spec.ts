import { expect, test } from "@playwright/test";
import { createOrder, createMessage, deleteOrder, shouldSkipSeed } from "./utils/seed";
import { hasFullChatEnv, openContextLoggedAs, requiredEnv } from "./utils/auth";

/**
 * Usuário logado: quando chega uma nova mensagem do estabelecimento,
 * a badge de não lidas do FAB e o toast do GlobalFloatingChat devem
 * atualizar imediatamente via Realtime.
 */
test.describe("GlobalFloatingChat — realtime para usuário logado", () => {
  test.skip(shouldSkipSeed(), "E2E_SEED_SECRET ausente.");
  const env = requiredEnv();
  test.skip(!hasFullChatEnv(env) || !env.customerUserId, "Credenciais de cliente E2E ausentes.");

  test("badge e toast aparecem imediatamente quando o estabelecimento envia mensagem", async ({ browser }) => {
    const created = await createOrder({
      establishment_id: env.establishmentId,
      customer_user_id: env.customerUserId,
      customer_name: "Cliente Chat E2E",
      status: "waiting_business_confirmation",
    });

    const { context, page } = await openContextLoggedAs(
      browser,
      env.customerEmail,
      env.customerPassword,
    );

    try {
      // Vai para a Home para garantir que o FAB global esteja montado.
      await page.goto("/");
      const fab = page.getByTestId("floating-chat-fab");
      await expect(fab).toBeVisible({ timeout: 15_000 });

      // Sem mensagens novas ainda.
      await expect(page.getByTestId("floating-chat-unread-badge")).toHaveCount(0);

      // Simula mensagem do estabelecimento.
      await createMessage({
        order_id: created.id,
        sender_type: "business",
        establishment_id: env.establishmentId,
        message: "Nova atualização da loja para teste E2E.",
      });

      // Badge deve aparecer rapidamente via Realtime (sem polling).
      await expect(page.getByTestId("floating-chat-unread-badge")).toBeVisible({ timeout: 10_000 });

      // O toast informativo (sonner) também deve aparecer.
      await expect(page.getByText(/nova mensagem do estabelecimento/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.close();
      await deleteOrder(created.id).catch(() => {});
    }
  });
});
