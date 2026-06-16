import { Link } from "react-router-dom";
import { cart, useCart } from "@/store/cart";
import { brl } from "@/lib/format";

export function CartFloatingButton() {
  const state = useCart();
  if (!state.items.length || !state.establishmentSlug) return null;
  const count = state.items.reduce((acc, i) => acc + i.quantity, 0);
  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
      <Link
        to={`/e/${state.establishmentSlug}/checkout`}
        className="flex items-center justify-between rounded-full bg-primary p-2 pl-6 pr-2 text-primary-foreground shadow-glow transition-transform active:scale-95"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-white/20 font-bold">
            {count}
          </div>
          <div>
            <div className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Ver carrinho</div>
            <div className="font-display text-lg font-bold">{brl(cart.subtotal())}</div>
          </div>
        </div>
        <div className="flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-primary">
          Finalizar Pedido
        </div>
      </Link>
    </div>
  );
}