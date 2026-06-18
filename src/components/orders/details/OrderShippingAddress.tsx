import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  addressId: string | null;
  fallbackName?: string | null;
  fallbackPhone?: string | null;
}

type AddressRow = {
  label: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  reference: string | null;
  popular_location_name: string | null;
};

export function OrderShippingAddress({ addressId, fallbackName, fallbackPhone }: Props) {
  const [addr, setAddr] = useState<AddressRow | null>(null);
  const [loading, setLoading] = useState(!!addressId);

  useEffect(() => {
    let active = true;
    if (!addressId) {
      setAddr(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("addresses")
      .select("label,street,number,complement,neighborhood,city,state,zip,reference,popular_location_name")
      .eq("id", addressId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setAddr((data as any) ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [addressId]);

  if (!addressId) {
    return (
      <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
        Retirada no balcão.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-medium">
        <MapPin className="size-4 text-muted-foreground" />
        Endereço de entrega
      </div>
      {loading ? (
        <p className="text-muted-foreground">Carregando endereço...</p>
      ) : addr ? (
        <div className="space-y-0.5 text-muted-foreground">
          {addr.label && <div className="font-medium text-foreground">{addr.label}</div>}
          {addr.popular_location_name && (
            <div className="text-foreground">{addr.popular_location_name}</div>
          )}
          <div>
            {[addr.street, addr.number].filter(Boolean).join(", ")}
            {addr.complement ? ` — ${addr.complement}` : ""}
          </div>
          <div>
            {[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(" · ")}
          </div>
          {addr.zip && <div>CEP {addr.zip}</div>}
          {addr.reference && <div className="italic">Ref.: {addr.reference}</div>}
          {fallbackName && (
            <div className="pt-1 text-foreground">
              {fallbackName}
              {fallbackPhone ? ` · ${fallbackPhone}` : ""}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">Endereço indisponível.</p>
      )}
    </div>
  );
}