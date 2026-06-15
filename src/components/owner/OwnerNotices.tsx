import { AlertCircle, Info } from "lucide-react";

export function ApprovalBanner({ status, reason, fields }: { status: string; reason?: string | null; fields?: string[] }) {
  if (status === "approved") return null;
  const cfg: Record<string, { title: string; tone: "warning" | "destructive" | "muted"; body?: string }> = {
    pending_approval: { title: "Sua loja está em análise", tone: "warning",
      body: "O administrador da plataforma irá revisar os dados antes da publicação. Sua loja só será exibida publicamente após aprovação." },
    correction_requested: { title: "Correções solicitadas", tone: "warning",
      body: "Revise os campos indicados e reenvie para análise." },
    rejected: { title: "Cadastro recusado", tone: "destructive", body: reason || undefined },
    suspended: { title: "Loja suspensa", tone: "destructive", body: reason || "Entre em contato com o suporte." },
    inactive: { title: "Loja inativa", tone: "muted" },
  };
  const c = cfg[status] ?? { title: "Status: " + status, tone: "muted" as const };
  const tone = c.tone === "destructive" ? "border-destructive/30 bg-destructive/5"
    : c.tone === "warning" ? "border-warning/30 bg-warning/10" : "border-border bg-muted/30";
  return (
    <div className={`rounded-2xl border ${tone} p-4`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="flex-1">
          <div className="font-semibold">{c.title}</div>
          {c.body && <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>}
          {fields && fields.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-sm">
              {fields.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function PersistentNotices() {
  return (
    <div className="grid gap-2 text-xs text-muted-foreground">
      <Note>As ferramentas disponíveis dependem do plano ativo desta loja.</Note>
      <Note>Pedidos enviados pelo WhatsApp representam intenção de compra e precisam ser confirmados pelo estabelecimento.</Note>
      <Note>Taxa de entrega e valor final devem ser confirmados pelo estabelecimento.</Note>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <span>{children}</span>
    </div>
  );
}
