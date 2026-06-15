import { describe, it, expect } from "vitest";

// Local implementation of slugify to test the logic (matches DB logic)
function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace special chars with -
    .replace(/^-+|-+$/g, "") // Trim - from ends
    .replace(/-+/g, "-"); // Remove duplicate -
}

// Simulates the DB logic of public.make_unique_establishment_slug
function makeUniqueSlug(name: string, existingSlugs: string[]): string {
  const base = slugify(name) || "loja";
  let candidate = base;
  let n = 1;
  while (existingSlugs.includes(candidate)) {
    n++;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

describe("Slug Generation Logic", () => {
  describe("slugify helper", () => {
    it("should remove accents correctly", () => {
      expect(slugify("Sabores da Serra")).toBe("sabores-da-serra");
      expect(slugify("Café & Açaí")).toBe("cafe-acai");
      expect(slugify("Pão de Queijo")).toBe("pao-de-queijo");
      expect(slugify("Conceição do Araguaia")).toBe("conceicao-do-araguaia");
    });

    it("should handle special characters and symbols", () => {
      expect(slugify("Loja do @Admin!")).toBe("loja-do-admin");
      expect(slugify("Espaço Gourmet +")).toBe("espaco-gourmet");
      expect(slugify("Cervejaria 100% Artesanal")).toBe("cervejaria-100-artesanal");
      expect(slugify("Pizza #1 - Promoção!")).toBe("pizza-1-promocao");
    });

    it("should handle multiple spaces and hyphens gracefully", () => {
      expect(slugify("Loja   Espaçada")).toBe("loja-espacada");
      expect(slugify("Loja---Hifenizada")).toBe("loja-hifenizada");
      expect(slugify("   Trimmed   Name   ")).toBe("trimmed-name");
    });

    it("should handle empty or invalid input", () => {
      expect(slugify("")).toBe("");
      expect(slugify("!!!")).toBe("");
      expect(slugify("   ")).toBe("");
    });
  });

  describe("uniqueness logic (makeUniqueSlug)", () => {
    it("should return the base slug if no collision exists", () => {
      expect(makeUniqueSlug("Minha Loja", [])).toBe("minha-loja");
    });

    it("should append -2 when a collision occurs", () => {
      expect(makeUniqueSlug("Minha Loja", ["minha-loja"])).toBe("minha-loja-2");
    });

    it("should handle long sequences of collisions", () => {
      const existing = ["test", "test-2", "test-3", "test-4", "test-5"];
      expect(makeUniqueSlug("test", existing)).toBe("test-6");
    });

    it("should work even if the base name results in a generic 'loja' slug", () => {
      expect(makeUniqueSlug("!!!", ["loja"])).toBe("loja-2");
    });

    it("should skip existing numbered suffixes to find the next available", () => {
      const existing = ["pasta", "pasta-2", "pasta-4"];
      // Note: Current DB logic (n++) will find "pasta-3"
      expect(makeUniqueSlug("pasta", existing)).toBe("pasta-3");
    });
  });
});
