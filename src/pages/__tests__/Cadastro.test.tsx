import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mocks must run before importing the component under test ---
const signUpMock = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
    },
  },
}));

vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn() } },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

vi.mock("@/lib/uiAnalytics", () => ({ trackUiEvent: vi.fn() }));

import Cadastro from "@/pages/Cadastro";

function renderPage() {
  return render(
    <MemoryRouter>
      <Cadastro />
    </MemoryRouter>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText("Nome"), { target: { value: "Maria Teste" } });
  fireEvent.change(screen.getByPlaceholderText("E-mail"), { target: { value: "maria@test.com" } });
  fireEvent.change(screen.getByPlaceholderText("Senha (6+ caracteres)"), { target: { value: "abcdef" } });
}

describe("Cadastro — double-click guard on network failure", () => {
  beforeEach(() => {
    signUpMock.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("only calls signUp once even when clicked many times during a slow network failure", async () => {
    let rejectIt: ((e: Error) => void) | null = null;
    signUpMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectIt = (e) => reject(e);
        }),
    );

    renderPage();
    fillValidForm();
    const btn = screen.getByRole("button", { name: /criar conta/i });

    // Rapid-fire clicks — only the first one should be allowed through.
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);

    await waitFor(() => expect(btn).toHaveAttribute("aria-busy", "true"));
    expect(btn).toBeDisabled();
    expect(signUpMock).toHaveBeenCalledTimes(1);

    // Simulate the network failure resolving the in-flight call.
    await act(async () => {
      rejectIt?.(new Error("Failed to fetch"));
    });

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/Sem conexão/i);
    // Button should be re-enabled so the user can retry.
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "false");
    // Still only one call made — duplicates were blocked.
    expect(signUpMock).toHaveBeenCalledTimes(1);
  });
});
