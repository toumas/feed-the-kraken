import { describe, expect, it } from "vitest";
import type { Role } from "../types";
import { getRolesForPlayerCount, isValidComposition } from "./role-utils";

describe("role-utils", () => {
  describe("getRolesForPlayerCount", () => {
    it.each([
      [5, 5],
      [6, 6],
      [7, 7],
      [8, 8],
      [9, 9],
      [10, 10],
      [11, 11],
    ])("returns %i roles for %i players", (count, expected) => {
      const roles = getRolesForPlayerCount(count);
      expect(roles).toHaveLength(expected);
      expect(roles).toContain("CULT_LEADER");
    });
  });

  describe("isValidComposition", () => {
    describe("5 players", () => {
      it("validates 3 Sailors, 1 Pirate, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "PIRATE",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 5)).toBe(true);
      });

      it("validates 2 Sailors, 2 Pirates, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "SAILOR",
          "PIRATE",
          "PIRATE",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 5)).toBe(true);
      });

      it("invalidates 1 Sailor, 3 Pirates, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "PIRATE",
          "PIRATE",
          "PIRATE",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 5)).toBe(false);
      });
    });

    describe("6 players", () => {
      it("validates 3 Sailors, 2 Pirates, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "PIRATE",
          "PIRATE",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 6)).toBe(true);
      });
    });

    describe("7 players", () => {
      it("validates 4 Sailors, 2 Pirates, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "PIRATE",
          "PIRATE",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 7)).toBe(true);
      });
    });

    describe("8 players", () => {
      it("validates 4 Sailors, 3 Pirates, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "PIRATE",
          "PIRATE",
          "PIRATE",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 8)).toBe(true);
      });
    });

    describe("9 players", () => {
      it("validates 5 Sailors, 3 Pirates, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "PIRATE",
          "PIRATE",
          "PIRATE",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 9)).toBe(true);
      });
    });

    describe("10 players", () => {
      it("validates 5 Sailors, 4 Pirates, 1 Cult Leader", () => {
        const roles: Role[] = [
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
        ];
        expect(isValidComposition(roles, 10)).toBe(true);
      });
    });

    describe("11 players", () => {
      it("validates 5 Sailors, 4 Pirates, 1 Cultist, 1 Cult Leader", () => {
        const roles: Role[] = [
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "SAILOR",
          "PIRATE",
          "PIRATE",
          "PIRATE",
          "PIRATE",
          "CULTIST",
          "CULT_LEADER",
        ];
        expect(isValidComposition(roles, 11)).toBe(true);
      });

      it("invalidates missing Cultist", () => {
        const roles: Role[] = [
          "SAILOR",
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
        ];
        expect(isValidComposition(roles, 11)).toBe(false);
      });
    });

    it("invalidates if multiple Cult Leaders", () => {
      const roles: Role[] = [
        "CULT_LEADER",
        "CULT_LEADER",
        "SAILOR",
        "SAILOR",
        "SAILOR",
      ];
      expect(isValidComposition(roles, 5)).toBe(false);
    });

    it("invalidates if no Cult Leader", () => {
      const roles: Role[] = ["SAILOR", "SAILOR", "SAILOR", "SAILOR", "PIRATE"];
      expect(isValidComposition(roles, 5)).toBe(false);
    });
  });
});
