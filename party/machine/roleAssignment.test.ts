import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { isValidComposition } from "../../app/utils/role-utils";
import { gameMachine } from "./gameMachine";

function createTestActor() {
  const actor = createActor(gameMachine);
  actor.start();
  return actor;
}

describe("Automatic Role Assignment Validity", () => {
  const setupGame = (n: number) => {
    const actor = createTestActor();
    actor.send({
      type: "CREATE_LOBBY",
      playerId: "host",
      playerName: "Host",
      playerPhoto: null,
      code: "TEST",
    });
    for (let i = 1; i < n; i++) {
      actor.send({
        type: "JOIN_LOBBY",
        playerId: `p${i}`,
        playerName: `P${i}`,
        playerPhoto: null,
      });
    }
    return actor;
  };

  const playerCounts = [5, 6, 7, 8, 9, 10, 11];

  playerCounts.forEach((count) => {
    it(`should create a valid composition for ${count} players`, () => {
      // For 5 players, we expect distribution to vary between runs.
      // We'll track which variants we've seen to ensure randomness works.
      const variantsSeen = new Set<string>();

      // Run multiple times to verify validity and catch randomness
      for (let i = 0; i < 50; i++) {
        const actor = setupGame(count);
        actor.send({ type: "START_GAME", playerId: "host" });

        const context = actor.getSnapshot().context;
        // Assignments should exist
        if (!context.assignments) {
          throw new Error(`Assignments undefined for ${count} players`);
        }

        const roles = Object.values(context.assignments);

        expect(roles).toHaveLength(count);

        const isValid = isValidComposition(roles, count);
        if (!isValid) {
          console.error(`Invalid composition for ${count} players:`, roles);
        }
        expect(isValid).toBe(true);

        if (count === 5) {
          const sailorCount = roles.filter((r) => r === "SAILOR").length;
          const pirateCount = roles.filter((r) => r === "PIRATE").length;
          variantsSeen.add(`${sailorCount}S-${pirateCount}P`);
        }
      }

      if (count === 5) {
        // Verify we saw both variants (this is probabilistic but with 50 runs extremely likely)
        expect(variantsSeen.has("3S-1P")).toBe(true);
        expect(variantsSeen.has("2S-2P")).toBe(true);
      }
    });
  });
});
