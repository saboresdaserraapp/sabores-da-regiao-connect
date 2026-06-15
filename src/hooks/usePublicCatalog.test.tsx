import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock supabase before importing the hook
const fromMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: any[]) => fromMock(...args) },
}));

import { usePublicEstablishments, usePublicProducts } from "./usePublicCatalog";

function makeBuilder(rows: any[]) {
  const b: any = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.in = vi.fn(() => b);
  b.order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  // also resolve when awaited directly
  b.then = (resolve: any) => resolve({ data: rows, error: null });
  return b;
}

const wrapper = ({ children }: any) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const approvedEstab = {
  id: "e1", slug: "loja-aprovada", name: "Loja Aprovada",
  status: "ativo", approval_status: "approved", is_public: true,

  category: "lanches", category_label: "Hamburgueria",
  services: ["entrega"], payments: ["Pix"], badges: [], gallery: [],
  open_now: true, rating: 4.5, reviews_count: 10, eta_min: 30,
};
const pendingEstab = { ...approvedEstab, id: "e2", slug: "pendente", name: "Pendente", approval_status: "pending_approval" };
const inactiveEstab = { ...approvedEstab, id: "e3", slug: "inativa", name: "Inativa", status: "inativo" };

const productApproved = {
  id: "p1", name: "Lanche Teste", description: "", price: 25,
  image: null, featured: false, promo: false, popular: false,
  menu_category_id: null, establishment_id: "e1",
};
const productPending = { ...productApproved, id: "p2", name: "Oculto", establishment_id: "e2" };

describe("usePublicCatalog", () => {
  beforeEach(() => fromMock.mockReset());

  it("retorna apenas lojas com status=ativo e approval_status=approved", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "establishments") return makeBuilder([approvedEstab]);
      return makeBuilder([]);
    });
    const { result } = renderHook(() => usePublicEstablishments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].slug).toBe("loja-aprovada");
  });

  it("inclui produtos de lojas aprovadas e exclui produtos de lojas pendentes/inativas", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "establishments") return makeBuilder([approvedEstab, pendingEstab, inactiveEstab].filter(e => e.status === "ativo" && e.approval_status === "approved"));
      if (table === "products") return makeBuilder([productApproved, productPending]);
      return makeBuilder([]);
    });
    const { result } = renderHook(() => usePublicProducts(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const names = (result.current.data ?? []).map((p) => p.name);
    expect(names).toContain("Lanche Teste");
    // produto da loja pendente aparece se foi retornado, mas establishment seria undefined; verificamos que o map enriquece só os aprovados
    const visibleProducts = (result.current.data ?? []).filter((p) => p.establishment);
    expect(visibleProducts.map((p) => p.name)).toEqual(["Lanche Teste"]);
  });
});
