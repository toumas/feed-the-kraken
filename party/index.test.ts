import { describe, expect, it } from "vitest";
import { getRolesForPlayerCount } from "../app/utils/role-utils";

describe("getRolesForPlayerCount", () => {
  it("should return correct roles for 5 players", () => {
    // 5 players is random, so we run it multiple times to check both possibilities
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const roles = getRolesForPlayerCount(5);
      expect(roles).toHaveLength(5);
      expect(roles).toContain("CULT_LEADER");
      const sailors = roles.filter((r) => r === "SAILOR").length;
      const pirates = roles.filter((r) => r === "PIRATE").length;
      results.add(`${sailors}-${pirates}`);
    }
    // Should have seen both "3-1" and "2-2"
    expect(results.has("3-1")).toBe(true);
    expect(results.has("2-2")).toBe(true);
  });

  it("should return correct roles for 6 players", () => {
    const roles = getRolesForPlayerCount(6);
    expect(roles).toHaveLength(6);
    expect(roles.filter((r) => r === "SAILOR")).toHaveLength(3);
    expect(roles.filter((r) => r === "PIRATE")).toHaveLength(2);
    expect(roles.filter((r) => r === "CULT_LEADER")).toHaveLength(1);
  });

  it("should return correct roles for 7 players", () => {
    const roles = getRolesForPlayerCount(7);
    expect(roles).toHaveLength(7);
    expect(roles.filter((r) => r === "SAILOR")).toHaveLength(4);
    expect(roles.filter((r) => r === "PIRATE")).toHaveLength(2);
    expect(roles.filter((r) => r === "CULT_LEADER")).toHaveLength(1);
  });

  it("should return correct roles for 8 players", () => {
    const roles = getRolesForPlayerCount(8);
    expect(roles).toHaveLength(8);
    expect(roles.filter((r) => r === "SAILOR")).toHaveLength(4);
    expect(roles.filter((r) => r === "PIRATE")).toHaveLength(3);
    expect(roles.filter((r) => r === "CULT_LEADER")).toHaveLength(1);
  });

  it("should return correct roles for 9 players", () => {
    const roles = getRolesForPlayerCount(9);
    expect(roles).toHaveLength(9);
    expect(roles.filter((r) => r === "SAILOR")).toHaveLength(5);
    expect(roles.filter((r) => r === "PIRATE")).toHaveLength(3);
    expect(roles.filter((r) => r === "CULT_LEADER")).toHaveLength(1);
  });

  it("should return correct roles for 10 players", () => {
    const roles = getRolesForPlayerCount(10);
    expect(roles).toHaveLength(10);
    expect(roles.filter((r) => r === "SAILOR")).toHaveLength(5);
    expect(roles.filter((r) => r === "PIRATE")).toHaveLength(4);
    expect(roles.filter((r) => r === "CULT_LEADER")).toHaveLength(1);
  });

  it("should return correct roles for 11 players", () => {
    const roles = getRolesForPlayerCount(11);
    expect(roles).toHaveLength(11);
    expect(roles.filter((r) => r === "SAILOR")).toHaveLength(5);
    expect(roles.filter((r) => r === "PIRATE")).toHaveLength(4);
    expect(roles.filter((r) => r === "CULT_LEADER")).toHaveLength(1);
    expect(roles.filter((r) => r === "CULTIST")).toHaveLength(1);
  });
});
