import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChefHat, LayoutDashboard, Pause, Plus, Receipt, Store, Tag, Truck, Warehouse } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderLite = Pick<Database["public"]["Tables"]["orders"]["Row"], "id" | "total" | "status" | "created_at">;
type MarkLite = Pick<Database["public"]["Tables"]["order_financial_marks"]["Row"], "order_id" | "paid_status" | "amount_received">;
type StockLite = Pick<Database["public"]["Tables"]["product_stock"]["Row"], "quantity" | "min_quantity">;
type ProductLite = Pick<Database["public"]["Tables"]["products"]["Row"], "id" | "image" | "description">;
type ReviewLite = Pick<Database["public"]["Tables"]["reviews"]["Row"], "id" | "rating" | "author" | "text" | "created_at">;

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "ok" | "muted" }) {
  const cls = tone === "warn" ? "border-amber-300 bg-amber-50" :
              tone === "ok"   ? "border-emerald-300 bg-emerald-50" :
                                "border-border bg-muted/30";
  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${cls}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-balance">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground text-pretty">{hint}</div>}
    </div>
  );
}

function brl(v: number) { return `R$ ${v.toFixed(2).replace(".", ",")}`; }

export default function VisaoGeral() {
  const { ctx } = useActiveEstablishment();
  const [stats, setStats] = useState({
    ordersToday: 0, awaiting: 0, confirmed: 0,
    estValue: 0, confValue: 0, lowStock: 0, missingPhoto: 0,
    missingEstabMedia: false,
  });
  const [reviews, setReviews] = useState<ReviewLite[]>([]);

  useEffect(() => {
    if (!ctx) return;
    const id = ctx.establishmentId;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    (async () => {
      const [{ data: orders }, { data: marks }, { data: stock }, { data: prods }, { data: rv }, { data: estab }] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at").eq("establishment_id", id).gte("created_at", since),
        supabase.from("order_financial_marks").select("order_id,paid_status,amount_received").eq("establishment_id", id),
        supabase.from("product_stock").select("quantity,min_quantity").eq("establishment_id", id),
        supabase.from("products").select("id,image,description").eq("establishment_id", id),
        supabase.from("reviews").select("id,rating,author,text,created_at").eq("establishment_id", id).order("created_at", { ascending: false }).limit(3),
        supabase.from("establishments").select("logo,cover").eq("id", id).maybeSingle(),
      ]);
      const marksMap: Record<string, MarkLite> = {};
      ((marks ?? []) as MarkLite[]).forEach((m) => { marksMap[m.order_id] = m; });
      let est = 0, conf = 0, awaiting = 0, confirmed = 0;
      ((orders ?? []) as OrderLite[]).forEach((o) => {
        est += Number(o.total ?? 0);
        const m = marksMap[o.id];
        if (m?.paid_status === "recebido") { conf += Number(m.amount_received ?? o.total ?? 0); confirmed++; }
        else if (m?.paid_status !== "cancelado") awaiting++;
      });
      setStats({
        ordersToday: (orders ?? []).length,
        awaiting, confirmed,
        estValue: est, confValue: conf,
        lowStock: ((stock ?? []) as StockLite[]).filter((s) => Number(s.quantity ?? 0) <= Number(s.min_quantity ?? 0)).length,
        missingPhoto: ((prods ?? []) as ProductLite[]).filter((p) => !p.image || !p.description).length,
        missingEstabMedia: !estab?.logo || !estab?.cover,
      });
      setReviews((rv ?? []) as ReviewLite[]);
    })();
  }, [ctx?.establishmentId]);

  if (!ctx) return null;

  const STATUS = ctx.establishmentStatus === "ativo"
    ? { label: "Aberta", tone: "ok" as const }
    : ctx.establishmentStatus === "pendente"
    ? { label: "Em análise", tone: "warn" as const }
    : { label: "Inativa", tone: "muted" as const };

  return (
    <section className="space-y-6">
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Visão geral</h1>
            <p className="text-sm text-muted-foreground">Resumo de {ctx.establishmentName}</p>
          </div>
          {ctx.establishmentStatus === "ativo" && (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="bg-white">
                <Link to={`/loja/${ctx.establishmentSlug}`} target="_blank">
                  <Store className="size-4 mr-2" /> Ver meu cardápio
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-primary text-primary-foreground">
                <Link to={`/minha-loja/${ctx.establishmentId}/painel`}>
                  <LayoutDashboard className="size-4 mr-2" /> Painel da loja
                </Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Status" value={STATUS.label} tone={STATUS.tone} />
        <Stat label="Plano atual" value={ctx.activePlan.name ?? "—"} hint={ctx.subscriptionStatus ?? "sem assinatura"} />
        <Stat label="Pedidos hoje" value={String(stats.ordersToday)} hint={`${stats.awaiting} aguardando · ${stats.confirmed} confirmados`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Valor estimado (24h)"      value={brl(stats.estValue)}  hint="Pedidos enviados ao WhatsApp" />
        <Stat label="Confirmado manual (24h)"   value={brl(stats.confValue)} hint="Pagamentos registrados pela loja" />
        <Stat label="Alertas"                   value={String(stats.lowStock + stats.missingPhoto)}
          hint={`${stats.lowStock} estoque baixo · ${stats.missingPhoto} produtos sem foto/descrição`}
          tone={(stats.lowStock + stats.missingPhoto) > 0 ? "warn" : "ok"} />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold mb-3">Atalhos rápidos</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><Link to={`/minha-loja/${ctx.establishmentId}/produtos`}><Plus className="size-4 mr-1" /> Adicionar produto</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to={`/minha-loja/${ctx.establishmentId}/horarios`}><Pause className="size-4 mr-1" /> Pausar loja</Link></Button>
          {canUseFeature(ctx, "simple_promotions") && (
            <Button asChild size="sm" variant="outline"><Link to={`/minha-loja/${ctx.establishmentId}/promocoes`}><Tag className="size-4 mr-1" /> Criar promoção</Link></Button>
          )}
          <Button asChild size="sm" variant="outline"><Link to={`/minha-loja/${ctx.establishmentId}/entrega`}><Truck className="size-4 mr-1" /> Editar entrega</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to={`/minha-loja/${ctx.establishmentId}/pedidos`}><Receipt className="size-4 mr-1" /> Ver pedidos</Link></Button>
          {canUseFeature(ctx, "stock_basic") && (
            <Button asChild size="sm" variant="outline"><Link to={`/minha-loja/${ctx.establishmentId}/estoque`}><Warehouse className="size-4 mr-1" /> Atualizar estoque</Link></Button>
          )}
          <Button asChild size="sm" variant="outline"><Link to={`/minha-loja/${ctx.establishmentId}/cardapio`}><ChefHat className="size-4 mr-1" /> Cardápio</Link></Button>
        </div>
      </div>

      {(stats.lowStock > 0 || stats.missingPhoto > 0 || stats.missingEstabMedia) && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" /> Pendências</div>
          <ul className="mt-2 space-y-1 text-xs">
            {stats.missingEstabMedia && <li>• Loja sem logo ou imagem de capa — <Link className="underline font-medium" to={`/minha-loja/${ctx.establishmentId}/midia`}>atualizar mídia da loja</Link></li>}
            {stats.lowStock > 0 && <li>• {stats.lowStock} produto(s) com estoque baixo ou esgotado — <Link className="underline font-medium" to={`/minha-loja/${ctx.establishmentId}/estoque`}>abrir estoque</Link></li>}
            {stats.missingPhoto > 0 && <li>• {stats.missingPhoto} produto(s) sem foto ou descrição — <Link className="underline font-medium" to={`/minha-loja/${ctx.establishmentId}/produtos`}>revisar produtos</Link></li>}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">Avaliações recentes</h2>
          <Button asChild size="sm" variant="ghost"><Link to={`/minha-loja/${ctx.establishmentId}/avaliacoes`}>Ver todas</Link></Button>
        </div>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem avaliações ainda.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {reviews.map(r => (
              <li key={r.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.author ?? "Cliente"}</span>
                  <Badge variant="outline" className="text-[10px]">{"★".repeat(r.rating)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
