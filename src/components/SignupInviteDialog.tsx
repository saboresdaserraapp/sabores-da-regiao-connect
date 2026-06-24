import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, History, MapPin, Sparkles, BellRing } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillName?: string | null;
  prefillPhone?: string | null;
}

export function SignupInviteDialog({ open, onOpenChange, prefillName, prefillPhone }: Props) {
  const navigate = useNavigate();

  const goSignup = () => {
    const params = new URLSearchParams();
    if (prefillName) params.set("prefill_name", prefillName);
    if (prefillPhone) params.set("prefill_phone", prefillPhone);
    const qs = params.toString();
    onOpenChange(false);
    navigate(`/cadastro${qs ? `?${qs}` : ""}`);
  };

  const benefits = [
    { icon: History, title: "Histórico de pedidos", desc: "Repita seus favoritos em 1 toque." },
    { icon: Heart, title: "Salve seus preferidos", desc: "Favorite lanches e estabelecimentos." },
    { icon: MapPin, title: "Endereços salvos", desc: "Sem digitar tudo de novo a cada compra." },
    { icon: BellRing, title: "Acompanhamento fácil", desc: "Receba avisos do status do pedido." },
    { icon: Sparkles, title: "Promoções exclusivas", desc: "Ofertas pensadas para você." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Que tal facilitar suas próximas compras?</DialogTitle>
          <DialogDescription>
            Seu pedido chegou! Crie uma conta gratuita e tenha uma experiência muito melhor da próxima vez.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={goSignup} className="w-full">Criar minha conta</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">Agora não</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SignupInviteDialog;