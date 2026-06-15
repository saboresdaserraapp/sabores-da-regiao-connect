import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyEstablishments, deriveStatus } from "@/hooks/useMyEstablishments";
import { Loader2 } from "lucide-react";

export default function MinhaLojaDispatcher() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading } = useMyEstablishments();
  const nav = useNavigate();

  useEffect(() => {
    if (authLoading || isLoading || !user) return;
    const list = data ?? [];
    if (list.length === 0) { nav("/minha-loja/cadastrar", { replace: true }); return; }
    if (list.length > 1) { nav("/minha-loja/selecionar", { replace: true }); return; }
    const e = list[0];
    const status = deriveStatus(e);
    if (status === "approved") nav(`/minha-loja/${e.id}`, { replace: true });
    else nav("/minha-loja/status", { replace: true });
  }, [authLoading, isLoading, user, data, nav]);

  if (!authLoading && !user) return <Navigate to="/login?next=/minha-loja" replace />;

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Abrindo Minha Loja…</div>
    </div>
  );
}
