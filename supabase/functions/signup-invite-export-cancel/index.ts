import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await userClient.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin } = await svc.rpc("is_admin", { _user_id: userId });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  let body: { job_id?: string } = {};
  try {
    body = await req.json();
  } catch { /* noop */ }
  if (!body.job_id) return json({ error: "job_id required" }, 400);

  const { data: job } = await svc
    .from("signup_invite_export_jobs")
    .select("admin_id, status")
    .eq("id", body.job_id)
    .maybeSingle();
  if (!job) return json({ error: "Not found" }, 404);
  if (job.admin_id !== userId) return json({ error: "Forbidden" }, 403);
  if (job.status === "done" || job.status === "error" || job.status === "canceled") {
    return json({ ok: true, status: job.status });
  }

  await svc
    .from("signup_invite_export_jobs")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", body.job_id);

  return json({ ok: true, status: "canceled" });
});
