import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useMyEstablishmentIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-establishment-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("establishment_owners")
        .select("establishment_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.establishment_id as string);
    },
  });
}