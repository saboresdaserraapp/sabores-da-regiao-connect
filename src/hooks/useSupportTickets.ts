import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory =
  | "order_issue" | "delivery_issue" | "payment_issue" | "account_issue"
  | "establishment_issue" | "report_followup" | "feature_request" | "other";
export type ActorRole = "customer" | "establishment" | "admin" | "system";

export interface SupportTicket {
  id: string;
  subject: string;
  description: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  opened_by: string;
  opened_by_role: ActorRole;
  establishment_id: string | null;
  order_id: string | null;
  assigned_admin_id: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: ActorRole;
  message: string;
  attachments: any;
  created_at: string;
}

type ListScope =
  | { kind: "mine" }
  | { kind: "establishment"; establishmentId: string }
  | { kind: "admin" };

export function useSupportTickets(scope: ListScope) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["support_tickets", scope],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (scope.kind === "mine") q = q.eq("opened_by", user!.id);
      if (scope.kind === "establishment") q = q.eq("establishment_id", scope.establishmentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });
}

export function useSupportTicket(ticketId: string | undefined) {
  return useQuery({
    enabled: !!ticketId,
    queryKey: ["support_ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets").select("*").eq("id", ticketId!).maybeSingle();
      if (error) throw error;
      return data as SupportTicket | null;
    },
  });
}

export function useSupportMessages(ticketId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    enabled: !!ticketId,
    queryKey: ["support_messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*").eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportMessage[];
    },
  });

  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support_ticket_${ticketId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => qc.invalidateQueries({ queryKey: ["support_messages", ticketId] })
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, qc]);

  return query;
}

export function useCreateTicket() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      subject: string;
      description?: string;
      category: TicketCategory;
      priority?: TicketPriority;
      opened_by_role: ActorRole;
      establishment_id?: string | null;
      order_id?: string | null;
    }) => {
      const { data, error } = await supabase.from("support_tickets").insert({
        subject: payload.subject,
        description: payload.description ?? null,
        category: payload.category,
        priority: payload.priority ?? "normal",
        opened_by: user!.id,
        opened_by_role: payload.opened_by_role,
        establishment_id: payload.establishment_id ?? null,
        order_id: payload.order_id ?? null,
      }).select("*").single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support_tickets"] }),
  });
}

export function useSendTicketMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { ticket_id: string; message: string; sender_role: ActorRole; is_internal_note?: boolean }) => {
      const { data, error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: args.ticket_id,
        sender_id: user!.id,
        sender_role: args.sender_role,
        message: args.message,
        is_internal_note: args.is_internal_note ?? false,
      }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["support_messages", vars.ticket_id] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Pick<SupportTicket, "status" | "priority" | "assigned_admin_id" | "resolved_at" | "closed_at">> }) => {
      const { data, error } = await supabase.from("support_tickets")
        .update(args.patch).eq("id", args.id).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["support_ticket", vars.id] });
    },
  });
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  order_issue: "Problema com pedido",
  delivery_issue: "Problema com entrega",
  payment_issue: "Pagamento",
  account_issue: "Conta",
  establishment_issue: "Problema com estabelecimento",
  report_followup: "Acompanhamento de denúncia",
  feature_request: "Sugestão",
  other: "Outro",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_user: "Aguardando você",
  resolved: "Resolvido",
  closed: "Encerrado",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
};