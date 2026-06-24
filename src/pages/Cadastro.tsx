import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Loader2, UtensilsCrossed } from "lucide-react";
import { z } from "zod";
import { formatBrPhone, formatBrPhoneTyping, isValidBrPhone, normalizeBrPhone } from "@/lib/phone";
import { trackUiEvent } from "@/lib/uiAnalytics";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidBrPhone(v), {
      message: "Telefone inválido (informe DDD + número)",
    }),
});

export default function Cadastro() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const prefillName = params.get("prefill_name") ?? "";
  const prefillPhoneRaw = params.get("prefill_phone") ?? "";
  const prefillPhone = prefillPhoneRaw ? formatBrPhone(prefillPhoneRaw) : "";
  const fromTracking = params.get("from_tracking");
  const hasPrefill = Boolean(prefillName || prefillPhone);

  const [form, setForm] = useState({
    name: prefillName,
    email: "",
    password: "",
    phone: prefillPhone ? formatBrPhoneTyping(prefillPhone) : "",
  });
  const [loading, setLoading] = useState(false);

  const phoneDigits = useMemo(() => normalizeBrPhone(form.phone), [form.phone]);
  const phoneValid = phoneDigits.length === 0 ? null : isValidBrPhone(phoneDigits);
  const phoneHint =
    phoneValid === false
      ? phoneDigits.length < 10
        ? "Digite DDD + número (mínimo 10 dígitos)."
        : phoneDigits.length === 11 && phoneDigits[2] !== "9"
        ? "Celulares começam com 9 após o DDD."
        : "Telefone inválido. Confira o DDD e os dígitos."
      : phoneValid
      ? "Número válido."
      : "Opcional. Usaremos para WhatsApp e suporte.";

  useEffect(() => {
    if (!hasPrefill) return;
    toast.success("Usamos os dados do seu pedido. Confira e defina e-mail e senha.");
  }, [hasPrefill]);

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
        data: {
          display_name: form.name.trim(),
          phone: phoneDigits || undefined,
          signup_source: fromTracking ? "post_delivery_invite" : "direct",
          from_tracking: fromTracking ?? undefined,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    // Dedupe analytics: at most one completion per tracking_code/session.
    const sentKey = `sdr_signup_completed_tracked:${fromTracking ?? "direct"}`;
    let alreadyTracked = false;
    try {
      alreadyTracked = sessionStorage.getItem(sentKey) === "1";
    } catch {
      /* noop */
    }
    if (!alreadyTracked) {
      trackUiEvent("signup_invite_signup_completed", {
        tracking_code: fromTracking,
        source: fromTracking ? "post_delivery_invite" : "direct",
        has_phone: Boolean(phoneDigits),
      });
      try {
        sessionStorage.setItem(sentKey, "1");
      } catch {
        /* noop */
      }
    }
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    nav("/login");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/minha-conta" });
    if (r.error) toast.error(r.error.message || "Falha no Google");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-cream p-4 safe-bottom">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-glow ring-1 ring-black/[0.03]">
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
          <div className="space-y-1">
            <div className="relative">
              <Input
                type="tel"
                inputMode="tel"
                placeholder="WhatsApp — (11) 91234-5678"
                value={form.phone}
                aria-invalid={phoneValid === false}
                aria-describedby="phone-hint"
                onChange={(e) => setForm((f) => ({ ...f, phone: formatBrPhoneTyping(e.target.value) }))}
                onBlur={(e) => {
                  const formatted = formatBrPhone(e.target.value);
                  if (formatted && formatted !== form.phone) {
                    setForm((f) => ({ ...f, phone: formatted }));
                  }
                }}
                className={cn(
                  phoneValid === false && "border-destructive focus-visible:ring-destructive",
                  phoneValid === true && "border-success focus-visible:ring-success pr-9",
                )}
              />
              {phoneValid === true && (
                <Check className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-success" aria-hidden />
              )}
            </div>
            <p
              id="phone-hint"
              className={cn(
                "text-xs",
                phoneValid === false ? "text-destructive" : phoneValid ? "text-success" : "text-muted-foreground",
              )}
              role={phoneValid === false ? "alert" : undefined}
            >
              {phoneHint}
            </p>
          </div>
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
