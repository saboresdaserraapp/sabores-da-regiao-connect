import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, RefreshCw, Database } from "lucide-react";

type DiagnosticResult = {
  title: string;
  description: string;
  count: number;
  items: string[];
  status: "success" | "warning" | "error";
};

export default function CatalogDebug() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: estabs = [] } = useQuery({
    queryKey: ["debug-estabs"],
    queryFn: async () => {
      const { data } = await supabase.from("establishments").select("id,name,slug,status,approval_status");
      return data ?? [];
    },
  });

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: DiagnosticResult[] = [];

    try {
      // 1. Check for products with invalid promotion data
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, promotional_price, promo, options, product_option_groups(id)");

      const invalidPromos = products?.filter(p => 
        p.promo && (!p.promotional_price || Number(p.promotional_price) >= Number(p.price))
      ) || [];

      diagnostics.push({
        title: "Promoções Inválidas",
        description: "Produtos marcados em promoção mas com preço maior ou igual ao original.",
        count: invalidPromos.length,
        items: invalidPromos.map(p => `${p.name} (Original: ${p.price} / Promo: ${p.promotional_price})`),
        status: invalidPromos.length > 0 ? "error" : "success"
      });

      // 2. Check for legacy options vs V2 groups
      const legacyOnly = products?.filter(p => {
        const optionsArray = Array.isArray(p.options) ? p.options : [];
        const groupCount = (p.product_option_groups as any[])?.length || 0;
        return optionsArray.length > 0 && groupCount === 0;
      }) || [];

      diagnostics.push({
        title: "Produtos com Adicionais Legados (JSONB)",
        description: "Produtos que ainda usam a estrutura antiga de opcionais.",
        count: legacyOnly.length,
        items: legacyOnly.map(p => `${p.name} (${(p.options as any[])?.length || 0} opcionais)`),
        status: legacyOnly.length > 0 ? "warning" : "success"
      });

      // 3. Check for establishment configuration
      const inactiveEstabs = (estabs || []).filter(e => e.status !== "ativo" || e.approval_status !== "approved");
      diagnostics.push({
        title: "Estabelecimentos Ocultos",
        description: "Lojas que não aparecerão no cardápio público devido ao status ou aprovação.",
        count: inactiveEstabs.length,
        items: inactiveEstabs.map(e => `${e.name} (Status: ${e.status} / Aprovação: ${e.approval_status})`),
        status: inactiveEstabs.length > 0 ? "warning" : "success"
      });

      setResults(diagnostics);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-cream pb-20">
      <Header />
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Diagnóstico de Dados</h1>
            <p className="text-sm text-muted-foreground">Verifique a integridade de produtos e sincronização legada.</p>
          </div>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Database className="mr-2 size-4" />}
            Rodar Diagnóstico
          </Button>
        </div>

        <div className="grid gap-4">
          {results.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                Clique no botão acima para analisar os dados do catálogo.
              </CardContent>
            </Card>
          )}

          {results.map((res, i) => (
            <Card key={i} className={res.status === "error" ? "border-destructive/50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {res.status === "success" && <CheckCircle2 className="size-5 text-green-500" />}
                    {res.status === "warning" && <AlertCircle className="size-5 text-amber-500" />}
                    {res.status === "error" && <AlertCircle className="size-5 text-destructive" />}
                    <CardTitle className="text-lg">{res.title}</CardTitle>
                  </div>
                  <Badge variant={res.status === "success" ? "outline" : res.status === "warning" ? "secondary" : "destructive"}>
                    {res.count} afetados
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{res.description}</p>
              </CardHeader>
              <CardContent>
                {res.items.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-muted/50 p-3 text-[10px] space-y-1">
                    {res.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-muted-foreground/30" />
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
