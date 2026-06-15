import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-cream p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-glow">
        <h1 className="font-display text-2xl font-semibold">Recuperar senha</h1>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">Enviaremos um link para redefinir sua senha.</p>
        {sent ? (
          <div className="rounded-xl bg-primary/10 p-4 text-sm">Link enviado! Verifique seu e-mail.</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Enviar link
            </Button>
          </form>
        )}
        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-primary">Voltar para login</Link>
        </div>
      </div>
    </div>
  );
}
