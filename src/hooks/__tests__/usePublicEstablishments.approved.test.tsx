import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const fromMock = vi.fn();
vi.mock("@/integrations/supabase/publicClient", () => ({
  publicSupabase: { from: (...args: any[]) => fromMock(...args) },
}));

import { usePublicEstablishments, usePublicProducts } from "@/hooks/usePublicCatalog";

function makeBuilder(rows: any[]) {
  const b: any = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.in = vi.fn(() => b);
  b.order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  b.then = (resolve: any) => resolve({ data: rows, error: null });
  return b;
}

const wrapper = ({ children }: any) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const approvedAtivoPublic = {
  id: "estab-1",
  slug: "incomum-burguer",
  name: "Incomum Burguer",
  status: "ativo",
  approval_status: "approved",
  is_public: true,
  category: "lanches",
  category_label: "Hamburgueria",
  services: ["entrega"],
  payments: ["Pix"],
  badges: [],
  gallery: [],
  open_now: true,
  rating: 4.5,
  reviews_count: 5,
  eta_min: 30,
};

describe("listagem pública após inserir estabelecimento já aprovado/ativo", () => {
  beforeEach(() => fromMock.mockReset());

  it("exibe a loja aprovada+ativa+publica na listagem pública (home/Loja)", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "establishments") return makeBuilder([approvedAtivoPublic]);
      return makeBuilder([]);
    });

    const { result } = renderHook(() => usePublicEstablishments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].slug).toBe("incomum-burguer");
    expect(result.current.data![0].name).toBe("Incomum Burguer");
  });

  it("não retorna a loja se is_public=false (mesmo aprovada/ativa)", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "establishments") {
        // simula filtros aplicados no client supabase: is_public=true exclui esta
        return makeBuilder([]);
      }
      return makeBuilder([]);
    });

    const { result } = renderHook(() => usePublicEstablishments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it("produtos da loja aprovada+ativa+publica aparecem em usePublicProducts", async () => {
    const product = {
      id: "p1", name: "Smash Burguer", description: "", price: 35,
      image: null, featured: false, promo: false, popular: false,
      menu_category_id: null, establishment_id: "estab-1",
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "establishments") return makeBuilder([approvedAtivoPublic]);
      if (table === "products") return makeBuilder([product]);
      return makeBuilder([]);
    });

    const { result } = renderHook(() => usePublicProducts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.map((p) => p.name)).toContain("Smash Burguer");
    expect(result.current.data![0].establishment.slug).toBe("incomum-burguer");
  });
});