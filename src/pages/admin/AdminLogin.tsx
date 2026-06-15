import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UtensilsCrossed, Loader2, ShieldAlert } from "lucide-react";
import { OFFICIAL_ADMIN_EMAIL } from "@/lib/constants";

const AdminLogin = () => {
  const { user, loading, isOfficialAdmin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  if (loading) return null;
  if (user && isOfficialAdmin) return <Navigate to="/admin" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() !== OFFICIAL_ADMIN_EMAIL.toLowerCase()) {
      toast.error("Esta área é restrita ao administrador da plataforma.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (error) throw error;
      nav("/admin");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setGoogleBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin",
      });
      if (r.error) throw new Error(r.error.message ?? "Erro ao autenticar com Google");
      if (r.redirected) return;
      nav("/admin");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar com Google");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-cream p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-gradient-warm shadow-glow">
            <UtensilsCrossed className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">Sabores da Região</p>
          </div>
        </div>

        {user && !isOfficialAdmin && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              Você está conectado como <strong>{user.email}</strong>, mas esta área é exclusiva da
              conta oficial da plataforma.
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail oficial</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd">Senha</Label>
            <Input id="pwd" type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Entrar
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          ou
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={google} disabled={googleBusy}>
          {googleBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Entrar com Google
        </Button>

        <p className="mt-6 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          Acesso restrito ao administrador oficial da plataforma. Lojistas devem usar a área
          <strong> Minha Loja</strong> a partir da tela inicial.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
