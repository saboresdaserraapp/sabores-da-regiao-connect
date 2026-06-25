/**
 * Guests cannot update `order_messages.read_at` (RLS protects it).
 * To deliver a "lida/zerada imediatamente" UX for visitors, we keep a
 * per-tracking-code "last seen at" timestamp in localStorage. The guest
 * unread counter is then computed locally as messages newer than this
 * timestamp coming from the establishment.
 */
const KEY = "sabores:guest_seen_messages";

type SeenMap = Record<string, string>; // tracking_code -> ISO timestamp

function read(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    const out: SeenMap = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch { return {}; }
}

function write(map: SeenMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("guest-seen-messages-changed"));
  } catch { /* ignore quota */ }
}

export function getGuestSeenMap(): SeenMap { return read(); }

export function getGuestSeenAt(code: string | null | undefined): string | null {
  if (!code) return null;
  return read()[code] ?? null;
}

export function markGuestSeen(code: string | null | undefined, when: Date = new Date()) {
  if (!code) return;
  const map = read();
  map[code] = when.toISOString();
  write(map);
}

export function subscribeGuestSeen(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("guest-seen-messages-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("guest-seen-messages-changed", handler);
    window.removeEventListener("storage", handler);
  };
}