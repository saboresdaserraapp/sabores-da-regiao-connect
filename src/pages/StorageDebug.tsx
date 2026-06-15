import { useState } from "react";
import { MediaUploader } from "@/components/media/MediaUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function StorageDebug() {
  const { user } = useAuth();
  const [publicUrl, setPublicUrl] = useState("");
  const [privateUrl, setPrivateUrl] = useState("");

  return (
    <div className="container max-w-4xl py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teste de Upload & Storage</h1>
        <p className="text-muted-foreground">
          Valide as permissões de RLS e o comportamento do Storage para seu usuário.
        </p>
      </div>

      {!user && (
        <Alert variant="destructive">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Não autenticado</AlertTitle>
          <AlertDescription>
            Você precisa estar logado para testar uploads privados (user-media).
          </AlertDescription>
        </Alert>
      )}

      {user && (
        <Alert>
          <User className="h-4 w-4" />
          <AlertTitle>Usuário Autenticado</AlertTitle>
          <AlertDescription className="font-mono text-xs break-all">
            ID: {user.id}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="public" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="public">Public Media (Public/Anonymous)</TabsTrigger>
          <TabsTrigger value="private">User Media (Private/Authenticated)</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bucket: public-media</CardTitle>
              <CardDescription>
                Arquivos aqui são acessíveis via URL pública. Ideal para produtos e banners.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaUploader
                value={publicUrl}
                onChange={setPublicUrl}
                bucket="public-media"
                folder="debug-tests"
                label="Testar Upload Público"
                allowVideo
              />
              {publicUrl && (
                <div className="p-3 bg-muted rounded-md break-all">
                  <p className="text-xs font-medium mb-1">URL Gerada:</p>
                  <code className="text-[10px]">{publicUrl}</code>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="private" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Bucket: user-media
              </CardTitle>
              <CardDescription>
                Arquivos aqui são privados e requerem URL assinada. Ideal para documentos sensíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaUploader
                value={privateUrl}
                onChange={setPrivateUrl}
                bucket="user-media"
                folder="private-tests"
                label="Testar Upload Privado"
                allowVideo
              />
              {privateUrl && (
                <div className="p-3 bg-muted rounded-md break-all">
                  <p className="text-xs font-medium mb-1 text-primary">URL Assinada (Expira em 1 ano):</p>
                  <code className="text-[10px]">{privateUrl}</code>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Dicas de Depuração</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Erro 403 / RLS:</strong> Verifique se as políticas de RLS permitem `INSERT` no bucket para o seu usuário.
            </li>
            <li>
              <strong>Tamanho:</strong> O limite atual é dinâmico (8MB para imagens, 20MB para vídeos).
            </li>
            <li>
              <strong>Estrutura:</strong> Os arquivos são salvos seguindo o padrão: <code>{user ? user.id : 'user-id'}/folder/uuid.ext</code>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
