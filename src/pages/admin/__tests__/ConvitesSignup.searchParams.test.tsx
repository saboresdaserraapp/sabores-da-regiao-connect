import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/lib/adminAudit", () => ({ logAdminConviteEvent: vi.fn() }));
vi.mock("@/hooks/useExportJob", () => ({
  useExportJob: () => ({ data: null }),
  startExportJob: vi.fn(),
  cancelExportJob: vi.fn(),
}));

import AdminConvitesSignup from "@/pages/admin/ConvitesSignup";

function setup(initialUrl: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <AdminConvitesSignup />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminConvitesSignup — restores query params from URL", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
    fromMock.mockReturnValue({
      insert: () => Promise.resolve({ data: null, error: null }),
    });
  });

  it("hydrates date inputs, campaign select, search box and sort indicator from URL", async () => {
    setup(
      "/admin/convites-cadastro?start=2026-06-01&end=2026-06-10&campaign=post_delivery_invite&q=SDS&sort=tracking_code&dir=asc",
    );

    const startInput = await screen.findByLabelText("Desde");
    const endInput = screen.getByLabelText("Até");
    expect(startInput).toHaveValue("2026-06-01");
    expect(endInput).toHaveValue("2026-06-10");

    // Campaign label rendered inside the Select trigger.
    expect(screen.getByText("Pós-entrega")).toBeInTheDocument();

    // Quick search box hydrated.
    expect(screen.getByLabelText("Busca rápida")).toHaveValue("SDS");

    // Sorted column carries aria-sort.
    await waitFor(() => {
      const sorted = document.querySelector('[aria-sort="ascending"]');
      expect(sorted).not.toBeNull();
      expect(sorted?.textContent).toMatch(/Pedido/i);
    });

    // RPC was invoked with the URL-derived filters.
    expect(rpcMock).toHaveBeenCalled();
    const [name, args] = rpcMock.mock.calls[0];
    expect(name).toBe("search_signup_invites");
    expect(args).toMatchObject({
      _campaign: "post_delivery_invite",
      _q: "SDS",
      _sort: "tracking_code",
      _dir: "asc",
    });
  });
});
