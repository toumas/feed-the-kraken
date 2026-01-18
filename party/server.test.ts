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

    // Player should be eliminated
    const player = snapshot.context.players.find((p) => p.id === "player_1");
    expect(player?.isEliminated).toBe(true);

    // Player should still be in the list
    expect(
      snapshot.context.players.find((p) => p.id === "player_1"),
    ).toBeDefined();
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

  it("should keep eliminated player in the game after DENIAL_OF_COMMAND", () => {
    const actor = setupPlayingGame();
    const snapshotBefore = actor.getSnapshot();
    const playerCountBefore = snapshotBefore.context.players.length;

    actor.send({ type: "DENIAL_OF_COMMAND", playerId: "player_2" });

    const snapshot = actor.getSnapshot();
    // Player count should remain the same
    expect(snapshot.context.players.length).toBe(playerCountBefore);
    // Player 2 should be eliminated
    const player2 = snapshot.context.players.find((p) => p.id === "player_2");
    expect(player2?.isEliminated).toBe(true);
    // Other players should not be eliminated
    const player1 = snapshot.context.players.find((p) => p.id === "player_1");
    expect(player1?.isEliminated).toBe(false);
  });

  it("should allow multiple players to be eliminated via DENIAL_OF_COMMAND", () => {
    const actor = setupPlayingGame();

    actor.send({ type: "DENIAL_OF_COMMAND", playerId: "player_1" });
    actor.send({ type: "DENIAL_OF_COMMAND", playerId: "player_3" });

    const snapshot = actor.getSnapshot();
    const p1 = snapshot.context.players.find((p) => p.id === "player_1");
    const p3 = snapshot.context.players.find((p) => p.id === "player_3");
    const p2 = snapshot.context.players.find((p) => p.id === "player_2");

    expect(p1?.isEliminated).toBe(true);
    expect(p3?.isEliminated).toBe(true);
    expect(p2?.isEliminated).toBe(false);
  });
});
