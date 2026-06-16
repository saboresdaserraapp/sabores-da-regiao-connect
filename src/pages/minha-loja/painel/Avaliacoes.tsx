import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { canUseFeature } from "@/lib/permissions";
import { PainelSection } from "./_shared";
import { FeatureLockedCard } from "@/components/owner/FeatureLockedCard";

export default function Avaliacoes() {
  const { ctx } = useActiveEstablishment();
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(() => {
    if (!ctx) return;
    supabase.from("reviews").select("id,author,rating,text,reply,created_at")
      .eq("establishment_id", ctx.establishmentId)
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setReviews(data ?? []));
  }, [ctx?.establishmentId]);
  if (!ctx) return null;
  if (!canUseFeature(ctx, "basic_reviews")) return <FeatureLockedCard feature="basic_reviews" establishmentId={ctx.establishmentId} />;
  const canReply = canUseFeature(ctx, "review_replies");
  return (
    <PainelSection title="Avaliações" subtitle={canReply ? "Você pode responder avaliações" : "Plano atual permite ver avaliações"}>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem avaliações ainda.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/70 p-3 text-sm transition-shadow hover:shadow-sm">
              <div className="flex justify-between"><strong>{r.author}</strong><span>★ {r.rating}</span></div>
              <p className="mt-1 text-muted-foreground text-pretty">{r.text}</p>
              {r.reply && <p className="mt-2 rounded bg-muted/40 p-2 text-xs"><strong>Resposta:</strong> {r.reply}</p>}
            </div>
          ))}
        </div>
      )}
    </PainelSection>
  );
}
