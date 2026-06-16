import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, UtensilsCrossed } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const dest = (loc.state as any)?.from?.pathname || "/minha-conta";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    nav(dest, { replace: true });
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/minha-conta" });
    if (r.error) toast.error(r.error.message || "Falha no login com Google");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-cream p-4 safe-bottom">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-glow ring-1 ring-black/[0.03]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-warm shadow-glow">
            <UtensilsCrossed className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">Sabores da Região</div>
            <div className="text-xs text-muted-foreground">Entrar na sua conta</div>
          </div>
        </Link>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Senha</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Entrar
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google}>
          <svg viewBox="0 0 24 24" className="mr-2 size-4" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.7 2.5 2.5 6.8 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.4 0-.6-.1-1.1-.2-1.9H12z"/>
          </svg>
          Continuar com Google
        </Button>

        <div className="mt-6 space-y-2 text-center text-sm">
          <Link to="/recuperar-senha" className="text-muted-foreground hover:text-primary">Esqueceu a senha?</Link>
          <div className="text-muted-foreground">
            Não tem conta? <Link to="/cadastro" className="font-medium text-primary">Criar conta</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
