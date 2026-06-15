import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function ProtectedAdminRoute({ requireRoles }: { requireRoles?: AppRole[] }) {
  const { user, loading, isAdmin, isOfficialAdmin, hasRole } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace state={{ from: loc }} />;
  if (!isOfficialAdmin || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="font-display text-2xl font-semibold">Área restrita</h2>
          <p className="mt-2 text-muted-foreground">
            O painel administrativo é acessível apenas pela conta oficial da plataforma.
          </p>
        </div>
      </div>
    );
  }
  if (requireRoles && !hasRole(requireRoles)) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h2 className="font-display text-2xl font-semibold">Permissão insuficiente</h2>
          <p className="mt-2 text-muted-foreground">Esta área é restrita a outros papéis.</p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
