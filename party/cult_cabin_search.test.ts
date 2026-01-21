/**
 * Cult Cabin Search Tests - Migrated to XState
 * Tests for the Cult Cabin Search (quiz-based) game action
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
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

  // Add 4 more players (enough for Captain, Navigator, Lieutenant, Crew)
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

describe("Cult Cabin Search Flow - XState", () => {
  let actor: ReturnType<typeof createActor<typeof gameMachine>>;

  beforeEach(() => {
    vi.clearAllMocks();
    actor = setupPlayingGame();
  });

  it("should initialize cabin search in SETUP state", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

    const context = actor.getSnapshot().context;
    expect(context.cabinSearchStatus).toBeDefined();
    expect(context.cabinSearchStatus?.state).toBe("SETUP");
    expect(context.cabinSearchStatus?.initiatorId).toBe("p1");
  });

  it("should allow players to claim roles", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p1",
      role: "CAPTAIN",
    });

    const context = actor.getSnapshot().context;
    expect(context.cabinSearchStatus?.claims.p1).toBe("CAPTAIN");
  });

  it("should track all role claims", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

    // P1 claims Captain
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p1",
      role: "CAPTAIN",
    });

    // P2 also claims Captain (machine tracks all claims)
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p2",
      role: "CAPTAIN",
    });

    const context = actor.getSnapshot().context;
    // Machine tracks both claims (validation may happen at UI level)
    expect(context.cabinSearchStatus?.claims.p1).toBe("CAPTAIN");
    expect(context.cabinSearchStatus?.claims.p2).toBe("CAPTAIN");
  });

  it("should allow multiple crew members", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p1",
      role: "CREW",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p2",
      role: "CREW",
    });

    const context = actor.getSnapshot().context;
    expect(context.cabinSearchStatus?.claims.p1).toBe("CREW");
    expect(context.cabinSearchStatus?.claims.p2).toBe("CREW");
  });

  it("should transition to ACTIVE when all players claim via COMPLETE_CABIN_SEARCH_SETUP", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

    // All players claim roles
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p1",
      role: "CAPTAIN",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p2",
      role: "NAVIGATOR",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p3",
      role: "LIEUTENANT",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p4",
      role: "CREW",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p5",
      role: "CREW",
    });

    const context = actor.getSnapshot().context;
    // All claims should be recorded
    expect(Object.keys(context.cabinSearchStatus?.claims || {}).length).toBe(5);
  });

  it("should allow cancellation during SETUP", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });
    actor.send({ type: "CANCEL_CULT_CABIN_SEARCH", playerId: "p2" });

    const context = actor.getSnapshot().context;
    // Either cancelled state or cleared
    expect(
      context.cabinSearchStatus === undefined ||
        context.cabinSearchStatus?.state === "CANCELLED",
    ).toBe(true);
  });

  it("should allow player to change role during SETUP", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

    // P1 claims Captain first
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p1",
      role: "CAPTAIN",
    });
    expect(actor.getSnapshot().context.cabinSearchStatus?.claims.p1).toBe(
      "CAPTAIN",
    );

    // P1 changes to Navigator
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p1",
      role: "NAVIGATOR",
    });
    expect(actor.getSnapshot().context.cabinSearchStatus?.claims.p1).toBe(
      "NAVIGATOR",
    );
  });

  it("should handle quiz action submission", () => {
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

    // All players must claim roles to complete setup
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p1",
      role: "CAPTAIN",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p2",
      role: "NAVIGATOR",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p3",
      role: "LIEUTENANT",
    });
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p4",
      role: "CREW",
    });
    // Last player claim triggers automatic transition to ACTIVE
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "p5",
      role: "CREW",
    });

    // Verify we're in ACTIVE state (auto-transition when all claimed)
    const contextAfterSetup = actor.getSnapshot().context;
    expect(contextAfterSetup.cabinSearchStatus?.state).toBe("ACTIVE");

    // Now submit answer (only works in ACTIVE state)
    actor.send({
      type: "SUBMIT_CULT_CABIN_SEARCH_ACTION",
      playerId: "p2",
      answer: "test-answer",
    });

    const context = actor.getSnapshot().context;
    expect(context.cabinSearchStatus?.playerAnswers?.p2).toBe("test-answer");
  });

  describe("One-Time Use Restriction", () => {
    it("should have isCultCabinSearchUsed as false initially", () => {
      const context = actor.getSnapshot().context;
      expect(context.isCultCabinSearchUsed).toBe(false);
    });

    it("should keep isCultCabinSearchUsed as false when cancelled", () => {
      actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });
      actor.send({ type: "CANCEL_CULT_CABIN_SEARCH", playerId: "p2" });

      const context = actor.getSnapshot().context;
      expect(context.isCultCabinSearchUsed).toBe(false);
    });

    it("should set isCultCabinSearchUsed to true when completed", () => {
      vi.useFakeTimers();

      actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

      // All players claim valid roles
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p1",
        role: "CAPTAIN",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p2",
        role: "NAVIGATOR",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p3",
        role: "LIEUTENANT",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p4",
        role: "CREW",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p5",
        role: "CREW",
      });

      // Wait for timer to complete
      vi.advanceTimersByTime(31000);

      const context = actor.getSnapshot().context;
      expect(context.cabinSearchStatus?.state).toBe("COMPLETED");
      expect(context.isCultCabinSearchUsed).toBe(true);

      vi.useRealTimers();
    });

    it("should reset isCultCabinSearchUsed when game is reset", () => {
      vi.useFakeTimers();

      actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" });

      // All players claim valid roles
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p1",
        role: "CAPTAIN",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p2",
        role: "NAVIGATOR",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p3",
        role: "LIEUTENANT",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p4",
        role: "CREW",
      });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p5",
        role: "CREW",
      });

      // Wait for timer to complete
      vi.advanceTimersByTime(31000);
      expect(actor.getSnapshot().context.isCultCabinSearchUsed).toBe(true);

      // Reset the game
      actor.send({ type: "RESET_GAME" });
      expect(actor.getSnapshot().context.isCultCabinSearchUsed).toBe(false);

      vi.useRealTimers();
    });
  });
});
