import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "signup-invite-exports";
const PAGE = 500;
const HARD_CAP = 50_000;

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return ok({ error: message, ...extra }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return err("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return err("Unauthorized", 401);
  const token = authHeader.slice(7);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return err("Unauthorized", 401);
  const adminId = claims.claims.sub as string;

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin } = await svc.rpc("is_admin", { _user_id: adminId });
  if (!isAdmin) return err("Forbidden", 403);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const start = String(body.start ?? "");
  const end = String(body.end ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return err("Invalid start/end (YYYY-MM-DD required)");
  }
  const campaign = body.campaign && body.campaign !== "all" ? String(body.campaign) : null;
  const q = body.q ? String(body.q) : null;
  const sort = (["dismissed_at", "tracking_code", "source", "campaign"] as const).includes(
    body.sort as any,
  )
    ? (body.sort as string)
    : "dismissed_at";
  const dir = body.dir === "asc" ? "asc" : "desc";

  const filters = { start, end, campaign, q, sort, dir };

  // Create job row
  const { data: job, error: jobErr } = await svc
    .from("signup_invite_export_jobs")
    .insert({ admin_id: adminId, status: "queued", filters })
    .select("id")
    .single();
  if (jobErr || !job) return err("Failed to create job", 500, { detail: jobErr?.message });

  // Audit
  await svc.from("admin_convite_audit_logs").insert({
    admin_id: adminId,
    action: "export_start",
    params: filters,
    result: { job_id: job.id },
  });

  // Kick off background work; respond immediately
  // @ts-ignore EdgeRuntime is available in Supabase Deno
  EdgeRuntime.waitUntil(processJob(job.id, adminId, filters, svc));

  return ok({ job_id: job.id, status: "queued" });
});

async function processJob(
  jobId: string,
  adminId: string,
  filters: { start: string; end: string; campaign: string | null; q: string | null; sort: string; dir: string },
  svc: ReturnType<typeof createClient>,
) {
  const startIso = new Date(`${filters.start}T00:00:00`).toISOString();
  const endIso = new Date(`${filters.end}T23:59:59.999`).toISOString();
  try {
    await svc.from("signup_invite_export_jobs").update({ status: "running" }).eq("id", jobId);

    const rows: Array<Record<string, unknown>> = [];
    let offset = 0;
    let total = 0;
    while (rows.length < HARD_CAP) {
      // Cancellation check
      const { data: cur } = await svc
        .from("signup_invite_export_jobs")
        .select("status")
        .eq("id", jobId)
        .single();
      if (cur?.status === "canceled") {
        await svc
          .from("signup_invite_export_jobs")
          .update({ finished_at: new Date().toISOString() })
          .eq("id", jobId);
        await svc.from("admin_convite_audit_logs").insert({
          admin_id: adminId,
          action: "export_cancel",
          params: { job_id: jobId, ...filters },
          result: { done: rows.length },
        });
        return;
      }

      const { data, error } = await svc.rpc("search_signup_invites", {
        _start: startIso,
        _end: endIso,
        _campaign: filters.campaign,
        _q: filters.q,
        _sort: filters.sort,
        _dir: filters.dir,
        _limit: PAGE,
        _offset: offset,
      });
      if (error) throw error;
      const batch = (data ?? []) as Array<Record<string, unknown>>;
      if (batch.length === 0) break;
      total = Number(batch[0].total_count ?? total);
      rows.push(...batch);
      offset += batch.length;
      const target = Math.min(total, HARD_CAP);
      const pct = target ? Math.min(100, Math.round((rows.length / target) * 100)) : 100;
      await svc
        .from("signup_invite_export_jobs")
        .update({ total: target, done: rows.length, progress_pct: pct })
        .eq("id", jobId);
      if (batch.length < PAGE) break;
    }

    // Build CSV
    const header = ["tracking_code", "source", "campaign", "dismissed_at"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows
      .map((r) =>
        [r.tracking_code, r.source ?? "", r.campaign, r.dismissed_at].map(escape).join(","),
      )
      .join("\n");
    const csv = "\uFEFF" + header.join(",") + "\n" + body + "\n";

    const path = `${adminId}/${jobId}.csv`;
    const { error: upErr } = await svc.storage
      .from("signup-invite-exports")
      .upload(path, new Blob([csv], { type: "text/csv;charset=utf-8" }), {
        upsert: true,
        contentType: "text/csv;charset=utf-8",
      });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await svc.storage
      .from("signup-invite-exports")
      .createSignedUrl(path, 60 * 60 * 24);
    if (signErr) throw signErr;

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    await svc
      .from("signup_invite_export_jobs")
      .update({
        status: "done",
        csv_path: path,
        download_url: signed.signedUrl,
        download_url_expires_at: expires,
        progress_pct: 100,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await svc.from("admin_convite_audit_logs").insert({
      admin_id: adminId,
      action: "export_success",
      params: { job_id: jobId, ...filters },
      result: { rows: rows.length, path },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[export job]", jobId, msg);
    await svc
      .from("signup_invite_export_jobs")
      .update({ status: "error", error: msg, finished_at: new Date().toISOString() })
      .eq("id", jobId);
    await svc.from("admin_convite_audit_logs").insert({
      admin_id: adminId,
      action: "export_error",
      params: { job_id: jobId, ...filters },
      result: { error: msg },
    });
  }
}
