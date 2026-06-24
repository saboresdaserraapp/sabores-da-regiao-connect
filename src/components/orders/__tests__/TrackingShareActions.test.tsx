import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrackingShareActions } from "../TrackingShareActions";

const rpcMock = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseProps = {
  trackingCode: "SDS-ABC123",
  trackingUrl: "https://example.com/pedido/SDS-ABC123",
  establishmentName: "Forno da Vila",
  whatsapp: "5511999990001",
  whatsappMessage: "Olá, segue meu pedido SDS-ABC123",
};

describe("TrackingShareActions", () => {
  let writeText: ReturnType<typeof vi.fn>;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    // ensure no share by default
    delete (navigator as unknown as { share?: unknown }).share;
    openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    rpcMock.mockClear();
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it("copies the tracking link to the clipboard", async () => {
    render(<TrackingShareActions {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /copiar link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(baseProps.trackingUrl));
    expect(await screen.findByText(/link copiado/i)).toBeInTheDocument();
  });

  it("uses navigator.share when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });
    render(<TrackingShareActions {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0]).toMatchObject({
      url: baseProps.trackingUrl,
      title: expect.stringContaining(baseProps.trackingCode),
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to clipboard when navigator.share is missing", async () => {
    render(<TrackingShareActions {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /compartilhar/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(baseProps.trackingUrl));
  });

  it("reenviar pelo WhatsApp opens wa.me and registers idempotent resend", async () => {
    render(<TrackingShareActions {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /reenviar pedido pelo whatsapp/i }));
    await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1));
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("wa.me/5511999990001");
    expect(url).toContain(encodeURIComponent("SDS-ABC123"));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    expect(rpcMock).toHaveBeenCalledWith("register_whatsapp_resend", { _code: "SDS-ABC123" });
  });

  it("hides resend button when showResend=false or message is missing", () => {
    render(<TrackingShareActions {...baseProps} whatsappMessage={null} />);
    expect(screen.queryByRole("button", { name: /reenviar/i })).toBeNull();
  });
});
