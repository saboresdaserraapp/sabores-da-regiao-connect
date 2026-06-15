import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { useMyEstablishments, deriveStatus } from "@/hooks/useMyEstablishments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Store, AlertTriangle } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprovada", pending_approval: "Em análise",
  correction_requested: "Correções solicitadas", rejected: "Recusada",
  suspended: "Suspensa", inactive: "Inativa", suspenso: "Suspensa",
};

export default function MinhaLojaSelecionar() {
  const { data, isLoading } = useMyEstablishments();
  return (
    <>
      <Header />
      <div className="container py-10 max-w-4xl">
        <h1 className="font-display text-2xl font-bold">Escolha qual loja deseja administrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Você tem mais de um estabelecimento vinculado à sua conta.</p>

        <div className="mt-6 grid gap-3">
          {isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {(data ?? []).map((e) => {
            const status = deriveStatus(e);
            const isApproved = status === "approved";
            const warn = !isApproved || e.status === "suspenso";
            return (
              <div key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-xl bg-muted overflow-hidden">
                    {e.logo ? <img src={e.logo} className="size-full object-cover" alt="" /> : <Store className="size-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold truncate">{e.name}</div>
                      <Badge variant={isApproved ? "secondary" : "outline"} className="text-[10px]">{STATUS_LABEL[status] ?? status}</Badge>
                      {e.plan_name && <Badge variant="outline" className="text-[10px]">{e.plan_name}</Badge>}
                      <Badge variant="outline" className="text-[10px] capitalize">{e.role}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[e.neighborhood, e.city].filter(Boolean).join(" · ") || `/${e.slug}`}
                    </div>
                  </div>
                  <Button asChild size="sm" variant={isApproved ? "default" : "outline"}>
                    <Link to={isApproved ? `/minha-loja/${e.id}` : `/minha-loja/status?id=${e.id}`}>
                      {isApproved ? "Acessar painel" : "Ver status"}
                    </Link>
                  </Button>
                </div>
                {warn && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground">
                    <AlertTriangle className="size-3.5 mt-0.5" />
                    <span>
                      {e.status === "suspenso"
                        ? <>Loja suspensa. {e.suspended_reason ?? "Entre em contato com o suporte."}</>
                        : status === "correction_requested"
                          ? "Há correções pendentes solicitadas pelo administrador."
                          : "Esta loja ainda não foi aprovada. Painel completo bloqueado."}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <Button asChild variant="outline"><Link to="/minha-loja/cadastrar"><Plus className="mr-1 size-4" /> Cadastrar outra loja</Link></Button>
        </div>
      </div>
    </>
  );
}
