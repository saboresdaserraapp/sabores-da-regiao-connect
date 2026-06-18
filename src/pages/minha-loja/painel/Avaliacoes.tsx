import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { canUseFeature } from "@/lib/permissions";
import { PainelSection, Gated } from "./_shared";
import { EmptyState } from "@/components/ui/empty-state";

export default function Avaliacoes() {
  const { ctx } = useActiveEstablishment();
  const canReply = ctx ? canUseFeature(ctx, "review_replies") : false;

  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["owner-reviews", ctx?.establishmentId],
    enabled: !!ctx?.establishmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,author,rating,text,reply,created_at")
        .eq("establishment_id", ctx!.establishmentId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!ctx) return null;

  return (
    <PainelSection
      title="Avaliações"
      subtitle={canReply ? "Você pode responder avaliações dos clientes" : "Veja o que seus clientes estão dizendo"}
    >
      <Gated feature="basic_reviews">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando avaliações…
          </div>
        ) : error ? (
          <EmptyState
            icon={MessageSquare}
            title="Não foi possível carregar"
            description="Tente recarregar a página em instantes."
          />
        ) : !reviews || reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Sem avaliações ainda"
            description="Quando seus clientes avaliarem a loja, elas aparecerão aqui."
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-border/70 p-3 text-sm transition-shadow hover:shadow-sm">
                <div className="flex justify-between">
                  <strong>{r.author}</strong>
                  <span>★ {r.rating}</span>
                </div>
                <p className="mt-1 text-muted-foreground text-pretty">{r.text}</p>
                {r.reply && (
                  <p className="mt-2 rounded bg-muted/40 p-2 text-xs">
                    <strong>Resposta:</strong> {r.reply}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Gated>
    </PainelSection>
  );
}
