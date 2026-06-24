import { supabase } from "@/integrations/supabase/client";

export type AdminConviteAction =
  | "view"
  | "filter"
  | "export_start"
  | "export_success"
  | "export_cancel"
  | "export_error";

/**
 * Best-effort audit log writer. Failures are swallowed (logged to console
 * only) so they never break the admin UI.
 */
export async function logAdminConviteEvent(
  action: AdminConviteAction,
  params: Record<string, unknown>,
  result: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const adminId = userRes?.user?.id;
    if (!adminId) return;
    const { error } = await supabase
      .from("admin_convite_audit_logs" as never)
      .insert({ admin_id: adminId, action, params, result } as never);
    if (error) console.warn("[adminAudit] insert failed", error.message);
  } catch (err) {
    console.warn("[adminAudit] unexpected", err);
  }
}
