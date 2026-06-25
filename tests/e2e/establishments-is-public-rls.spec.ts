import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs, requiredEnv } from "./utils/auth";

/**
 * Confirma que apenas o dono autenticado consegue alterar
 * `establishments.is_public`. Tentativas anônimas e logadas como cliente
 * devem falhar (RLS + trigger defensivo).
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const env = requiredEnv();
const shouldSkip =
  !SUPABASE_URL || !SUPABASE_ANON || !env.establishmentId || !env.customerEmail || !env.customerPassword;

test.describe("RLS: is_public só pode ser alterado pelo dono", () => {
  test.skip(shouldSkip, "Defina VITE_SUPABASE_*, PW_TEST_ESTABLISHMENT_ID e PW_TEST_CUSTOMER_*.");

  test("usuário anônimo não consegue atualizar is_public", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data, error } = await supabase
      .from("establishments")
      .update({ is_public: false })
      .eq("id", env.establishmentId)
      .select("id");
    // RLS bloqueia: retorna [] ou erro de permissão; jamais updated rows.
    expect(error || (Array.isArray(data) && data.length === 0)).toBeTruthy();
  });

  test("cliente logado (não dono) não consegue atualizar is_public", async ({ page }) => {
    await loginAs(page, env.customerEmail, env.customerPassword);
    // Executa a query dentro do browser autenticado para herdar a sessão.
    const result = await page.evaluate(async (estabId) => {
      const mod = await import("/src/integrations/supabase/client.ts");
      const { data, error } = await mod.supabase
        .from("establishments")
        .update({ is_public: false })
        .eq("id", estabId)
        .select("id");
      return { data, error: error ? { message: error.message, code: (error as any).code } : null };
    }, env.establishmentId);

    // Espera: nenhuma linha atualizada (RLS USING falha) OU erro de permissão (trigger).
    const blocked =
      !!result.error ||
      (Array.isArray(result.data) && result.data.length === 0);
    expect(blocked).toBeTruthy();
  });
});