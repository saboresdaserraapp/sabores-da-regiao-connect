// E2E seed helper — protegida por header `x-e2e-secret` (E2E_SEED_SECRET).
// Usa SERVICE_ROLE_KEY para criar/atualizar pedidos e mensagens em ambiente
// de teste. NUNCA exponha o segredo no front-end; Playwright lê de
// `process.env.E2E_SEED_SECRET` ou `PW_E2E_SEED_SECRET` no host de CI.
//
// Ações suportadas (POST JSON `{ action, payload }`):
//   - "create_order":   cria pedido mínimo para um establishment_id e
//                       customer_user_id. Retorna { id, tracking_code, code }.
//   - "create_message": insere mensagem em order_messages.
//                       Body: { order_id, sender_type, sender_user_id,
//                               establishment_id?, message }.
//   - "delete_order":   apaga pedido + mensagens. Body: { order_id }.
//   - "ping":           healthcheck simples.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPECTED = Deno.env.get("E2E_SEED_SECRET") ?? "";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomCode(prefix = "SDS") {
  const n = Math.floor(Math.random() * 1e6)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${n}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!EXPECTED) {
    return json(500, { error: "E2E_SEED_SECRET não configurado no projeto." });
  }

  const provided = req.headers.get("x-e2e-secret") ?? "";
  // comparação tempo-constante simples
  if (provided.length !== EXPECTED.length) {
    return json(401, { error: "unauthorized" });
  }
  let mismatch = 0;
  for (let i = 0; i < EXPECTED.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ EXPECTED.charCodeAt(i);
  }
  if (mismatch !== 0) return json(401, { error: "unauthorized" });

  if (req.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  let body: { action?: string; payload?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    switch (body.action) {
      case "ping":
        return json(200, { ok: true, at: new Date().toISOString() });

      case "create_order": {
        const p = (body.payload ?? {}) as Record<string, any>;
        if (!p.establishment_id) return json(400, { error: "establishment_id required" });
        const tracking_code: string = p.tracking_code ?? randomCode("E2E");
        const items = p.items ?? [
          { id: "seed-item", name: "Item de teste", quantity: 1, price: 10 },
        ];
        const subtotal = Number(p.subtotal ?? 10);
        const delivery_fee = Number(p.delivery_fee ?? 5);
        const total = Number(p.total ?? subtotal + delivery_fee);
        const { data, error } = await supabase
          .from("orders")
          .insert({
            establishment_id: p.establishment_id,
            customer_user_id: p.customer_user_id ?? null,
            customer_name: p.customer_name ?? "Cliente E2E",
            customer_phone: p.customer_phone ?? "11999990000",
            tracking_code,
            status: p.status ?? "waiting_business_confirmation",
            items,
            subtotal,
            delivery_fee,
            total,
            payment_method: p.payment_method ?? "pix",
            notes: p.notes ?? "seed e2e",
          })
          .select("id, tracking_code")
          .single();
        if (error) return json(400, { error: error.message });
        return json(200, { id: data.id, tracking_code: data.tracking_code, code: data.tracking_code });
      }

      case "create_message": {
        const p = (body.payload ?? {}) as Record<string, any>;
        if (!p.order_id || !p.sender_type || !p.message) {
          return json(400, { error: "order_id, sender_type and message required" });
        }
        const { data, error } = await supabase
          .from("order_messages")
          .insert({
            order_id: p.order_id,
            sender_type: p.sender_type,
            sender_user_id: p.sender_user_id ?? null,
            customer_user_id: p.sender_type === "customer" ? p.sender_user_id ?? null : null,
            establishment_id: p.establishment_id ?? null,
            message: p.message,
            attachments: p.attachments ?? [],
          })
          .select("id")
          .single();
        if (error) return json(400, { error: error.message });
        return json(200, { id: data.id });
      }

      case "delete_order": {
        const p = (body.payload ?? {}) as Record<string, any>;
        if (!p.order_id) return json(400, { error: "order_id required" });
        await supabase.from("order_messages").delete().eq("order_id", p.order_id);
        const { error } = await supabase.from("orders").delete().eq("id", p.order_id);
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true });
      }

      default:
        return json(400, { error: `unknown action: ${body.action}` });
    }
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});