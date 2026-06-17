import { supabase } from "@/integrations/supabase/client";

export type AttachmentScope = "order" | "support" | "ticket";

export type AttachmentKind = "image" | "video" | "audio" | "file";

export interface ChatAttachment {
  path: string;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
}

const MEDIA_MAX = 10 * 1024 * 1024; // 10MB
const FILE_MAX = 20 * 1024 * 1024; // 20MB
const BLOCKED_EXT = ["exe", "bat", "cmd", "msi", "sh", "app", "scr", "com", "vbs"];

export function inferKind(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (BLOCKED_EXT.includes(ext)) return `Tipo de arquivo não permitido: .${ext}`;
  const kind = inferKind(file.type || "");
  const isMedia = kind === "image" || kind === "video" || kind === "audio";
  const limit = isMedia ? MEDIA_MAX : FILE_MAX;
  if (file.size > limit) {
    const mb = (limit / (1024 * 1024)).toFixed(0);
    return `${file.name} ultrapassa ${mb}MB.`;
  }
  return null;
}

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export async function uploadChatAttachments(
  files: File[],
  opts: { scope: AttachmentScope; scopeId: string; userId: string },
): Promise<ChatAttachment[]> {
  const out: ChatAttachment[] = [];
  for (const f of files) {
    const err = validateFile(f);
    if (err) throw new Error(err);
    const safe = sanitizeName(f.name);
    const path = `${opts.scope}/${opts.scopeId}/${opts.userId}/${crypto.randomUUID()}-${safe}`;
    const up = await supabase.storage.from("chat-attachments").upload(path, f, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) throw up.error;
    out.push({
      path,
      name: f.name,
      mime: f.type || "application/octet-stream",
      size: f.size,
      kind: inferKind(f.type || ""),
    });
  }
  return out;
}

const urlCache = new Map<string, { url: string; exp: number }>();

export async function getSignedAttachmentUrl(path: string): Promise<string | null> {
  const cached = urlCache.get(path);
  if (cached && cached.exp > Date.now()) return cached.url;
  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}