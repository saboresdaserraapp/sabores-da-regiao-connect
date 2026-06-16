import { supabase } from "@/integrations/supabase/client";

export type ProposalStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "canceled"
  | "expired"
  | "superseded";

export type OrderProposal = {
  id: string;
  order_id: string;
  establishment_id: string;
  created_by: string | null;
  proposed_subtotal: number | null;
  proposed_delivery_fee: number | null;
  proposed_discount: number | null;
  proposed_extra_fee: number | null;
  proposed_total: number | null;
  estimated_preparation_time_min: number | null;
  estimated_delivery_time_min: number | null;
  business_note: string | null;
  customer_response_note: string | null;
  status: ProposalStatus;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  canceled_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

const TABLE = "order_confirmation_proposals" as any;

export async function fetchActiveProposal(orderId: string): Promise<OrderProposal | null> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("order_id", orderId)
    .in("status", ["sent", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as OrderProposal | null) ?? null;
}

export async function fetchProposalsForOrder(orderId: string): Promise<OrderProposal[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OrderProposal[]) ?? [];
}

export type SendProposalInput = {
  orderId: string;
  establishmentId: string;
  subtotal: number | null;
  deliveryFee: number | null;
  discount?: number | null;
  extraFee?: number | null;
  total: number | null;
  prepMin?: number | null;
  deliveryMin?: number | null;
  note?: string | null;
};

export async function sendProposal(input: SendProposalInput): Promise<OrderProposal> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({
      order_id: input.orderId,
      establishment_id: input.establishmentId,
      proposed_subtotal: input.subtotal,
      proposed_delivery_fee: input.deliveryFee,
      proposed_discount: input.discount ?? null,
      proposed_extra_fee: input.extraFee ?? null,
      proposed_total: input.total,
      estimated_preparation_time_min: input.prepMin ?? null,
      estimated_delivery_time_min: input.deliveryMin ?? null,
      business_note: input.note ?? null,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  // mensagem de sistema no chat
  await supabase.from("order_messages").insert({
    order_id: input.orderId,
    establishment_id: input.establishmentId,
    sender_type: "system",
    message:
      "A loja enviou uma proposta de confirmação. Verifique o total e aceite para confirmar o pedido.",
  } as any);

  return data as OrderProposal;
}

export async function acceptProposal(proposalId: string) {
  const { data, error } = await (supabase as any).rpc("accept_order_proposal", {
    _proposal_id: proposalId,
  });
  if (error) throw error;
  return data;
}

export async function rejectProposal(proposalId: string, note?: string) {
  const { data, error } = await (supabase as any).rpc("reject_order_proposal", {
    _proposal_id: proposalId,
    _note: note ?? null,
  });
  if (error) throw error;
  return data;
}

/**
 * Registro manual de aceite recebido pelo WhatsApp.
 * Marca a proposta como accepted e confirma o pedido sem RPC do cliente.
 */
export async function registerWhatsappAcceptance(opts: {
  proposalId: string;
  orderId: string;
  establishmentId: string;
  note?: string;
}) {
  const now = new Date().toISOString();

  // 1. carrega proposta
  const { data: prop, error: pErr } = await (supabase as any)
    .from(TABLE).select("*").eq("id", opts.proposalId).single();
  if (pErr) throw pErr;

  // 2. marca como aceita
  const { error: uErr } = await (supabase as any)
    .from(TABLE)
    .update({
      status: "accepted",
      accepted_at: now,
      customer_response_note: opts.note ?? null,
    })
    .eq("id", opts.proposalId);
  if (uErr) throw uErr;

  // 3. atualiza pedido
  const { error: oErr } = await supabase
    .from("orders")
    .update({
      status: "confirmed_by_business" as any,
      final_subtotal: prop.proposed_subtotal,
      final_delivery_fee: prop.proposed_delivery_fee,
      final_discount: prop.proposed_discount,
      final_extra_fee: prop.proposed_extra_fee,
      final_total: prop.proposed_total,
      business_confirmation_note: prop.business_note,
      customer_accepted_proposal_at: now,
      confirmed_at: now,
      confirmation_flow_status: "confirmed",
    } as any)
    .eq("id", opts.orderId);
  if (oErr) throw oErr;

  // 4. mensagem sistema
  await supabase.from("order_messages").insert({
    order_id: opts.orderId,
    establishment_id: opts.establishmentId,
    sender_type: "system",
    message:
      "Aceite registrado pela loja com base em confirmação pelo WhatsApp." +
      (opts.note ? ` Observação: ${opts.note}` : ""),
  } as any);
}

/**
 * Confirma o pedido sem alterar valores (retirada / entrega sem revisão de taxa).
 */
export async function confirmWithoutChange(orderId: string) {
  const now = new Date().toISOString();
  const { data: order, error } = await supabase
    .from("orders")
    .select("subtotal,total,total_estimated,delivery_fee,delivery_fee_estimated")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  const total = Number(order.total_estimated ?? order.total ?? 0);
  const fee = Number(order.delivery_fee_estimated ?? order.delivery_fee ?? 0);
  const { error: uErr } = await supabase
    .from("orders")
    .update({
      status: "confirmed_by_business" as any,
      final_total: total,
      final_delivery_fee: fee,
      final_subtotal: Number(order.subtotal ?? 0),
      confirmed_at: now,
      confirmation_flow_status: "confirmed",
    } as any)
    .eq("id", orderId);
  if (uErr) throw uErr;
}