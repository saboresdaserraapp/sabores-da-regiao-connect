#!/usr/bin/env tsx
/**
 * Pré-flight para `npm run test:e2e`.
 *
 * 1. Carrega `.env` / `.env.local` (sem sobrescrever vars já presentes em CI).
 * 2. Valida presença das variáveis obrigatórias para os specs Playwright que
 *    dependem do seed e do chat. Variáveis ausentes geram aviso, não erro:
 *    os specs correspondentes são auto-skipped via `test.skip(...)`.
 * 3. Quando `E2E_SEED_SECRET` está presente, faz um `ping` na edge function
 *    `e2e-seed` para confirmar que está deployada e o segredo bate.
 *
 * Use:  npm run e2e:preflight
 *       npm run test:e2e         (executa o preflight automaticamente)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

type Group = { name: string; vars: string[]; required: boolean };

const groups: Group[] = [
  {
    name: "Supabase público (necessário pro app subir em testes)",
    required: true,
    vars: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PROJECT_ID"],
  },
  {
    name: "Seed E2E (edge function e2e-seed)",
    required: false,
    vars: ["E2E_SEED_SECRET"],
  },
  {
    name: "Cliente de teste (chat E2E)",
    required: false,
    vars: ["PW_TEST_CUSTOMER_EMAIL", "PW_TEST_CUSTOMER_PASSWORD", "PW_TEST_CUSTOMER_USER_ID"],
  },
  {
    name: "Lojista de teste (chat / dedup E2E)",
    required: false,
    vars: ["PW_TEST_STORE_EMAIL", "PW_TEST_STORE_PASSWORD", "PW_TEST_ESTABLISHMENT_ID"],
  },
];

let hardFailure = false;
const skipped: string[] = [];

for (const g of groups) {
  const missing = g.vars.filter((v) => !process.env[v]);
  if (missing.length === 0) {
    console.log(`✔ ${g.name}`);
    continue;
  }
  if (g.required) {
    console.error(`✖ ${g.name}\n   faltando: ${missing.join(", ")}`);
    hardFailure = true;
  } else {
    console.warn(`⚠ ${g.name}\n   faltando: ${missing.join(", ")} (specs dependentes serão skipped)`);
    skipped.push(g.name);
  }
}

async function pingSeed() {
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
  const secret = process.env.E2E_SEED_SECRET;
  if (!projectId || !secret) return;
  const url = `https://${projectId}.functions.supabase.co/e2e-seed`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-e2e-secret": secret },
      body: JSON.stringify({ action: "ping" }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      console.error(`✖ e2e-seed ping falhou: ${res.status} ${body.error ?? ""}`);
      hardFailure = true;
    } else {
      console.log("✔ e2e-seed respondeu ping");
    }
  } catch (err) {
    console.error(`✖ e2e-seed inacessível: ${(err as Error).message}`);
    hardFailure = true;
  }
}

await pingSeed();

if (hardFailure) {
  console.error("\nPreflight falhou. Corrija as variáveis acima antes de rodar o Playwright.");
  process.exit(1);
}
if (skipped.length > 0) {
  console.log(`\nPreflight OK com avisos. Specs dependentes de [${skipped.join(", ")}] serão skipped.`);
} else {
  console.log("\nPreflight OK. Tudo pronto para o Playwright.");
}