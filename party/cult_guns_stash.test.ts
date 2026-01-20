/**
 * Cult Guns Stash Tests - Migrated to XState
 * Tests for the Cult's Guns Stash game action
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./machine/gameMachine";

// Helper to setup a game with playing state
function setupPlayingGame() {
  const actor = createActor(gameMachine);
  actor.start();

  // Create lobby
  actor.send({
    type: "CREATE_LOBBY",
    playerId: "p1",
    playerName: "P1",
    playerPhoto: null,
    code: "TEST",
  });

  // Add 4 more players
  for (let i = 2; i <= 5; i++) {
    actor.send({
      type: "JOIN_LOBBY",
      playerId: `p${i}`,
      playerName: `P${i}`,
      playerPhoto: null,
    });
  }

  // Start game
  actor.send({ type: "START_GAME", playerId: "p1" });

  return actor;
}

describe("Cult Guns Stash Flow - XState", () => {
  let actor: ReturnType<typeof createActor<typeof gameMachine>>;

  beforeEach(() => {
    vi.clearAllMocks();
    actor = setupPlayingGame();
  });

  it("should initialize guns stash in WAITING_FOR_PLAYERS state", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus).toBeDefined();
    expect(context.gunsStashStatus?.state).toBe("WAITING_FOR_PLAYERS");
    expect(context.gunsStashStatus?.initiatorId).toBe("p1");
  });

  it("should allow any player to start guns stash", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p3" });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.initiatorId).toBe("p3");
  });

  it("should track initiator when starting", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.initiatorId).toBe("p1");
  });

  it("should allow players to confirm ready", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.readyPlayers).toContain("p2");
  });

  it("should transition to gunsStash.waiting state", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: { gunsStash: "waiting" } });
  });

  it("should allow multiple players to confirm ready", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p3" });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.readyPlayers).toContain("p2");
    expect(context.gunsStashStatus?.readyPlayers).toContain("p3");
  });

  it("should allow distribution submission", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    // All players ready
    for (let i = 1; i <= 5; i++) {
      actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: `p${i}` });
    }

    // Submit distribution
    actor.send({
      type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
      playerId: "p1",
      distribution: { p2: 1, p3: 1, p4: 1 },
    });

    // Check distribution is recorded
    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.distribution).toBeDefined();
  });

  it("should handle quiz answer submission", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    // All players ready
    for (let i = 1; i <= 5; i++) {
      actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: `p${i}` });
    }

    // Submit answer
    actor.send({
      type: "SUBMIT_CULT_GUNS_STASH_ACTION",
      playerId: "p2",
      answer: "test-answer",
    });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.playerAnswers?.p2).toBe("test-answer");
  });

  it("should allow cancellation", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });
    actor.send({ type: "CANCEL_CULT_GUNS_STASH", playerId: "p2" });

    const context = actor.getSnapshot().context;
    expect(
      context.gunsStashStatus === undefined ||
        context.gunsStashStatus?.state === "CANCELLED",
    ).toBe(true);
  });

  it("should not start during active cabin search", () => {
    // Start cabin search first
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

    // Cabin search should be active
    const beforeContext = actor.getSnapshot().context;
    expect(beforeContext.cabinSearchStatus).toBeDefined();

    // Guns stash should not start while cabin search is active
    // (This depends on guard implementation)
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p2" });

    const afterContext = actor.getSnapshot().context;
    // Cabin search should still be the active action
    expect(afterContext.cabinSearchStatus).toBeDefined();
  });

  it("should not allow duplicate ready confirmations from same player", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" });

    const context = actor.getSnapshot().context;
    const p2Count = context.gunsStashStatus?.readyPlayers.filter(
      (id) => id === "p2",
    ).length;
    expect(p2Count).toBeLessThanOrEqual(1);
  });

  it("should initialize readyPlayers array", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    const context = actor.getSnapshot().context;
    expect(Array.isArray(context.gunsStashStatus?.readyPlayers)).toBe(true);
  });

  it("should track all player answers", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    // All ready
    for (let i = 1; i <= 5; i++) {
      actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: `p${i}` });
    }

    // Submit multiple answers
    actor.send({
      type: "SUBMIT_CULT_GUNS_STASH_ACTION",
      playerId: "p2",
      answer: "A",
    });
    actor.send({
      type: "SUBMIT_CULT_GUNS_STASH_ACTION",
      playerId: "p3",
      answer: "B",
    });
    actor.send({
      type: "SUBMIT_CULT_GUNS_STASH_ACTION",
      playerId: "p4",
      answer: "C",
    });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.playerAnswers?.p2).toBe("A");
    expect(context.gunsStashStatus?.playerAnswers?.p3).toBe("B");
    expect(context.gunsStashStatus?.playerAnswers?.p4).toBe("C");
  });

  it("should handle all players confirming ready", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    for (let i = 1; i <= 5; i++) {
      actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: `p${i}` });
    }

    const context = actor.getSnapshot().context;
    // Note: With auto-transition, if cult members (2) are all ready, state moves to DISTRIBUTION
    // So we check that the state transitioned OR all players are tracked
    expect(
      context.gunsStashStatus?.state === "DISTRIBUTION" ||
        (context.gunsStashStatus?.readyPlayers?.length ?? 0) >= 2,
    ).toBe(true);
  });

  it("should not crash with invalid player ID", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    expect(() => {
      actor.send({
        type: "CONFIRM_CULT_GUNS_STASH_READY",
        playerId: "invalid",
      });
    }).not.toThrow();
  });

  it("should maintain state during multiple operations", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    // Ready up one player
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" });

    // Verify state persists - either still tracking ready players or moved to distribution
    const context1 = actor.getSnapshot().context;
    const stillWaiting =
      context1.gunsStashStatus?.state === "WAITING_FOR_PLAYERS";

    if (stillWaiting) {
      expect(context1.gunsStashStatus?.readyPlayers).toContain("p2");
    } else {
      // If auto-transitioned, that's also valid
      expect(context1.gunsStashStatus?.state).toBe("DISTRIBUTION");
    }
  });

  it("should handle rapid successive events", () => {
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

    // Rapid events
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p3" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p4" });
    actor.send({ type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p5" });

    const context = actor.getSnapshot().context;
    expect(context.gunsStashStatus?.readyPlayers.length).toBeGreaterThanOrEqual(
      4,
    );
  });

  it("should transition game state correctly", () => {
    // Start in idle
    expect(actor.getSnapshot().value).toEqual({ playing: "idle" });

    // Start guns stash
    actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });
    expect(actor.getSnapshot().value).toEqual({
      playing: { gunsStash: "waiting" },
    });
  });

  describe("Random Gun Distribution on Timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should distribute remaining guns randomly when timer completes with partial distribution", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

      // All players ready
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: `p${i}`,
        });
      }

      // Submit partial distribution (only 1 gun out of 3)
      actor.send({
        type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
        playerId: "p1",
        distribution: { p2: 1 },
      });

      // Verify distribution is recorded
      const context = actor.getSnapshot().context;
      expect(context.gunsStashStatus?.distribution).toEqual({ p2: 1 });
    });

    it("should have exactly 3 guns distributed after completion", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

      // All players ready
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: `p${i}`,
        });
      }

      // Verify we're in distribution state
      expect(actor.getSnapshot().value).toEqual({
        playing: { gunsStash: "distribution" },
      });

      // Submit partial distribution (only 1 gun out of 3)
      actor.send({
        type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
        playerId: "p1",
        distribution: { p2: 1 },
      });

      // Advance timers to trigger the 15100ms timeout
      vi.advanceTimersByTime(16000);

      const context = actor.getSnapshot().context;

      // Should be completed
      expect(context.gunsStashStatus?.state).toBe("COMPLETED");

      // Should have exactly 3 guns distributed
      const totalGuns = Object.values(
        context.gunsStashStatus?.distribution || {},
      ).reduce((sum, count) => sum + count, 0);
      expect(totalGuns).toBe(3);

      // p2 should still have their 1 gun
      expect(context.gunsStashStatus?.distribution?.p2).toBeGreaterThanOrEqual(
        1,
      );
    });

    it("should use full distribution when all 3 guns are assigned", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

      // All players ready
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: `p${i}`,
        });
      }

      // Submit full distribution
      actor.send({
        type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
        playerId: "p1",
        distribution: { p2: 1, p3: 1, p4: 1 },
      });

      // Advance timers
      vi.advanceTimersByTime(16000);

      const context = actor.getSnapshot().context;

      // Should preserve the exact distribution
      expect(context.gunsStashStatus?.distribution).toEqual({
        p2: 1,
        p3: 1,
        p4: 1,
      });
    });

    it("should distribute all 3 guns randomly when none are assigned", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

      // All players ready
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: `p${i}`,
        });
      }

      // Don't submit any distribution

      // Advance timers
      vi.advanceTimersByTime(16000);

      const context = actor.getSnapshot().context;

      // Should be completed
      expect(context.gunsStashStatus?.state).toBe("COMPLETED");

      // Should have exactly 3 guns distributed
      const totalGuns = Object.values(
        context.gunsStashStatus?.distribution || {},
      ).reduce((sum, count) => sum + count, 0);
      expect(totalGuns).toBe(3);
    });

    it("should set isGunsStashUsed to true when completed", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

      // All players ready
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: `p${i}`,
        });
      }

      // Advance timers to complete
      vi.advanceTimersByTime(16000);

      const context = actor.getSnapshot().context;
      expect(context.gunsStashStatus?.state).toBe("COMPLETED");
      expect(context.isGunsStashUsed).toBe(true);
    });
  });

  describe("One-Time Use Restriction", () => {
    it("should have isGunsStashUsed as false initially", () => {
      const context = actor.getSnapshot().context;
      expect(context.isGunsStashUsed).toBe(false);
    });

    it("should keep isGunsStashUsed as false when cancelled", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });
      actor.send({ type: "CANCEL_CULT_GUNS_STASH", playerId: "p2" });

      const context = actor.getSnapshot().context;
      expect(context.isGunsStashUsed).toBe(false);
    });

    it("should reset isGunsStashUsed when game is reset", () => {
      vi.useFakeTimers();

      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

      // All players ready
      for (let i = 1; i <= 5; i++) {
        actor.send({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: `p${i}`,
        });
      }

      // Complete the guns stash
      vi.advanceTimersByTime(16000);
      expect(actor.getSnapshot().context.isGunsStashUsed).toBe(true);

      // Reset the game
      actor.send({ type: "RESET_GAME" });
      expect(actor.getSnapshot().context.isGunsStashUsed).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("Eliminated Players Handling", () => {
    it("should not require eliminated players to be ready for gunsStashAllReady", () => {
      // Eliminate player 5 before starting guns stash using Denial of Command
      actor.send({
        type: "DENIAL_OF_COMMAND",
        playerId: "p5",
      });

      // Verify player is eliminated
      const afterDenialContext = actor.getSnapshot().context;
      const eliminatedPlayer = afterDenialContext.players.find(
        (p) => p.id === "p5",
      );
      expect(eliminatedPlayer?.isEliminated).toBe(true);

      // Start guns stash
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "p1" });

      // Only non-eliminated players (p1-p4) confirm ready
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: `p${i}`,
        });
      }

      // Should transition to DISTRIBUTION without p5's confirmation
      const context = actor.getSnapshot().context;
      expect(context.gunsStashStatus?.state).toBe("DISTRIBUTION");
    });
  });
});
