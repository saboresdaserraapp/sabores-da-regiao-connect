/**
 * Labels em português para os status técnicos persistidos no banco.
 * Centralizado para evitar duplicação entre painéis da loja e do cliente.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  waiting_business_confirmation: "Aguardando confirmação",
  confirmed_by_business: "Confirmado pela loja",
  preparing: "Em preparo",
  ready_for_pickup: "Pronto para retirada",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  canceled_by_business: "Cancelado pela loja",
  canceled_by_customer: "Cancelado pelo cliente",
  customer_not_responding: "Cliente não respondeu",
  difficult_address: "Endereço difícil",
  needs_more_reference: "Precisa de referência",
  not_completed: "Não concluído",
};

export const CONFIRMATION_FLOW_LABELS: Record<string, string> = {
  waiting_business_review: "Aguardando análise da loja",
  proposal_sent_to_customer: "Aguardando aceite do cliente",
  customer_accepted: "Cliente aceitou",
  customer_rejected: "Cliente recusou",
  confirmed: "Confirmado",
  canceled: "Cancelado",
  not_required: "Não exigido",
};

export function statusLabel(status?: string | null): string {
  if (!status) return "—";
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function flowLabel(flow?: string | null): string {
  if (!flow) return "—";
  return CONFIRMATION_FLOW_LABELS[flow] ?? flow;
}

export const STATUS_OPTIONS: { value: string; label: string }[] = Object.entries(
  ORDER_STATUS_LABELS
).map(([value, label]) => ({ value, label }));