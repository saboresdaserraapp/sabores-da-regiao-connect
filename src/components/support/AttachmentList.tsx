import { useEffect, useState } from "react";
import { Paperclip, FileText, Download } from "lucide-react";
import { getSignedAttachmentUrl, humanSize, type ChatAttachment } from "@/lib/chatAttachments";

function AttachmentItem({ att }: { att: ChatAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getSignedAttachmentUrl(att.path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [att.path]);

  if (!url) {
    return (
      <div className="flex items-center gap-1 text-xs opacity-60">
        <Paperclip className="size-3" /> {att.name}
      </div>
    );
  }

  if (att.kind === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt={att.name} className="max-h-40 max-w-[240px] rounded-md border object-cover" />
      </a>
    );
  }
  if (att.kind === "video") {
    return <video src={url} controls className="max-h-48 max-w-[260px] rounded-md border" />;
  }
  if (att.kind === "audio") {
    return <audio src={url} controls className="max-w-[260px]" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={att.name}
      className="inline-flex items-center gap-2 text-xs rounded-md border bg-background/80 px-2 py-1 hover:bg-muted"
    >
      <FileText className="size-3.5" />
      <span className="max-w-[180px] truncate">{att.name}</span>
      <span className="opacity-60">· {humanSize(att.size)}</span>
      <Download className="size-3" />
    </a>
  );
}

export function AttachmentList({ attachments }: { attachments: unknown }) {
  const list = normalize(attachments);
  if (!list.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {list.map((a, i) => <AttachmentItem key={`${a.path}-${i}`} att={a} />)}
    </div>
  );
}

function normalize(v: unknown): ChatAttachment[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is ChatAttachment =>
    !!x && typeof x === "object" && typeof (x as ChatAttachment).path === "string"
  );
}