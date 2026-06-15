import { useEffect, useState } from "react";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DadosLoja() {
  const { ctx } = useActiveEstablishment();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ctx) return;
    supabase.from("establishments").select("*").eq("id", ctx.establishmentId).maybeSingle()
      .then(({ data }) => setForm(data));
  }, [ctx?.establishmentId]);

  if (!ctx || !form) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("establishments").update({
      name: form.name, tagline: form.tagline, description: form.description,
      category: form.category, category_label: form.category_label,
      whatsapp: form.whatsapp, address: form.address,
      neighborhood: form.neighborhood, city: form.city,
    }).eq("id", ctx.establishmentId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Dados salvos");
  };

  return (
    <PainelSection title="Dados da loja" subtitle="Informações públicas exibidas no app">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Nome</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Categoria</Label><Input value={form.category_label ?? ""} onChange={(e) => set("category_label", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Slogan</Label><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></div>
        <div><Label>Endereço</Label><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div><Label>Bairro</Label><Input value={form.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} /></div>
        <div><Label>Cidade</Label><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
      </div>
      <Button onClick={save} disabled={saving} className="mt-4">{saving ? "Salvando…" : "Salvar"}</Button>
    </PainelSection>
  );
}
