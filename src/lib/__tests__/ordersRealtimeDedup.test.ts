import { describe, it, expect } from "vitest";
import { mergeOrders, shouldEmitOnce } from "../ordersRealtimeDedup";

const o = (id: string, created_at: string, extra: Record<string, unknown> = {}) =>
  ({ id, created_at, ...extra }) as { id: string; created_at: string } & Record<string, unknown>;

describe("mergeOrders", () => {
  it("não duplica pedidos com o mesmo id quando realtime + polling concorrem", () => {
    const a = o("a", "2026-01-01T10:00:00Z");
    const b = o("b", "2026-01-01T11:00:00Z");
    const merged = mergeOrders([a, b], [a, b, a]);
    expect(merged).toHaveLength(2);
    expect(merged.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("incoming substitui versão antiga preservando id único", () => {
    const oldA = o("a", "2026-01-01T10:00:00Z", { status: "new" });
    const newA = o("a", "2026-01-01T10:00:00Z", { status: "confirmed" });
    const merged = mergeOrders([oldA], [newA]);
    expect(merged).toHaveLength(1);
    expect((merged[0] as any).status).toBe("confirmed");
  });

  it("ordena por created_at desc", () => {
    const a = o("a", "2026-01-01T10:00:00Z");
    const b = o("b", "2026-01-02T10:00:00Z");
    const c = o("c", "2026-01-03T10:00:00Z");
    expect(mergeOrders([a, c], [b]).map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
});

describe("shouldEmitOnce", () => {
  it("retorna true só na primeira vez para cada eventId", () => {
    const seen = new Set<string>();
    expect(shouldEmitOnce(seen, "evt-1")).toBe(true);
    expect(shouldEmitOnce(seen, "evt-1")).toBe(false);
    expect(shouldEmitOnce(seen, "evt-2")).toBe(true);
  });

  it("ignora ids vazios ou nulos", () => {
    const seen = new Set<string>();
    expect(shouldEmitOnce(seen, null)).toBe(false);
    expect(shouldEmitOnce(seen, "")).toBe(false);
    expect(seen.size).toBe(0);
  });
});