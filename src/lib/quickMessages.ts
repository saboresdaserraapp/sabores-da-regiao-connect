export type QuickMessageKey =
  | "received"
  | "fee_final"
  | "need_reference"
  | "confirmed"
  | "preparing"
  | "out"
  | "no_contact"
  | "canceled";

export const QUICK_MESSAGES: { key: QuickMessageKey; label: string; text: string }[] = [
  { key: "received",     label: "Pedido recebido",        text: "Seu pedido foi recebido e está em análise." },
  { key: "fee_final",    label: "Taxa final",             text: "A taxa de entrega final ficou em R$ {{valor}}. Podemos prosseguir?" },
  { key: "need_reference", label: "Mais referência",      text: "Precisamos de mais uma referência para localizar o endereço." },
  { key: "confirmed",    label: "Pedido confirmado",      text: "Seu pedido foi confirmado e já vamos iniciar o preparo." },
  { key: "preparing",    label: "Em preparo",             text: "Seu pedido está em preparo." },
  { key: "out",          label: "Saiu para entrega",      text: "Seu pedido saiu para entrega." },
  { key: "no_contact",   label: "Sem contato",            text: "Não conseguimos contato. Podemos seguir com o pedido?" },
  { key: "canceled",     label: "Cancelar",               text: "Infelizmente precisamos cancelar este pedido." },
];

export function buildProposalWhatsappMessage(opts: {
  customerName?: string | null;
  storeName?: string | null;
  orderCode?: string | null;
  subtotal?: number | null;
  finalFee?: number | null;
  finalTotal?: number | null;
  etaMin?: number | null;
  note?: string | null;
}): string {
  const brl = (n?: number | null) =>
    n == null ? null : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const lines: string[] = [];
  lines.push(`Olá, ${opts.customerName || "cliente"}! Aqui é da ${opts.storeName || "loja"}.`);
  lines.push("");
  if (opts.orderCode) lines.push(`Revisamos seu pedido ${opts.orderCode}.`);
  lines.push("");
  if (opts.subtotal != null) lines.push(`Subtotal: ${brl(opts.subtotal)}`);
  if (opts.finalFee != null) lines.push(`Taxa de entrega final: ${brl(opts.finalFee)}`);
  if (opts.finalTotal != null) lines.push(`Total final: ${brl(opts.finalTotal)}`);
  if (opts.etaMin) lines.push(`Prazo estimado: ${opts.etaMin} min`);
  if (opts.note && opts.note.trim()) {
    lines.push("");
    lines.push(opts.note.trim());
  }
  lines.push("");
  lines.push("Para continuar, confirme pelo app ou responda por aqui se está de acordo.");
  return lines.filter((_, i, arr) => !(arr[i] === "" && arr[i - 1] === "")).join("\n");
}