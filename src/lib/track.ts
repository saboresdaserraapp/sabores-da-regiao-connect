import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EventType = Database["public"]["Enums"]["event_type"];

const SESSION_KEY = "sdr_session_id";

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

interface TrackParams {
  establishment_id?: string;
  product_id?: string;
  value_cents?: number;
  neighborhood?: string;
  meta?: Record<string, unknown>;
}

export async function trackEvent(type: EventType, params: TrackParams = {}) {
  try {
    const now = new Date();
    await supabase.from("events").insert({
      type,
      session_id: getSessionId(),
      hour: now.getHours(),
      weekday: now.getDay(),
      establishment_id: params.establishment_id ?? null,
      product_id: params.product_id ?? null,
      value_cents: params.value_cents ?? null,
      neighborhood: params.neighborhood ?? null,
      meta: (params.meta ?? {}) as never,
    });
  } catch {
    // tracking failures must never break the app
  }
}
