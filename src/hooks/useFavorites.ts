import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FavoriteKind = "establishment" | "product";

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("*").eq("user_id", user!.id);
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
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id).eq("kind", kind).eq("target_id", targetId).maybeSingle();
    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      toast.success("Removido dos favoritos");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, kind, target_id: targetId });
      toast.success("Adicionado aos favoritos");
    }
    qc.invalidateQueries({ queryKey: ["favorites", user.id] });
    return !existing;
  };
}
