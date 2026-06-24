/**
 * Brazilian phone helpers — tolerant of user typing.
 * Accepts inputs like "(11) 91234-5678", "11912345678",
 * "+55 11 91234 5678", "55 11 9 1234-5678" and returns
 * the digits-only national form (10 or 11 digits) or a
 * normalized E.164-ish form prefixed with +55 when valid.
 */
const DIGITS = (s: string) => (s ?? "").replace(/\D/g, "");

/** Returns just the digits of the BR national number (DDD + assinante). */
export function normalizeBrPhone(input: string | null | undefined): string {
  let d = DIGITS(input ?? "");
  if (!d) return "";
  // strip BR country code if present
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  // strip a leading 0 (old long-distance prefix)
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1);
  return d;
}

/** True if value parses to a valid BR mobile/landline (10 or 11 digits, DDD 11-99). */
export function isValidBrPhone(input: string | null | undefined): boolean {
  const d = normalizeBrPhone(input);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  // 11 digits => mobile, must start with 9 after DDD
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** Pretty mask: "(11) 91234-5678" or "(11) 1234-5678". Falls back to input when unknown. */
export function formatBrPhone(input: string | null | undefined): string {
  const d = normalizeBrPhone(input);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return input ?? "";
}

/** E.164 (+55DDDXXXXXXXX) when valid, otherwise empty string. */
export function toE164Br(input: string | null | undefined): string {
  const d = normalizeBrPhone(input);
  return isValidBrPhone(d) ? `+55${d}` : "";
}

/**
 * Progressive mask used while the user types. Always returns a value
 * the user can keep editing, e.g. "(", "(11", "(11) 9", "(11) 91234-5678".
 */
export function formatBrPhoneTyping(input: string | null | undefined): string {
  const d = normalizeBrPhone(input).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}