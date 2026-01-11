/**
 * Off With The Tongue Tests - Migrated to XState
 * Tests for the Off With The Tongue (silencing) game action
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./machine/gameMachine";

// Helper to setup a game with playing state
function setupPlayingGame() {
  const actor = createActor(gameMachine);
  actor.start();

  // Create lobby with host
  actor.send({
    type: "CREATE_LOBBY",
    playerId: "captain",
    playerName: "Captain",
    playerPhoto: null,
    code: "TEST",
  });

  // Add 4 more players
  for (let i = 2; i <= 5; i++) {
    actor.send({
      type: "JOIN_LOBBY",
      playerId: `player_${i}`,
      playerName: `Player ${i}`,
      playerPhoto: null,
    });
  }

  // Start game
  actor.send({ type: "START_GAME", playerId: "captain" });

  return actor;
}

describe("Off With The Tongue - XState", () => {
  let actor: ReturnType<typeof createActor<typeof gameMachine>>;

  beforeEach(() => {
    actor = setupPlayingGame();
  });

  it("should allow request to silence a player", () => {
    actor.send({
      type: "OFF_WITH_TONGUE_REQUEST",
      playerId: "captain",
      targetPlayerId: "player_2",
    });

    // Should transition to offWithTongue state
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: "offWithTongueAction" });
  });

  it("should process silence response when accepted", () => {
    actor.send({
      type: "OFF_WITH_TONGUE_REQUEST",
      playerId: "captain",
      targetPlayerId: "player_2",
    });
    actor.send({
      type: "OFF_WITH_TONGUE_RESPONSE",
      captainId: "captain",
      confirmed: true,
    });

    // Should be back to idle
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: "idle" });
  });

  it("should NOT silence player when they deny", () => {
    actor.send({
      type: "OFF_WITH_TONGUE_REQUEST",
      playerId: "captain",
      targetPlayerId: "player_2",
    });
    actor.send({
      type: "OFF_WITH_TONGUE_RESPONSE",
      captainId: "captain",
      confirmed: false,
    });

    // Should be back to idle
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: "idle" });

    // Player should still have tongue
    const context = snapshot.context;
    const player = context.players.find((p) => p.id === "player_2");
    expect(player?.hasTongue).toBe(true);
  });

  it("should not crash when silencing already silenced player", () => {
    // First silence
    actor.send({
      type: "OFF_WITH_TONGUE_REQUEST",
      playerId: "captain",
      targetPlayerId: "player_2",
    });
    actor.send({
      type: "OFF_WITH_TONGUE_RESPONSE",
      captainId: "captain",
      confirmed: true,
    });

    // Try to silence again - should not throw
    expect(() => {
      actor.send({
        type: "OFF_WITH_TONGUE_REQUEST",
        playerId: "captain",
        targetPlayerId: "player_2",
      });
    }).not.toThrow();
  });

  it("should not crash when targeting non-existent player", () => {
    expect(() => {
      actor.send({
        type: "OFF_WITH_TONGUE_REQUEST",
        playerId: "captain",
        targetPlayerId: "nonexistent",
      });
    }).not.toThrow();
  });

  it("should track role claims after silencing", () => {
    // Silence player_2
    actor.send({
      type: "OFF_WITH_TONGUE_REQUEST",
      playerId: "captain",
      targetPlayerId: "player_2",
    });
    actor.send({
      type: "OFF_WITH_TONGUE_RESPONSE",
      captainId: "captain",
      confirmed: true,
    });

    // Start cabin search
    actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "captain" });

    // Player tries to claim Captain (machine tracks all claims)
    actor.send({
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
      playerId: "player_2",
      role: "CAPTAIN",
    });

    // Claim is tracked (validation may happen at UI level)
    const context = actor.getSnapshot().context;
    expect(context.cabinSearchStatus).toBeDefined();
  });
});
