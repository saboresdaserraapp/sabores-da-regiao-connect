import { test, expect } from "@playwright/test";

/**
 * Garante que /minha-conta/pedidos/:orderId e /minha-loja/:est/pedidos/:orderId
 * nunca renderizam tela em branco.
 *
 * Sem sessão autenticada, ambas as rotas devem redirecionar para /login
 * (com `?redirect=...`) — nunca devem deixar a página vazia.
 * Com um UUID inexistente, após login, mostrariam ErrorState; aqui
 * validamos pelo menos que o roteamento desvia para uma página renderizada
 * e que o `<body>` nunca fica vazio.
 */

const FAKE_ORDER_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_EST_ID = "00000000-0000-0000-0000-000000000002";

async function expectNotBlank(page: import("@playwright/test").Page) {
  // Espera React montar algo dentro do #root.
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return !!root && (root.textContent ?? "").trim().length > 0;
    },
    { timeout: 10_000 },
  );
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, "body deve renderizar algum conteúdo").toBeGreaterThan(0);
}

test.describe("Rotas de detalhe de pedido nunca ficam em branco", () => {
  test("/minha-conta/pedidos/:orderId sem sessão redireciona ou renderiza estado", async ({ page }) => {
    await page.goto(`/minha-conta/pedidos/${FAKE_ORDER_ID}`);
    await expectNotBlank(page);
    // Deve estar em /login (com redirect) ou já mostrar uma página com texto.
    const url = page.url();
    const okRoute = /\/login(\?|$)/.test(url) || /\/minha-conta\/pedidos\//.test(url);
    expect(okRoute, `URL inesperada: ${url}`).toBeTruthy();
  });

  test("/minha-loja/:est/pedidos/:orderId sem sessão redireciona ou renderiza estado", async ({ page }) => {
    await page.goto(`/minha-loja/${FAKE_EST_ID}/pedidos/${FAKE_ORDER_ID}`);
    await expectNotBlank(page);
    const url = page.url();
    const okRoute = /\/login(\?|$)/.test(url) || /\/minha-loja\//.test(url);
    expect(okRoute, `URL inesperada: ${url}`).toBeTruthy();
  });

  test("/pedido/:code com tracking inexistente mostra estado público, não em branco", async ({ page }) => {
    await page.goto("/pedido/SDS-NAOEXISTE");
    await expectNotBlank(page);
    // O componente público mostra "Pedido não encontrado" ou um botão "Voltar".
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(
      body.includes("pedido") || body.includes("voltar") || body.includes("carregando"),
    ).toBeTruthy();
  });
});

/**
 * Chat E2E completo (cliente envia, loja responde, ambos veem) exige duas
 * sessões reais e fixtures de pedido — não rodáveis no ambiente padrão do
 * Playwright sem credenciais. Mantemos o esqueleto skipped para servir de
 * referência.
 */
test.describe("Chat do pedido (skip: requer fixtures auth)", () => {
  test.skip("cliente e loja trocam mensagem visível em ambas as rotas", async () => {
    // 1. seed: criar pedido real via supabase service role (CI fixture);
    // 2. login como cliente, abrir /minha-conta/pedidos/:id, enviar mensagem no OrderChat;
    // 3. login como dono do estabelecimento (segundo contexto),
    //    abrir /minha-loja/:est/pedidos/:id, ver a mensagem e responder;
    // 4. voltar ao primeiro contexto e validar a resposta.
  });
});