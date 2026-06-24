import { TrackingShareActions } from "@/components/orders/TrackingShareActions";

/**
 * Dev-only harness used by the E2E spec to exercise TrackingShareActions
 * without needing a real order. Mounted only when import.meta.env.DEV.
 */
export default function ShareActionsHarness() {
  return (
    <div className="container max-w-md py-10">
      <h1 className="mb-4 font-display text-xl">Share actions harness</h1>
      <TrackingShareActions
        trackingCode="SDS-TST001"
        trackingUrl="http://localhost:8080/pedido/SDS-TST001"
        establishmentName="Loja Teste"
        whatsapp="5511999990001"
        whatsappMessage="Olá! Pedido SDS-TST001"
      />
    </div>
  );
}
