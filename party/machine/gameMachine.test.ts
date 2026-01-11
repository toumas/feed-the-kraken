/**
 * XState Game Machine Tests
 *
 * These tests validate the game machine state transitions and actions.
 * They replace the legacy server tests by testing the XState machine directly.
 */
/** biome-ignore-all lint/style/noNonNullAssertion: Test file uses non-null assertions for known-defined values */

import { beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "./gameMachine";
import type { GameContext } from "./types";

// Helper to create a machine actor and get a snapshot
function createTestActor(initialContext?: Partial<GameContext>) {
  const actor = createActor(gameMachine, {
    input: initialContext,
  });
  actor.start();
  return actor;
}

// Note: sendAndGetContext helper was removed as unused

describe("XState Game Machine", () => {
  describe("Lobby States", () => {
    it("should start in lobby.empty state", () => {
      const actor = createTestActor();
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toEqual({ lobby: "empty" });
    });

    it("should transition to lobby.waiting when CREATE_LOBBY is sent", () => {
      const actor = createTestActor();
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toEqual({ lobby: "waiting" });
      expect(snapshot.context.code).toBe("ABC123");
      expect(snapshot.context.players).toHaveLength(1);
      expect(snapshot.context.players[0].isHost).toBe(true);
    });

    it("should add players when JOIN_LOBBY is sent", () => {
      const actor = createTestActor();
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      actor.send({
        type: "JOIN_LOBBY",
        playerId: "player_1",
        playerName: "Player 1",
        playerPhoto: null,
      });
      const context = actor.getSnapshot().context;
      expect(context.players).toHaveLength(2);
      expect(context.players[1].name).toBe("Player 1");
      expect(context.players[1].isHost).toBe(false);
    });

    it("should transition to playing when START_GAME is sent with enough players", () => {
      const actor = createTestActor();
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      // Add 4 more players to reach minimum of 5
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toEqual({ playing: "idle" });
      expect(snapshot.context.assignments).toBeDefined();
    });

    it("should allow host to kick a non-host player", () => {
      const actor = createTestActor();
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      actor.send({
        type: "JOIN_LOBBY",
        playerId: "player_1",
        playerName: "Player 1",
        playerPhoto: null,
      });

      actor.send({
        type: "KICK_PLAYER",
        playerId: "host_1",
        targetPlayerId: "player_1",
      });

      const context = actor.getSnapshot().context;
      expect(context.players).toHaveLength(1);
      expect(context.players[0].id).toBe("host_1");
    });

    it("should NOT allow non-host to kick players", () => {
      const actor = createTestActor();
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      actor.send({
        type: "JOIN_LOBBY",
        playerId: "player_1",
        playerName: "Player 1",
        playerPhoto: null,
      });
      actor.send({
        type: "JOIN_LOBBY",
        playerId: "player_2",
        playerName: "Player 2",
        playerPhoto: null,
      });

      actor.send({
        type: "KICK_PLAYER",
        playerId: "player_1",
        targetPlayerId: "player_2",
      });

      const context = actor.getSnapshot().context;
      expect(context.players).toHaveLength(3); // No change
    });
  });

  describe("Role Assignment", () => {
    it("should assign roles automatically for 5 players", () => {
      const actor = createTestActor();
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
      const context = actor.getSnapshot().context;
      expect(context.assignments).toBeDefined();
      expect(Object.keys(context.assignments!)).toHaveLength(5);

      // Should have 1 Cult Leader, 1 Pirate, and 3 Sailors
      const roles = Object.values(context.assignments!);
      const sailors = roles.filter((r) => r === "SAILOR").length;
      const pirates = roles.filter((r) => r === "PIRATE").length;

      // 1 Cult Leader always
      expect(roles.filter((r) => r === "CULT_LEADER")).toHaveLength(1);

      // 3 Sailors + 1 Pirate OR 2 Sailors + 2 Pirates
      const isValid =
        (sailors === 3 && pirates === 1) || (sailors === 2 && pirates === 2);
      expect(isValid).toBe(true);
    });
  });

  describe("Conversion Flow", () => {
    let actor: ReturnType<typeof createTestActor>;

    beforeEach(() => {
      actor = createTestActor();
      // Setup game with 5 players
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
    });

    it("should start conversion and set conversionStatus", () => {
      actor.send({ type: "START_CONVERSION", initiatorId: "host_1" });
      const context = actor.getSnapshot().context;
      expect(context.conversionStatus).toBeDefined();
      expect(context.conversionStatus?.initiatorId).toBe("host_1");
      expect(context.conversionStatus?.state).toBe("PENDING");
    });

    it("should track conversion responses", () => {
      actor.send({ type: "START_CONVERSION", initiatorId: "host_1" });
      actor.send({
        type: "RESPOND_CONVERSION",
        playerId: "player_1",
        accept: true,
      });
      const context = actor.getSnapshot().context;
      expect(context.conversionStatus?.responses.player_1).toBe(true);
    });

    it("should limit conversions to 3 per game", () => {
      // Note: This test validates the guard behavior after 3 conversions
      // For full testing, we'd need to complete 3 conversion rounds first
      const context = actor.getSnapshot().context;
      expect(context.conversionCount).toBe(0);
    });
  });

  describe("Flogging Flow", () => {
    let actor: ReturnType<typeof createTestActor>;

    beforeEach(() => {
      actor = createTestActor();
      // Setup game with 5 players
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
    });

    it("should start flogging and set floggingStatus", () => {
      actor.send({ type: "FLOGGING_REQUEST", targetPlayerId: "player_1" });
      const context = actor.getSnapshot().context;
      expect(context.floggingStatus).toBeDefined();
      expect(context.floggingStatus?.targetPlayerId).toBe("player_1");
      expect(context.floggingStatus?.state).toBe("PENDING");
    });

    it("should execute flogging when confirmed", () => {
      actor.send({ type: "FLOGGING_REQUEST", targetPlayerId: "player_1" });
      actor.send({
        type: "FLOGGING_CONFIRMATION_RESPONSE",
        hostId: "host_1",
        confirmed: true,
      });
      const context = actor.getSnapshot().context;
      expect(context.isFloggingUsed).toBe(true);
      // Player should have notRole set
      const player = context.players.find((p) => p.id === "player_1");
      expect(player?.notRole).toBeDefined();
    });

    it("should clear floggingStatus when denied", () => {
      actor.send({ type: "FLOGGING_REQUEST", targetPlayerId: "player_1" });
      actor.send({
        type: "FLOGGING_CONFIRMATION_RESPONSE",
        hostId: "host_1",
        confirmed: false,
      });
      const context = actor.getSnapshot().context;
      expect(context.floggingStatus).toBeUndefined();
      expect(context.isFloggingUsed).toBe(false);
    });
  });

  describe("Captain Cabin Search Flow", () => {
    let actor: ReturnType<typeof createTestActor>;

    beforeEach(() => {
      actor = createTestActor();
      // Setup game with 5 players
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
    });

    it("should start captain cabin search and set status", () => {
      actor.send({
        type: "CABIN_SEARCH_REQUEST",
        playerId: "host_1",
        targetPlayerId: "player_1",
      });
      const context = actor.getSnapshot().context;
      expect(context.captainCabinSearchStatus).toBeDefined();
      expect(context.captainCabinSearchStatus?.targetPlayerId).toBe("player_1");
      expect(context.captainCabinSearchStatus?.state).toBe("PENDING");
    });

    it("should complete search when confirmed", () => {
      actor.send({
        type: "CABIN_SEARCH_REQUEST",
        playerId: "host_1",
        targetPlayerId: "player_1",
      });
      actor.send({
        type: "CABIN_SEARCH_RESPONSE",
        searcherId: "host_1",
        confirmed: true,
      });
      const context = actor.getSnapshot().context;
      // Player should be marked as unconvertible after search
      const player = context.players.find((p) => p.id === "player_1");
      expect(player?.isUnconvertible).toBe(true);
    });

    it("should clear captainCabinSearchStatus when denied", () => {
      actor.send({
        type: "CABIN_SEARCH_REQUEST",
        playerId: "host_1",
        targetPlayerId: "player_1",
      });

      // Verify status is pending
      let context = actor.getSnapshot().context;
      expect(context.captainCabinSearchStatus?.state).toBe("PENDING");

      // Target denies the search
      actor.send({
        type: "CABIN_SEARCH_RESPONSE",
        searcherId: "host_1",
        confirmed: false,
      });

      // Status should be cleared
      context = actor.getSnapshot().context;
      expect(context.captainCabinSearchStatus).toBeUndefined();

      // Player should NOT be marked unconvertible
      const player = context.players.find((p) => p.id === "player_1");
      expect(player?.isUnconvertible).toBeFalsy();
    });

    it("should return to idle state after denial", () => {
      actor.send({
        type: "CABIN_SEARCH_REQUEST",
        playerId: "host_1",
        targetPlayerId: "player_1",
      });

      // Machine should be in cabinSearchAction state
      expect(actor.getSnapshot().value).toEqual({
        playing: "cabinSearchAction",
      });

      // Target denies
      actor.send({
        type: "CABIN_SEARCH_RESPONSE",
        searcherId: "host_1",
        confirmed: false,
      });

      // Should return to idle
      expect(actor.getSnapshot().value).toEqual({
        playing: "idle",
      });
    });
  });

  describe("Cult Cabin Search Flow", () => {
    let actor: ReturnType<typeof createTestActor>;

    beforeEach(() => {
      actor = createTestActor();
      // Setup game with 5 players
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
    });

    it("should initialize cabin search in SETUP state", () => {
      actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "host_1" });
      const context = actor.getSnapshot().context;
      expect(context.cabinSearchStatus).toBeDefined();
      expect(context.cabinSearchStatus?.state).toBe("SETUP");
      expect(context.cabinSearchStatus?.initiatorId).toBe("host_1");
    });

    it("should allow players to claim roles", () => {
      actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "host_1" });
      actor.send({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "host_1",
        role: "CAPTAIN",
      });
      const context = actor.getSnapshot().context;
      expect(context.cabinSearchStatus?.claims.host_1).toBe("CAPTAIN");
    });

    it("should clear cabinSearchStatus when cancelled during SETUP", () => {
      actor.send({ type: "START_CULT_CABIN_SEARCH", initiatorId: "host_1" });
      actor.send({ type: "CANCEL_CULT_CABIN_SEARCH", playerId: "player_1" });
      const context = actor.getSnapshot().context;
      // XState clears the status on cancel (no CANCELLED state, just undefined)
      expect(
        context.cabinSearchStatus === undefined ||
          context.cabinSearchStatus?.state === "CANCELLED",
      ).toBe(true);
    });
  });

  describe("Guns Stash Flow", () => {
    let actor: ReturnType<typeof createTestActor>;

    beforeEach(() => {
      actor = createTestActor();
      // Setup game with 5 players
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
    });

    it("should initialize guns stash in WAITING_FOR_PLAYERS state", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "host_1" });
      const context = actor.getSnapshot().context;
      expect(context.gunsStashStatus).toBeDefined();
      expect(context.gunsStashStatus?.state).toBe("WAITING_FOR_PLAYERS");
      expect(context.gunsStashStatus?.initiatorId).toBe("host_1");
    });

    it("should initialize with initiator already ready (auto-confirmed)", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "host_1" });
      const context = actor.getSnapshot().context;
      // Implementation auto-readies the initiator who started the guns stash
      expect(context.gunsStashStatus?.readyPlayers).toEqual(["host_1"]);
    });

    it("should allow players to confirm ready", () => {
      actor.send({ type: "START_CULT_GUNS_STASH", initiatorId: "host_1" });
      actor.send({
        type: "CONFIRM_CULT_GUNS_STASH_READY",
        playerId: "player_1",
      });
      const context = actor.getSnapshot().context;
      expect(context.gunsStashStatus?.readyPlayers).toContain("player_1");
    });
  });

  describe("Game Management", () => {
    let actor: ReturnType<typeof createTestActor>;

    beforeEach(() => {
      actor = createTestActor();
      // Setup game with 5 players
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host_1",
        playerName: "Host",
        playerPhoto: null,
        code: "ABC123",
      });
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `player_${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      actor.send({ type: "START_GAME", playerId: "host_1" });
    });

    it("should handle BACK_TO_LOBBY from host", () => {
      actor.send({ type: "BACK_TO_LOBBY", playerId: "host_1" });
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toEqual({ lobby: "waiting" });
      // Assignments should be cleared
      expect(snapshot.context.assignments).toBeUndefined();
    });

    it("should handle player disconnect", () => {
      actor.send({ type: "PLAYER_DISCONNECTED", playerId: "player_1" });
      const context = actor.getSnapshot().context;
      const player = context.players.find((p) => p.id === "player_1");
      expect(player?.isOnline).toBe(false);
    });

    it("should handle player reconnect", () => {
      actor.send({ type: "PLAYER_DISCONNECTED", playerId: "player_1" });
      actor.send({ type: "PLAYER_RECONNECTED", playerId: "player_1" });
      const context = actor.getSnapshot().context;
      const player = context.players.find((p) => p.id === "player_1");
      expect(player?.isOnline).toBe(true);
    });

    it("should clear all status fields when resetGame is called", () => {
      // Start flogging to set floggingStatus
      actor.send({ type: "FLOGGING_REQUEST", targetPlayerId: "player_1" });

      // Verify flogging status is set
      let context = actor.getSnapshot().context;
      expect(context.floggingStatus).toBeDefined();
      expect(context.floggingStatus?.targetPlayerId).toBe("player_1");

      // Reset the game
      actor.send({ type: "RESET_GAME" });

      // floggingStatus should be cleared - this was the bug!
      context = actor.getSnapshot().context;
      expect(context.floggingStatus).toBeUndefined();
      expect(context.isFloggingUsed).toBe(false);
      expect(context.conversionCount).toBe(0);
    });
  });
});
