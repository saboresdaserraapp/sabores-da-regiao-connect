import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin } = await svc.rpc("is_admin", { _user_id: userId });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  if (!jobId) return json({ error: "job_id required" }, 400);

  const { data: job, error } = await svc
    .from("signup_invite_export_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!job) return json({ error: "Not found" }, 404);
  if (job.admin_id !== userId) return json({ error: "Forbidden" }, 403);

  // Re-sign URL if expired/expiring soon
  let downloadUrl = job.download_url as string | null;
  if (job.status === "done" && job.csv_path) {
    const expires = job.download_url_expires_at ? new Date(job.download_url_expires_at).getTime() : 0;
    if (!downloadUrl || expires - Date.now() < 5 * 60 * 1000) {
      const { data: signed } = await svc.storage
        .from("signup-invite-exports")
        .createSignedUrl(job.csv_path, 60 * 60 * 24);
      if (signed?.signedUrl) {
        downloadUrl = signed.signedUrl;
        await svc
          .from("signup_invite_export_jobs")
          .update({
            download_url: downloadUrl,
            download_url_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          })
          .eq("id", jobId);
      }
    }
  }

  return json({
    id: job.id,
    status: job.status,
    progress_pct: job.progress_pct,
    done: job.done,
    total: job.total,
    download_url: downloadUrl,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at,
    filters: job.filters,
  });
});
