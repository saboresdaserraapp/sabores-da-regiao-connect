import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

export default function Cadastro() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = schema.safeParse(form);
    if (!v.success) return toast.error(v.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + "/minha-conta",
        data: { display_name: form.name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    nav("/login");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/minha-conta" });
    if (r.error) toast.error(r.error.message || "Falha no Google");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-cream p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-glow">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-warm shadow-glow">
            <UtensilsCrossed className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">Criar sua conta</div>
            <div className="text-xs text-muted-foreground">Favoritos, pedidos e mais</div>
          </div>
        </Link>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input type="password" placeholder="Senha (6+ caracteres)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Criar conta
          </Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google}>Continuar com Google</Button>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="font-medium text-primary">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
