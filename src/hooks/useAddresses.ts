import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Address {
  id: string;
  user_id: string;
  label: string;
  zip: string | null;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  reference: string | null;
  is_default: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  popular_location_name: string | null;
  delivery_instructions: string | null;
}

export function useAddresses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const instanceId = useId();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const channelName = `addresses-${userId}-${instanceId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "addresses", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["addresses", userId] });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // eslint-disable-next-line no-console
          console.warn("[useAddresses:rt]", { channel: channelName, status });
        }
      });
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[useAddresses:rt] removeChannel failed", err);
      }
    };
  }, [userId, qc, instanceId]);

  const query = useQuery({
    queryKey: ["addresses", userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", userId!)
          .order("is_default", { ascending: false });
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[useAddresses] query failed", { userId, error });
          throw error;
        }
        return (data ?? []) as Address[];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[useAddresses] unexpected error", { userId, err });
        throw err;
      }
    },
  });

  return { ...query, data: query.data ?? ([] as Address[]) };
}

export function useAddressMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["addresses", user?.id] });

  return {
    async save(addr: Partial<Address> & { street: string }) {
      if (!user) {
        toast.error("Faça login para salvar endereços");
        return false;
      }
      if (addr.is_default) {
        const { error } = await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
        if (error) {
          toast.error(error.message);
          return false;
        }
      }
      if (addr.id) {
        const { data, error } = await supabase.from("addresses").update(addr).eq("id", addr.id).select("*").maybeSingle();
        if (error) {
          toast.error(error.message);
          return false;
        }
        toast.success("Endereço atualizado");
        await invalidate();
        return data as Address;
      } else {
        const { data, error } = await supabase.from("addresses").insert({ ...addr, user_id: user.id } as any).select("*").maybeSingle();
        if (error) {
          toast.error(error.message);
          return false;
        }
        toast.success("Endereço adicionado");
        await invalidate();
        return data as Address;
      }
    },
    async remove(id: string) {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return false;
      }
      toast.success("Endereço removido");
      await invalidate();
      return true;
    },
  };
}
