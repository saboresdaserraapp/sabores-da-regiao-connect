/**
 * Cliente HTTP para a edge function `e2e-seed`.
 * Lê o segredo de `process.env.E2E_SEED_SECRET` (definir no `.env` local
 * ou nos secrets do CI). Sem o segredo configurado os helpers lançam,
 * forçando os testes que dependem de seed a serem skipped explicitamente
 * via `test.skip(shouldSkipSeed(), "...")`.
 */

const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID ?? "hzmrauyrwsqrlqblcsss";
const FUNCTION_URL = `https://${PROJECT_ID}.functions.supabase.co/e2e-seed`;
const SECRET = process.env.E2E_SEED_SECRET ?? process.env.PW_E2E_SEED_SECRET ?? "";

export function shouldSkipSeed(): boolean {
  return !SECRET;
}

async function call<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!SECRET) throw new Error("E2E_SEED_SECRET ausente no ambiente de teste.");
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-e2e-secret": SECRET,
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = (await res.json()) as { error?: string } & T;
  if (!res.ok) throw new Error(`e2e-seed ${action} failed: ${(data as any)?.error ?? res.status}`);
  return data;
}

export function ping() {
  return call<{ ok: boolean }>("ping");
}

export function createOrder(payload: {
  establishment_id: string;
  customer_user_id?: string;
  tracking_code?: string;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
}) {
  return call<{ id: string; tracking_code: string; code: string }>("create_order", payload);
}

export function createMessage(payload: {
  order_id: string;
  sender_type: "customer" | "business" | "system";
  sender_user_id?: string;
  establishment_id?: string;
  message: string;
}) {
  return call<{ id: string }>("create_message", payload);
}

export function createProposal(payload: {
  order_id: string;
  establishment_id: string;
  proposed_subtotal?: number;
  proposed_delivery_fee?: number;
  proposed_total?: number;
  prep_min?: number;
  delivery_min?: number;
  note?: string;
  status?: "sent" | "draft" | "accepted" | "rejected";
}) {
  return call<{ id: string }>("create_proposal", payload);
}

export function deleteOrder(order_id: string) {
  return call<{ ok: boolean }>("delete_order", { order_id });
}