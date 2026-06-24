/**
 * Lightweight client-side analytics for UI events that don't fit the
 * `events` DB enum. Emits a window CustomEvent + console log so that
 * downstream listeners (GA, PostHog, etc.) can subscribe without touching DB.
 */
export type UiEventName =
  | "signup_invite_shown"
  | "signup_invite_cta_click"
  | "signup_invite_dismissed"
  | "signup_invite_signup_completed";

export function trackUiEvent(name: UiEventName, payload: Record<string, unknown> = {}) {
  try {
    const detail = { name, ts: Date.now(), ...payload };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ui:analytics", { detail }));
      // dataLayer for GTM-style consumers, if present
      const w = window as unknown as { dataLayer?: unknown[] };
      if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...payload });
    }
    // eslint-disable-next-line no-console
    console.info("[ui:analytics]", name, payload);
  } catch {
    /* analytics must never break the app */
  }
}