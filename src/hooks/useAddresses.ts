import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`addresses-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "addresses", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["addresses", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("addresses").select("*").eq("user_id", user!.id).order("is_default", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Address[];
    },
  });
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
