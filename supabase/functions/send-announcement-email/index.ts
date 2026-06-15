import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { announcement_id } = await req.json();
    if (!announcement_id) {
      return new Response(JSON.stringify({ error: "announcement_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: ann } = await supabase.from("announcements").select("*").eq("id", announcement_id).maybeSingle();
    if (!ann) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recipients } = await supabase
      .from("announcement_recipients")
      .select("establishment_id, establishments(owner_id, name)")
      .eq("announcement_id", announcement_id);

    const ownerIds = (recipients ?? [])
      .map((r: any) => r.establishments?.owner_id)
      .filter((x: string | null) => !!x);

    // Resolve emails through auth admin
    const emails: { email: string; estabName?: string }[] = [];
    for (const r of recipients ?? []) {
      const ownerId = (r as any).establishments?.owner_id;
      if (!ownerId) continue;
      const { data: u } = await supabase.auth.admin.getUserById(ownerId);
      if (u?.user?.email) emails.push({ email: u.user.email, estabName: (r as any).establishments?.name });
    }

    // Try sending via Resend connector (if configured); otherwise just log.
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let sent = 0;
    if (lovableKey && resendKey && emails.length) {
      for (const e of emails) {
        try {
          const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": resendKey,
            },
            body: JSON.stringify({
              from: "Sabores da Região <onboarding@resend.dev>",
              to: [e.email],
              subject: ann.title,
              html: `<h2>${ann.title}</h2><p>${ann.body.replace(/\n/g, "<br/>")}</p>`,
            }),
          });
          if (res.ok) sent++;
        } catch { /* continue */ }
      }
    }

    return new Response(JSON.stringify({ ok: true, recipients: emails.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
