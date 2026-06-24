import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ExportJobStatus = "queued" | "running" | "done" | "error" | "canceled";

export type ExportJob = {
  id: string;
  status: ExportJobStatus;
  progress_pct: number;
  done: number;
  total: number;
  download_url: string | null;
  error: string | null;
  filters: Record<string, unknown> | null;
  created_at: string;
  finished_at: string | null;
};

/**
 * Polls the `signup-invite-export-status` edge function for the given job.
 * Returns `null` when no job id is passed. Stops polling once the job
 * reaches a terminal state (`done`, `error`, `canceled`).
 */
export function useExportJob(jobId: string | null) {
  return useQuery<ExportJob | null>({
    queryKey: ["signup-invite-export-job", jobId],
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const job = query.state.data as ExportJob | null | undefined;
      if (!job) return 1500;
      if (job.status === "done" || job.status === "error" || job.status === "canceled") {
        return false;
      }
      return 1500;
    },
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase.functions.invoke<ExportJob>(
        `signup-invite-export-status?job_id=${encodeURIComponent(jobId)}`,
        { method: "GET" },
      );
      if (error) throw error;
      return data ?? null;
    },
  });
}

export async function startExportJob(filters: {
  start: string;
  end: string;
  campaign: string;
  q: string;
  sort: string;
  dir: string;
}): Promise<{ job_id: string }> {
  const { data, error } = await supabase.functions.invoke<{ job_id: string }>(
    "signup-invite-export-start",
    { method: "POST", body: filters },
  );
  if (error) throw error;
  if (!data?.job_id) throw new Error("Resposta inválida do servidor de exportação.");
  return data;
}

export async function cancelExportJob(jobId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("signup-invite-export-cancel", {
    method: "POST",
    body: { job_id: jobId },
  });
  if (error) throw error;
}
