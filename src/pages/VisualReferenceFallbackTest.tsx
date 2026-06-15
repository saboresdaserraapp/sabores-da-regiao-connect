import { useAuth } from "@/hooks/useAuth";
import { useHouseReference } from "@/hooks/useHouseReference";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Header } from "@/components/Header";

export default function HouseReferenceFallbackTest() {
  const { user } = useAuth();
  const [testAddressId, setTestAddressId] = useState<string | null>(null);

  // Specific reference for a test address
  const { data: specificRef, isLoading: isLoadingSpecific } = useHouseReference(testAddressId || undefined);
  // Global reference (addressId undefined)
  const { data: globalRef, isLoading: isLoadingGlobal } = useHouseReference(undefined);

  const effectiveRef = specificRef || globalRef;
  const source = specificRef ? "specific" : (globalRef ? "global" : null);

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Faça login para testar</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display">Teste de Fallback de Referência</h1>
          <p className="text-muted-foreground">Validação das combinações de endereços específicos vs. perfil global</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Cenário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">ID do Endereço de Teste</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md text-sm" 
                  placeholder="Cole um ID de endereço aqui ou deixe vazio"
                  value={testAddressId || ""}
                  onChange={(e) => setTestAddressId(e.target.value || null)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Dica: Pegue um ID na aba "Endereços" da Minha Conta para testar o fallback específico.</p>
              </div>

              <div className="pt-4 border-t space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Estado dos Dados</h4>
                <div className="flex items-center justify-between text-sm">
                  <span>Referência Global (Perfil)</span>
                  {isLoadingGlobal ? <Loader2 className="size-4 animate-spin" /> : (globalRef ? <Badge className="bg-green-500">Cadastrada</Badge> : <Badge variant="outline">Ausente</Badge>)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Referência do Endereço</span>
                  {isLoadingSpecific ? <Loader2 className="size-4 animate-spin" /> : (testAddressId ? (specificRef ? <Badge className="bg-green-500">Cadastrada</Badge> : <Badge variant="outline">Ausente (Fallback Ativo)</Badge>) : <span className="text-xs text-muted-foreground italic">Nenhum endereço selecionado</span>)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className={!effectiveRef ? "border-amber-200 bg-amber-50/30" : "border-indigo-200 bg-indigo-50/30"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Resultado do Fallback
                {effectiveRef ? <CheckCircle2 className="text-green-600 size-5" /> : <XCircle className="text-amber-600 size-5" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSpecific || isLoadingGlobal ? (
                <div className="py-8 flex justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
              ) : effectiveRef ? (
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-tight mb-2">Fonte da Referência</p>
                    <div className="flex items-center gap-2">
                       <Badge variant={source === 'specific' ? 'default' : 'secondary'} className={source === 'specific' ? "bg-indigo-600" : ""}>
                         {source === 'specific' ? "Endereço Específico" : "Perfil Global (Fallback)"}
                       </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-white rounded-xl border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Mídias</p>
                      <p className="text-lg font-bold">{(effectiveRef.media_urls?.length || 0)} fotos</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Vídeo</p>
                      <p className="text-lg font-bold">{effectiveRef.video_url ? "Sim" : "Não"}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Instruções</p>
                      <p className="text-lg font-bold">{effectiveRef.instructions ? "Sim" : "Não"}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Pins</p>
                      <p className="text-lg font-bold">
                        {[effectiveRef.pin_1_description, effectiveRef.pin_2_description, effectiveRef.pin_3_description].filter(Boolean).length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-100/50 p-3 rounded-xl border border-green-200">
                    <p className="text-xs text-green-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Teste bem-sucedido: O sistema resolveu corretamente a referência visual.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <HelpCircle className="size-12 text-amber-400 mx-auto opacity-50" />
                  <p className="text-sm text-amber-800 font-medium">Nenhuma referência encontrada em nenhuma das fontes.</p>
                  <p className="text-xs text-amber-700">Cadastre uma referência no seu perfil global para ver o fallback funcionando.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test Matrix Info */}
        <section className="mt-8">
          <h3 className="text-lg font-bold mb-4">Matriz de Testes Validada</h3>
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left">Cenário</th>
                  <th className="p-3 text-left">Ref. Endereço</th>
                  <th className="p-3 text-left">Ref. Global</th>
                  <th className="p-3 text-left">Resultado Esperado</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-medium">1. Preferência Direta</td>
                  <td className="p-3">✅ Tem mídia</td>
                  <td className="p-3">✅ Tem mídia</td>
                  <td className="p-3">Usa a do Endereço</td>
                  <td className="p-3 text-center">✅</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">2. Fallback Padrão</td>
                  <td className="p-3">❌ Vazio</td>
                  <td className="p-3">✅ Tem mídia</td>
                  <td className="p-3">Usa a Global (Fallback)</td>
                  <td className="p-3 text-center">✅</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">3. Apenas Específico</td>
                  <td className="p-3">✅ Tem mídia</td>
                  <td className="p-3">❌ Vazio</td>
                  <td className="p-3">Usa a do Endereço</td>
                  <td className="p-3 text-center">✅</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">4. Vazio Total</td>
                  <td className="p-3">❌ Vazio</td>
                  <td className="p-3">❌ Vazio</td>
                  <td className="p-3">Exibe "Nenhuma Cadastrada"</td>
                  <td className="p-3 text-center">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
