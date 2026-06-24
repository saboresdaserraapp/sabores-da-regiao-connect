import { useState } from "react";
import { Copy, Link2, Share2, MessageCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export interface TrackingShareActionsProps {
  trackingCode: string;
  trackingUrl: string;
  establishmentName?: string;
  whatsapp?: string | null;
  whatsappMessage?: string | null;
  /** Hide the resend button when no message is available (eg. on /pedido/:code with no stored message). */
  showResend?: boolean;
  /** Show the customer "cancel order" CTA. */
  showCancel?: boolean;
  /** Notified after the cancellation RPC succeeds. */
  onCanceled?: () => void;
}

export function TrackingShareActions({
  trackingCode,
  trackingUrl,
  establishmentName,
  whatsapp,
  whatsappMessage,
  showResend = true,
  showCancel = false,
  onCanceled,
}: TrackingShareActionsProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const copyText = async (value: string, kind: "code" | "link") => {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(value);
      if (kind === "code") {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        toast.success("Link copiado!");
      }
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Pedido ${trackingCode}`,
      text: establishmentName
        ? `Acompanhe meu pedido na ${establishmentName} (código ${trackingCode}):`
        : `Acompanhe meu pedido (código ${trackingCode}):`,
      url: trackingUrl,
    };
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator) : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share(shareData);
        return;
      } catch {
        /* user cancelled — fall through */
      }
    }
    void copyText(trackingUrl, "link");
  };

  const handleResendWhatsapp = async () => {
    if (!whatsapp || !whatsappMessage) {
      toast.error("Mensagem indisponível para reenvio.");
      return;
    }
    // Idempotent: only increments a counter, never duplicates timeline events.
    try {
      await supabase.rpc("register_whatsapp_resend" as never, { _code: trackingCode } as never);
    } catch {
      /* non-blocking */
    }
    window.open(whatsappLink(whatsapp, whatsappMessage), "_blank");
    toast.success("Mensagem reaberta no WhatsApp");
  };

  const canResend = showResend && !!whatsapp && !!whatsappMessage;

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const { data, error } = await supabase.rpc(
        "customer_cancel_order" as never,
        { _code: trackingCode, _reason: cancelReason || null } as never,
      );
      if (error) throw error;
      const payload = data as { ok?: boolean } | null;
      if (!payload?.ok) throw new Error("Falha ao cancelar.");
      toast.success("Pedido cancelado.");
      setCancelOpen(false);
      setCancelReason("");
      onCanceled?.();
    } catch (err) {
      toast.error((err as Error)?.message || "Não foi possível cancelar.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-lg font-bold tracking-wider text-foreground">{trackingCode}</div>
        <button
          type="button"
          onClick={() => copyText(trackingCode, "code")}
          aria-label="Copiar código de rastreamento"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          <Copy className="size-3.5" />
          {codeCopied ? "Copiado" : "Copiar código"}
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => copyText(trackingUrl, "link")}
          title={trackingUrl}
          aria-label={`Copiar link de acompanhamento ${trackingUrl}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          <Link2 className="size-3.5" />
          {linkCopied ? "Link copiado" : "Copiar link"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Compartilhar link de acompanhamento"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-background px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          <Share2 className="size-3.5" />
          Compartilhar
        </button>
      </div>

      {canResend && (
        <Button
          type="button"
          onClick={handleResendWhatsapp}
          aria-label="Reenviar pedido pelo WhatsApp"
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <MessageCircle className="mr-1.5 size-4" />
          Reenviar pelo WhatsApp
        </Button>
      )}

      {showCancel && (
        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="mr-1.5 size-4" />
              Cancelar pedido
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar este pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                O estabelecimento será avisado pela linha do tempo. Você só consegue
                cancelar enquanto o pedido ainda não saiu para entrega.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              rows={3}
              placeholder="Motivo (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={canceling}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); void handleCancel(); }}
                disabled={canceling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {canceling ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                Confirmar cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
