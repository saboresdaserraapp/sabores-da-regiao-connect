import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, Send, X, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  uploadChatAttachments,
  validateFile,
  humanSize,
  inferKind,
  type AttachmentScope,
  type ChatAttachment,
} from "@/lib/chatAttachments";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  scope: AttachmentScope;
  scopeId: string;
  onSend: (text: string, attachments: ChatAttachment[]) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  extraTopSlot?: React.ReactNode;
}

export function ChatComposer({ scope, scopeId, onSend, disabled, placeholder = "Mensagem...", extraTopSlot }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
    const good: File[] = [];
    for (const f of files) {
      const err = validateFile(f);
      if (err) { toast.error(err); continue; }
      good.push(f);
    }
    if (good.length) setPending((p) => [...p, ...good]);
  };

  const handleSend = async () => {
    const t = text.trim();
    if (!t && pending.length === 0) return;
    if (sending || disabled) return;
    setSending(true);
    try {
      let atts: ChatAttachment[] = [];
      if (pending.length && user?.id) {
        atts = await uploadChatAttachments(pending, { scope, scopeId, userId: user.id });
      }
      await onSend(t, atts);
      setText("");
      setPending([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao enviar";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0) {
      e.preventDefault();
      addFiles(Array.from(items));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) addFiles(files);
  };

  return (
    <div className="space-y-2">
      {extraTopSlot}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map((f, i) => {
            const kind = inferKind(f.type || "");
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs bg-muted rounded-md px-2 py-1 border">
                {kind === "image" ? <ImageIcon className="size-3" /> : <FileText className="size-3" />}
                <span className="max-w-[140px] truncate">{f.name}</span>
                <span className="opacity-60">· {humanSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                  className="opacity-60 hover:opacity-100"
                  aria-label="Remover anexo"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-end gap-2" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            addFiles(fs);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || sending}
          title="Anexar arquivo ou mídia"
        >
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          rows={2}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || sending}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={disabled || sending || (!text.trim() && pending.length === 0)}
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}