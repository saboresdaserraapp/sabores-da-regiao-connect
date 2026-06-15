import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Package, MapPin, ExternalLink, ImageIcon } from "lucide-react";
import { useState } from "react";
import { OrderReferencesPanel } from "@/components/orders/OrderReferencesPanel";
import { Link } from "react-router-dom";

export default function PaginaTesteStorage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["test-storage-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, tracking_code, customer_name, address_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = orders?.filter(o => 
    o.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Faça login para testar suas referências visuais.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/login">Ir para Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-cream">
      <Header />
      <main className="container py-8 max-w-5xl">
        <div className="flex flex-col gap-6">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold">Validação de Referências</h1>
            <p className="text-muted-foreground">Teste como suas referências visuais aparecem para o estabelecimento.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-[350px_1fr]">
            <section className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="size-5 text-primary" /> Meus Pedidos
                  </CardTitle>
                  <CardDescription>Selecione um pedido para validar os arquivos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código ou nome..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border">
                    {isLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
                    ) : filteredOrders?.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
                    ) : (
                      filteredOrders?.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOrderId(o.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-muted/50 ${
                            selectedOrderId === o.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm">#{o.tracking_code}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(o.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{o.customer_name}</div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <Badge variant={o.address_id ? "secondary" : "outline"} className="text-[9px] h-4">
                              {o.address_id ? "Com Endereço" : "Sem Endereço"}
                            </Badge>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Por que validar?</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>Este fluxo simula a visão do lojista e do entregador.</p>
                  <p>Certifique-se de que as imagens carregam corretamente e o botão de "Baixar tudo" funciona no seu navegador.</p>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              {selectedOrderId ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-display font-bold flex items-center gap-2">
                      <ImageIcon className="size-5" /> Painel de Visualização
                    </h2>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/pedido/${orders?.find(o => o.id === selectedOrderId)?.tracking_code}`} className="gap-1.5">
                        Ver Página do Pedido <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  </div>
                  
                  <OrderReferencesPanel orderId={selectedOrderId} />
                  
                  <div className="bg-muted/50 rounded-xl p-4 border border-dashed border-border mt-8">
                    <h3 className="text-sm font-bold mb-2">Checklist de Teste:</h3>
                    <ul className="text-xs space-y-1.5 text-muted-foreground list-disc pl-4">
                      <li>As fotos aparecem nítidas?</li>
                      <li>O vídeo (se houver) reproduz sem erros?</li>
                      <li>As instruções escritas estão legíveis?</li>
                      <li>Os "Pins" estão na ordem correta (1, 2, 3)?</li>
                      <li>O botão "Baixar todas as mídias" salvou os arquivos no seu dispositivo?</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
                  <Package className="size-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">Selecione um pedido ao lado</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1">
                    Escolha um pedido recente para validar se as referências visuais foram salvas corretamente no Supabase Storage.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Badge({ children, variant = "default", className }: { children: React.ReactNode, variant?: "default" | "secondary" | "outline", className?: string }) {
  const styles = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-border text-muted-foreground"
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
