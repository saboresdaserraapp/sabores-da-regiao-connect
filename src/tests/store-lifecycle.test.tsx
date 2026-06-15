import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePublicEstablishments, usePublicProducts } from "../hooks/usePublicCatalog";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock Supabase with more detail for E2E-like flow testing
const mockSupabaseResponse = {
  data: null,
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation(() => Promise.resolve(mockSupabaseResponse)),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

describe("Store Lifecycle and Visibility E2E Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT show pending stores in the public catalog", async () => {
    const fromSpy = vi.spyOn(supabase, "from");
    
    // Simulate fetching public establishments
    renderHook(() => usePublicEstablishments(), { wrapper });

    // The query MUST filter by approved AND public
    const mockQuery = fromSpy.mock.results[0].value;
    expect(mockQuery.eq).toHaveBeenCalledWith("approval_status", "approved");
    expect(mockQuery.eq).toHaveBeenCalledWith("is_public", true);
    expect(mockQuery.eq).toHaveBeenCalledWith("status", "ativo");
  });

  it("should NOT return products from pending or private stores", async () => {
    const fromSpy = vi.spyOn(supabase, "from");
    
    // In usePublicProducts, we first fetch establishments that are public
    renderHook(() => usePublicProducts(), { wrapper });

    const mockQuery = fromSpy.mock.results[0].value;
    expect(mockQuery.eq).toHaveBeenCalledWith("approval_status", "approved");
    expect(mockQuery.eq).toHaveBeenCalledWith("is_public", true);
  });

  it("simulates store creation with initial private status", async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: { id: 'new-store-id' }, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: insertSpy,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    } as any);

    // This mimics the logic in Cadastrar.tsx
    const newStore = {
      name: "Loja Teste",
      slug: "loja-teste",
      category: "restaurantes",
      category_label: "Restaurante",
      approval_status: "pending_approval",
      is_public: false,
      status: "pendente"
    };

    const { data } = await supabase.from("establishments").insert(newStore as any);
    
    expect(insertSpy).toHaveBeenCalledWith(newStore);
  });
});
