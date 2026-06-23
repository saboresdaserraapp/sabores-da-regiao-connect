import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FavoriteKind = "establishment" | "product";

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const instanceId = useId();
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`favorites-${user.id}-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["favorites", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc, instanceId]);

  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFavoriteToggle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (kind: FavoriteKind, targetId: string) => {
    if (!user) {
      toast.error("Faça login para favoritar");
      return false;
    }
    const { data: existing, error: lookupError } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id).eq("kind", kind).eq("target_id", targetId).maybeSingle();
    if (lookupError) {
      toast.error(lookupError.message);
      return false;
    }
    if (existing) {
      const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
      if (error) {
        toast.error(error.message);
        return false;
      }
      toast.success("Removido dos favoritos");
    } else {
      const { error } = await supabase.from("favorites").insert({ user_id: user.id, kind, target_id: targetId });
      if (error) {
        toast.error(error.message);
        return false;
      }
      toast.success("Adicionado aos favoritos");
    }
    await qc.invalidateQueries({ queryKey: ["favorites", user.id] });
    return !existing;
  };
}
