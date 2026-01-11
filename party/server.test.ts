/**
 * Server Tests - Migrated to XState
 * Tests for denial of command functionality
 */

import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./machine/gameMachine";

// Helper to setup a game with playing state
function setupPlayingGame() {
  const actor = createActor(gameMachine);
  actor.start();

  // Create lobby
  actor.send({
    type: "CREATE_LOBBY",
    playerId: "player_1",
    playerName: "Player 1",
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
  actor.send({ type: "START_GAME", playerId: "player_1" });

  return actor;
}

describe("Server - Denial of Command", () => {
  it("should handle DENIAL_OF_COMMAND event without crashing", () => {
    const actor = setupPlayingGame();

    // Execute action - should not throw
    expect(() => {
      actor.send({ type: "DENIAL_OF_COMMAND", playerId: "player_1" });
    }).not.toThrow();

    // Game should remain in valid state
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBeDefined();
  });

  it("should not crash if DENIAL_OF_COMMAND targets non-existent player", () => {
    const actor = setupPlayingGame();

    // Execute action with unknown player - should not throw
    expect(() => {
      actor.send({ type: "DENIAL_OF_COMMAND", playerId: "unknown" });
    }).not.toThrow();

    // Game should still be in playing state
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: "idle" });
  });
});
