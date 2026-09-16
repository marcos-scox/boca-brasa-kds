import { describe, expect, it } from "vitest";
import { calculateOrderTotal } from "./db";

describe("calculateOrderTotal", () => {
  it("calculates cents using each item's quantity", () => {
    expect(calculateOrderTotal([
      { id: "x-burger", name: "X-Burger", priceCents: 1500, quantity: 2 },
      { id: "batata", name: "Batata frita", priceCents: 1000, quantity: 1 },
    ])).toBe(4000);
  });

  it("returns zero for an empty cart", () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});
