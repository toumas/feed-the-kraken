import { describe, expect, it } from "vitest";
import { isValidComposition } from "../app/utils/role-utils";
import type { Role } from "@/app/types";

describe("isValidComposition", () => {
  it("should validate 5-player variants", () => {
    const variant1: Role[] = [
      "SAILOR",
      "SAILOR",
      "SAILOR",
      "PIRATE",
      "CULT_LEADER",
    ];
    const variant2: Role[] = [
      "SAILOR",
      "SAILOR",
      "PIRATE",
      "PIRATE",
      "CULT_LEADER",
    ];
    const invalid: Role[] = [
      "SAILOR",
      "SAILOR",
      "SAILOR",
      "SAILOR",
      "CULT_LEADER",
    ];

    expect(isValidComposition(variant1, 5)).toBe(true);
    expect(isValidComposition(variant2, 5)).toBe(true);
    expect(isValidComposition(invalid, 5)).toBe(false);
  });

  it("should validate 6-player composition", () => {
    const valid: Role[] = [
      "SAILOR",
      "SAILOR",
      "SAILOR",
      "PIRATE",
      "PIRATE",
      "CULT_LEADER",
    ];
    expect(isValidComposition(valid, 6)).toBe(true);
  });

  it("should validate 11-player composition", () => {
    const valid: Role[] = [
      "SAILOR",
      "SAILOR",
      "SAILOR",
      "SAILOR",
      "SAILOR",
      "PIRATE",
      "PIRATE",
      "PIRATE",
      "PIRATE",
      "CULT_LEADER",
      "CULTIST",
    ];
    expect(isValidComposition(valid, 11)).toBe(true);
  });

  it("should require exactly 1 Cult Leader", () => {
    const none: Role[] = ["SAILOR", "SAILOR", "SAILOR", "SAILOR", "SAILOR"];
    const two: Role[] = [
      "CULT_LEADER",
      "CULT_LEADER",
      "SAILOR",
      "SAILOR",
      "PIRATE",
    ];
    expect(isValidComposition(none, 5)).toBe(false);
    expect(isValidComposition(two, 5)).toBe(false);
  });
});
