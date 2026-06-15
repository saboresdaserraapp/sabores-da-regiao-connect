import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useMyEstablishments, deriveStatus } from "@/hooks/useMyEstablishments";
import { ApprovalBanner } from "@/components/owner/OwnerNotices";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Pencil } from "lucide-react";

export default function MinhaLojaStatus() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const { data: list } = useMyEstablishments();
  const estab = useMemo(() => (id ? list?.find((e) => e.id === id) : list?.[0]) ?? null, [list, id]);

  const { data: req } = useQuery({
    queryKey: ["latest-approval-req", estab?.id],
    enabled: !!estab?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("establishment_approval_requests")
        .select("*")
        .eq("establishment_id", estab!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (!estab) return (
    <>
      <Header />
      <div className="container py-10 max-w-2xl">
        <p className="text-muted-foreground">Loja não encontrada.</p>
      </div>
    </>
  );

  const status = deriveStatus(estab);
  const fields = (req?.correction_requested_fields_json as any) || [];

  return (
    <>
      <Header />
      <div className="container py-10 max-w-2xl space-y-4">
        <header>
          <h1 className="font-display text-2xl font-bold">{estab.name}</h1>
          <p className="text-sm text-muted-foreground">Status da sua loja na plataforma</p>
        </header>

        <ApprovalBanner status={status} reason={req?.rejection_reason ?? req?.admin_notes ?? undefined} fields={Array.isArray(fields) ? fields : []} />

        <div className="flex flex-wrap gap-2">
          {(status === "correction_requested" || status === "pending_approval") && (
            <Button asChild><Link to="/minha-loja/cadastrar"><Pencil className="mr-1 size-4" /> Editar e reenviar</Link></Button>
          )}
          {status === "approved" && (
            <Button asChild><Link to={`/minha-loja/${estab.id}/painel`}>Abrir painel</Link></Button>
          )}
          <Button asChild variant="outline"><a href="mailto:suporte@saboresdaserra.app"><LifeBuoy className="mr-1 size-4" /> Falar com suporte</a></Button>
        </div>
      </div>
    </>
  );
}
