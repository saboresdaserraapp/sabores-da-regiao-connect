import { OrderChat } from "@/components/OrderChat";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface OrderChatFloatingProps {
  orderId: string;
  establishmentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  disabledMessage?: string;
  senderType?: "customer" | "business";
}

export function OrderChatFloating({
  orderId,
  establishmentId,
  open,
  onOpenChange,
  disabled,
  disabledMessage,
  senderType = "customer",
}: OrderChatFloatingProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-base">Conversa com a loja</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 p-3 overflow-hidden">
          <OrderChat
            orderId={orderId}
            senderType={senderType}
            establishmentId={establishmentId}
            title="Mensagens do pedido"
            disabled={disabled}
            disabledMessage={disabledMessage}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}