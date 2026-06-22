import { useState } from "react";
import { Plus, Minus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProductWithEstablishment, ProductOption } from "@/data/catalogTypes";

interface Props {
  product: ProductWithEstablishment | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { quantity: number; selectedOptions: string[] }) => void;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProductOptionsSelector({ product, isOpen, onClose, onConfirm }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  if (!product) return null;

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const totalPrice = (product.promotional_price || product.price) * quantity + 
    selectedOptions.reduce((acc, optId) => {
      const opt = product.options?.find(o => o.id === optId);
      return acc + (opt?.price || 0) * quantity;
    }, 0);

  const handleConfirm = () => {
    onConfirm({ quantity, selectedOptions });
    setQuantity(1);
    setSelectedOptions([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 gap-0">
        <div className="relative h-48 w-full">
          <img 
            src={product.image} 
            alt={product.name} 
            className="h-full w-full object-cover"
          />
          <button 
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </DialogHeader>

          {product.options && product.options.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opcionais</h4>
              <div className="space-y-2">
                {product.options.map((opt) => (
                  <label 
                    key={opt.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedOptions.includes(opt.id)}
                        onChange={() => toggleOption(opt.id)}
                      />
                      <span className="text-sm font-medium">{opt.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">+{fmt(opt.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-8 rounded-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-8 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            
            <Button className="flex-1 gap-2" onClick={handleConfirm}>
              Adicionar <span className="opacity-70">•</span> {fmt(totalPrice)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}