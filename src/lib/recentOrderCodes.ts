const KEY = "sabores:recent_order_codes";
const MAX = 5;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

function write(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent("recent-order-codes-changed"));
  } catch { /* ignore quota */ }
}

export function getRecentOrderCodes(): string[] {
  return read();
}

export function addRecentOrderCode(code: string | null | undefined) {
  if (!code) return;
  const list = read().filter((c) => c !== code);
  list.unshift(code);
  write(list);
}

export function removeRecentOrderCode(code: string) {
  write(read().filter((c) => c !== code));
}

export function subscribeRecentOrderCodes(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("recent-order-codes-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("recent-order-codes-changed", handler);
    window.removeEventListener("storage", handler);
  };
}