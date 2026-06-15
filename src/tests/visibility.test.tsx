import { describe, it, expect, vi } from "vitest";
import { usePublicEstablishments, usePublicProducts } from "../hooks/usePublicCatalog";
import { renderHook, waitFor } from "@testing-library/react";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("Public Catalog Visibility", () => {
  it("should only fetch establishments that are active, approved, and public", async () => {
    const fromSpy = vi.spyOn(supabase, "from");
    
    renderHook(() => usePublicEstablishments(), { wrapper });

    expect(fromSpy).toHaveBeenCalledWith("establishments");
    
    // Check if the query filters are correct
    // Note: This depends on how vitest-mock-supabase works, but we can check the calls
    const mockQuery = fromSpy.mock.results[0].value;
    expect(mockQuery.eq).toHaveBeenCalledWith("status", "ativo");
    expect(mockQuery.eq).toHaveBeenCalledWith("approval_status", "approved");
    expect(mockQuery.eq).toHaveBeenCalledWith("is_public", true);
  });

  it("should only fetch products from public establishments", async () => {
    const fromSpy = vi.spyOn(supabase, "from");
    
    renderHook(() => usePublicProducts(), { wrapper });

    // The first call should be to establishments to get valid IDs
    expect(fromSpy).toHaveBeenCalledWith("establishments");
  });
});
