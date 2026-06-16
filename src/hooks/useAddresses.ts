import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").eq("user_id", user!.id).order("is_default", { ascending: false });
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
      if (!user) return;
      if (addr.is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }
      if (addr.id) {
        const { error } = await supabase.from("addresses").update(addr).eq("id", addr.id);
        if (error) return toast.error(error.message);
        toast.success("Endereço atualizado");
      } else {
        const { error } = await supabase.from("addresses").insert({ ...addr, user_id: user.id } as any);
        if (error) return toast.error(error.message);
        toast.success("Endereço adicionado");
      }
      invalidate();
    },
    async remove(id: string) {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Endereço removido");
      invalidate();
    },
  };
}
