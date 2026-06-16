/**
 * Helpers centralizados para status de pedido e timestamps de WhatsApp.
 *
 * Mantém compatibilidade total com o schema atual:
 *  - `status` inicial padrão: "waiting_business_confirmation"
 *  - escrita simultânea de `whatsapp_sent_at` e `sent_to_whatsapp_at`
 *    (ambos os campos seguem existindo no banco; este helper apenas evita
 *    que cada call site escolha um ou outro).
 */

export const INITIAL_ORDER_STATUS = "waiting_business_confirmation" as const;

export type WhatsAppTimestamps = {
  whatsapp_sent_at: string;
  sent_to_whatsapp_at: string;
};

export function whatsappSentTimestamps(now: Date = new Date()): WhatsAppTimestamps {
  const iso = now.toISOString();
  return {
    whatsapp_sent_at: iso,
    sent_to_whatsapp_at: iso,
  };
}

/**
 * Normaliza um status vindo do banco para o conjunto canônico usado na UI.
 * Não altera valores desconhecidos — apenas mapeia aliases legados.
 */
export function normalizeOrderStatus(status: string | null | undefined): string {
  if (!status) return INITIAL_ORDER_STATUS;
  switch (status) {
    case "pending_confirmation":
    case "aguardando_confirmacao":
      return INITIAL_ORDER_STATUS;
    default:
      return status;
  }
}