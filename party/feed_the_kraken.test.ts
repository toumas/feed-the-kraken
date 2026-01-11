/**
 * Feed the Kraken Tests - Migrated to XState
 * Tests for the Feed the Kraken game action
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
  actor.send({
    type: "JOIN_LOBBY",
    playerId: "sailor",
    playerName: "Sailor",
    playerPhoto: null,
  });
  actor.send({
    type: "JOIN_LOBBY",
    playerId: "cult_leader",
    playerName: "Cult Leader",
    playerPhoto: null,
  });
  actor.send({
    type: "JOIN_LOBBY",
    playerId: "player_4",
    playerName: "Player 4",
    playerPhoto: null,
  });
  actor.send({
    type: "JOIN_LOBBY",
    playerId: "player_5",
    playerName: "Player 5",
    playerPhoto: null,
  });

  // Start game
  actor.send({ type: "START_GAME", playerId: "captain" });

  return actor;
}

describe("Feed the Kraken - XState", () => {
  let actor: ReturnType<typeof createActor<typeof gameMachine>>;

  beforeEach(() => {
    actor = setupPlayingGame();
  });

  it("should allow Captain to request feeding a player", () => {
    // Request feeding sailor
    actor.send({
      type: "FEED_THE_KRAKEN_REQUEST",
      targetPlayerId: "sailor",
      playerId: "captain",
    });

    // Should transition to feedTheKraken state
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: "feedTheKraken" });

    // Assert status is PENDING
    expect(snapshot.context.feedTheKrakenStatus).toMatchObject({
      state: "PENDING",
      initiatorId: "captain",
      targetPlayerId: "sailor",
    });
  });

  it("should transition back to idle and complete status after feeding confirmed", () => {
    // Find a target who is NOT the cult leader
    const context = actor.getSnapshot().context;
    const targetPlayerId = Object.entries(context.assignments || {}).find(
      ([id, role]) => id !== "captain" && role !== "CULT_LEADER",
    )?.[0];

    if (!targetPlayerId) {
      throw new Error("Could not find a valid target (non-Cult Leader)");
    }

    actor.send({
      type: "FEED_THE_KRAKEN_REQUEST",
      targetPlayerId: targetPlayerId,
      playerId: "captain",
    });
    actor.send({
      type: "FEED_THE_KRAKEN_RESPONSE",
      captainId: "captain",
      confirmed: true,
    });

    // Should be back to idle
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: "idle" });

    // Assert status is COMPLETED and result is correct (target eliminated)
    expect(snapshot.context.feedTheKrakenStatus).toMatchObject({
      state: "COMPLETED",
      result: {
        targetPlayerId: targetPlayerId,
        cultVictory: false,
      },
    });

    // Assert target is eliminated
    const targetPlayer = snapshot.context.players.find(
      (p) => p.id === targetPlayerId,
    );
    expect(targetPlayer?.isEliminated).toBe(true);
  });

  it("should transition back to idle and set cult victory after feeding cult leader", () => {
    // Find the cult leader in the assignments
    const context = actor.getSnapshot().context;
    const cultLeaderPlayerId = Object.entries(context.assignments || {}).find(
      ([_, role]) => role === "CULT_LEADER",
    )?.[0];

    if (cultLeaderPlayerId) {
      actor.send({
        type: "FEED_THE_KRAKEN_REQUEST",
        targetPlayerId: cultLeaderPlayerId,
        playerId: "captain",
      });
      actor.send({
        type: "FEED_THE_KRAKEN_RESPONSE",
        captainId: "captain",
        confirmed: true,
      });

      // Should be back to idle
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toEqual({ playing: "idle" });

      // Assert status is COMPLETED and Cult Victory
      expect(snapshot.context.feedTheKrakenStatus).toMatchObject({
        state: "COMPLETED",
        result: {
          targetPlayerId: cultLeaderPlayerId,
          cultVictory: true,
        },
      });
    }
  });

  it("should set status to CANCELLED and NOT eliminate player when they deny", () => {
    actor.send({
      type: "FEED_THE_KRAKEN_REQUEST",
      targetPlayerId: "sailor",
      playerId: "captain",
    });
    actor.send({
      type: "FEED_THE_KRAKEN_RESPONSE",
      captainId: "captain",
      confirmed: false,
    });

    // Should be back to idle
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toEqual({ playing: "idle" });

    // Status should be CANCELLED
    expect(snapshot.context.feedTheKrakenStatus).toMatchObject({
      state: "CANCELLED",
      initiatorId: "captain",
      targetPlayerId: "sailor",
    });

    // Player should NOT be eliminated
    const context = snapshot.context;
    const sailor = context.players.find((p) => p.id === "sailor");
    expect(sailor?.isEliminated).toBe(false);
  });

  it("should not process request for non-existent player", () => {
    // This should not throw
    expect(() => {
      actor.send({
        type: "FEED_THE_KRAKEN_REQUEST",
        targetPlayerId: "nonexistent",
        playerId: "captain",
      });
    }).not.toThrow();

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBeDefined();
  });
});
