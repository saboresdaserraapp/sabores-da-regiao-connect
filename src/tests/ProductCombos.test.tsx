import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductOptionsSelector } from "@/components/ProductOptionsSelector";
import type { ProductWithEstablishment } from "@/data/mockData";
import React from "react";

const mockEstablishment = {
  id: "e1",
  slug: "test-shop",
  name: "Test Shop",
  description: "Test description",
  category: "lanches" as const,
  categoryLabel: "Lanches",
  cover: "",
  logo: "",
  address: "",
  neighborhood: "",
  distanceKm: 0,
  openNow: true,
  hours: "",
  etaMin: 0,
  rating: 5,
  reviewsCount: 0,
  whatsapp: "",
  services: ["entrega" as const],
  payments: ["Pix"],
  badges: [],
  menuType: "essencial" as const,
  menuCategories: [],
  products: [],
  reviews: []
};

const mockProduct: ProductWithEstablishment = {
  id: "p1",
  name: "Combo Burger + Batata",
  description: "Um delicioso combo completo",
  price: 45,
  image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
  category: "c1",
  establishment: mockEstablishment,
  options: [
    { id: "o1", name: "Batata Média", price: 0 },
    { id: "o2", name: "Batata Grande", price: 5 },
    { id: "o3", name: "Coca-Cola", price: 0 },
    { id: "o4", name: "Suco Natural", price: 3 },
  ]
};

describe("ProductOptionsSelector - Combos e Variações", () => {
  it("exibe corretamente os preços individuais dos adicionais", () => {
    render(
      <ProductOptionsSelector 
        product={mockProduct} 
        isOpen={true} 
        onClose={() => {}} 
        onConfirm={() => {}} 
      />
    );

    // Verifica se os preços dos opcionais aparecem
    // Note: use getAllByText because some options have the same price (0,00)
    expect(screen.getAllByText(/\+.*R\$.*0,00/)).toHaveLength(2);
    expect(screen.getByText(/\+.*R\$.*5,00/)).toBeDefined();
    expect(screen.getByText(/\+.*R\$.*3,00/)).toBeDefined();
  });

  it("calcula o preço total corretamente com múltiplos adicionais e quantidade", () => {
    let confirmData: any = null;
    render(
      <ProductOptionsSelector 
        product={mockProduct} 
        isOpen={true} 
        onClose={() => {}} 
        onConfirm={(data) => { confirmData = data; }} 
      />
    );

    // Seleciona Batata Grande (+5) e Suco Natural (+3)
    const options = screen.getAllByRole('checkbox');
    fireEvent.click(options[1]); // Batata Grande
    fireEvent.click(options[3]); // Suco Natural

    // Aumenta a quantidade para 2
    // The minus and plus buttons are SVG elements inside buttons
    const buttons = screen.getAllByRole('button');
    // ProductOptionsSelector structure: close button is 0, minus is 1, plus is 2, confirm is 3
    fireEvent.click(buttons[2]); 

    // Preço base (45) + Opcionais (5 + 3) = 53
    // 53 * 2 = 106
    // Use regex to match the currency formatting which might include non-breaking spaces
    expect(screen.getByText(/R\$.*106,00/)).toBeDefined();

    const confirmButton = screen.getByText(/Adicionar/);
    fireEvent.click(confirmButton);

    expect(confirmData.quantity).toBe(2);
    expect(confirmData.selectedOptions).toContain("o2");
    expect(confirmData.selectedOptions).toContain("o4");
  });
});
