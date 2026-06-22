import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public (anon-only) client used for catalog reads that must NOT carry
// the user's auth token. Using the authenticated client causes RLS to
// evaluate policies as `authenticated`, which currently blocks public
// catalog reads for logged-in users.
export const publicSupabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);