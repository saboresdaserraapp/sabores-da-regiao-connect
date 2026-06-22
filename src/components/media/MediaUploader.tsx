import { useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, Link as LinkIcon, Image as ImageIcon, RefreshCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  bucket?: "public-media" | "user-media";
  folder?: string;
  allowVideo?: boolean;
  accept?: string;
  maxSizeMB?: number;
  aspect?: string; // tailwind aspect class e.g. "aspect-[21/9]"
  className?: string;
  allowUrlInput?: boolean;
  label?: string;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function MediaUploader({
  value,
  onChange,
  bucket = "public-media",
  folder = "uploads",
  allowVideo = false,
  accept,
  maxSizeMB = 8,
  aspect = "aspect-video",
  className,
  allowUrlInput = true,
  label = "Enviar imagem",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [drag, setDrag] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);


  const allowed = allowVideo ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES;
  const acceptAttr = accept || allowed.join(",");
  const maxBytes = (allowVideo ? Math.max(maxSizeMB, 20) : maxSizeMB) * 1024 * 1024;

  const upload = useCallback(async (file: File, attempt = 0) => {
    if (attempt === 0) setRetryCount(0);
    setError(null);

    setLastFile(file);
    
    // Client-side validations
    if (!allowed.includes(file.type)) {
      const msg = `Formato "${file.type}" não suportado. Use ${allowVideo ? "imagem (jpg/png/webp/gif) ou vídeo (mp4)" : "jpg, png, webp ou gif"}.`;
      setError({ message: msg, type: "format" });
      toast.error(msg);
      return;
    }
    
    if (file.size > maxBytes) {
      const msg = `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: ${Math.round(maxBytes / 1024 / 1024)}MB.`;
      setError({ message: msg, type: "size" });
      toast.error(msg);
      return;
    }

    setUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) {
        const msg = "Faça login para enviar arquivos.";
        setError({ message: msg, type: "auth" });
        toast.error(msg);
        return;
      }

      let basePath = folder;
      if (bucket === "user-media") {
        basePath = `${user.id}/${folder}`;
      } else {
        if (!folder.includes(user.id)) {
          basePath = `${user.id}/${folder}`;
        }
      }

      const ext = file.name.split(".").pop() || "bin";
      const path = `${basePath}/${crypto.randomUUID()}.${ext}`;
      
      console.log(`Uploading to ${bucket}/${path}...`);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        
        // Detailed error parsing for RLS/Permissions
        let friendlyMsg = uploadError.message;
        let errType = "storage";
        
        if (uploadError.message.includes("row-level security") || (uploadError as any).status === 403) {
          friendlyMsg = "Permissão negada (RLS). Verifique se você tem permissão para salvar neste diretório.";
          errType = "permission";
        } else if (uploadError.message.includes("already exists") || (uploadError as any).status === 409) {
          friendlyMsg = "Conflito de caminho: arquivo já existe.";
          errType = "conflict";
        } else if (uploadError.message.includes("database schema is invalid") || uploadError.message.includes("schema is out of sync")) {
          friendlyMsg = "Serviço de arquivos temporariamente indisponível. Tente novamente em instantes.";
          errType = "storage-schema";
        }

        setError({ message: friendlyMsg, type: errType });
        throw new Error(friendlyMsg);
      }

      let publicUrl = "";
      if (bucket === "public-media") {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = data.publicUrl;
      } else {
        const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedError) {
          setError({ message: signedError.message, type: "signed-url" });
          throw signedError;
        }
        publicUrl = data?.signedUrl || "";
      }

      onChange(publicUrl);
      toast.success("Arquivo enviado com sucesso!");
      setRetryCount(0);
    } catch (e: any) {
      console.error("Full upload process error:", e);
      
      const message = e?.message || "Falha ao enviar arquivo.";
      const shouldAutoRetry = attempt < 2 && !message.includes("Permissão") && !message.includes("grande") && !message.includes("login");
      
      if (shouldAutoRetry) {
        const nextAttempt = attempt + 1;
        setRetryCount(nextAttempt);
        toast.info(`Falha no envio. Tentando novamente (${nextAttempt}/2)...`);
        setTimeout(() => upload(file, nextAttempt), 1500);
        return;
      }

      setError((current) => current ?? { message, type: "storage" });
      toast.error(message);
    } finally {
      setUploading(false);
    }

  }, [allowed, allowVideo, bucket, folder, maxBytes, onChange]);

  const isVideo = value?.match(/\.(mp4|webm|mov)(\?|$)/i);

  return (
    <div className={cn("space-y-3", className)}>
      {value ? (
        <div className={cn("group relative overflow-hidden rounded-xl border border-border bg-muted shadow-sm", aspect)}>
          {isVideo ? (
            <video src={value} className="size-full object-cover" controls />
          ) : (
            <img src={value} alt="" className="size-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCcw className="size-3.5" />
              Alterar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => onChange("")}
            >
              <X className="size-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const file = e.dataTransfer.files?.[0];
              if (file) upload(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-card/40 p-6 text-center transition-all hover:border-primary/60 hover:bg-card/60",
              aspect,
              drag && "border-primary bg-primary/5 scale-[1.01]",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enviando arquivo...</p>
                  <p className="text-xs text-muted-foreground italic">Por favor, aguarde</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Upload className="size-6" />
                </div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                  Arraste ou clique para selecionar. <br />
                  <span className="font-medium text-primary/80">
                    {allowVideo ? "Imagens ou Vídeos" : "Apenas Imagens"}
                  </span> · Máx {Math.round(maxBytes / 1024 / 1024)}MB
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold leading-none mb-1">Erro no Upload</p>
                  <p className="text-xs opacity-90">{error.message}</p>
                </div>
              </div>
              {lastFile && !uploading && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-fit gap-1.5 border-destructive/20 text-destructive hover:bg-destructive/10"
                  onClick={() => upload(lastFile)}
                >
                  <RefreshCcw className="size-3.5" />
                  Tentar novamente
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        {!value && (
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImageIcon className="mr-1.5 size-3.5" /> Selecionar arquivo
          </Button>
        )}
        {allowUrlInput && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowUrl((s) => !s)}>
            <LinkIcon className="mr-1.5 size-3.5" /> {showUrl ? "Cancelar URL" : "Usar URL externa"}
          </Button>
        )}
      </div>
      {showUrl && allowUrlInput && (
        <Input
          placeholder="https://..."
          defaultValue={value || ""}
          onBlur={(e) => { if (e.target.value !== value) onChange(e.target.value); }}
        />
      )}
    </div>
  );
}
