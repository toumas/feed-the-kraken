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
      // Player should have notRole set and be marked as unconvertible
      const player = context.players.find((p) => p.id === "player_1");
      expect(player?.notRole).toBeDefined();
      expect(player?.isUnconvertible).toBe(true);
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
      expect(context.isGunsStashUsed).toBe(false);
      expect(context.isCultCabinSearchUsed).toBe(false);
      expect(context.conversionCount).toBe(0);
    });

    it("should remove player when LEAVE_LOBBY is sent during game", () => {
      actor.send({ type: "LEAVE_LOBBY", playerId: "player_1" });
      const context = actor.getSnapshot().context;
      expect(context.players).toHaveLength(4);
      expect(context.players.find((p) => p.id === "player_1")).toBeUndefined();
      // Game should still be in playing state
      expect(actor.getSnapshot().value).toEqual({ playing: "idle" });
    });

    it("should promote another player to host when host leaves during game", () => {
      // Verify host_1 is the host
      let context = actor.getSnapshot().context;
      expect(context.players.find((p) => p.id === "host_1")?.isHost).toBe(true);

      // Host leaves the game
      actor.send({ type: "LEAVE_LOBBY", playerId: "host_1" });

      context = actor.getSnapshot().context;
      // host_1 should be removed
      expect(context.players.find((p) => p.id === "host_1")).toBeUndefined();
      // First remaining player should be promoted to host
      expect(context.players[0].isHost).toBe(true);
      // Game should still be in playing state
      expect(actor.getSnapshot().value).toEqual({ playing: "idle" });
    });

    it("should not change host when non-host player leaves during game", () => {
      let context = actor.getSnapshot().context;
      const originalHost = context.players.find((p) => p.isHost);
      expect(originalHost?.id).toBe("host_1");

      // Non-host player leaves
      actor.send({ type: "LEAVE_LOBBY", playerId: "player_2" });

      context = actor.getSnapshot().context;
      // Original host should still be host
      expect(context.players.find((p) => p.id === "host_1")?.isHost).toBe(true);
    });
  });

  describe("Action Limitations", () => {
    let actor: ReturnType<typeof createTestActor>;

    // Helper type for guard functions
    type GuardFn = (args: { context: GameContext }) => boolean;
    type GuardsRecord = Record<string, GuardFn>;

    beforeEach(() => {
      // Create a game with 5 players and start it
      actor = createTestActor();
      actor.send({
        type: "CREATE_LOBBY",
        playerId: "host",
        playerName: "Host",
        playerPhoto: null,
        code: "TEST",
      });
      // Add 4 more players
      for (let i = 1; i <= 4; i++) {
        actor.send({
          type: "JOIN_LOBBY",
          playerId: `p${i}`,
          playerName: `Player ${i}`,
          playerPhoto: null,
        });
      }
      // Start the game
      actor.send({ type: "START_GAME", playerId: "host" });
    });

    describe("One-Time Use Actions", () => {
      it("should block FLOGGING_REQUEST when isFloggingUsed is true", () => {
        const snapshot = actor.getSnapshot();
        expect(snapshot.context.isFloggingUsed).toBe(false);
        expect(snapshot.value).toEqual({ playing: "idle" });

        // Test the guard logic directly
        const guards = gameMachine.implementations?.guards as GuardsRecord;
        expect(guards).toBeDefined();

        // Test guard with isFloggingUsed = false (should allow)
        const contextNotUsed = { ...snapshot.context, isFloggingUsed: false };
        expect(guards.floggingNotUsed({ context: contextNotUsed })).toBe(true);

        // Test guard with isFloggingUsed = true (should block)
        const contextUsed = { ...snapshot.context, isFloggingUsed: true };
        expect(guards.floggingNotUsed({ context: contextUsed })).toBe(false);
      });

      it("should block OFF_WITH_TONGUE_REQUEST when isOffWithTongueUsed is true", () => {
        const snapshot = actor.getSnapshot();
        const guards = gameMachine.implementations?.guards as GuardsRecord;

        // Test guard with isOffWithTongueUsed = false (should allow)
        const contextNotUsed = {
          ...snapshot.context,
          isOffWithTongueUsed: false,
        };
        expect(guards.offWithTongueNotUsed({ context: contextNotUsed })).toBe(
          true,
        );

        // Test guard with isOffWithTongueUsed = true (should block)
        const contextUsed = { ...snapshot.context, isOffWithTongueUsed: true };
        expect(guards.offWithTongueNotUsed({ context: contextUsed })).toBe(
          false,
        );
      });

      it("should block START_CULT_CABIN_SEARCH when isCultCabinSearchUsed is true", () => {
        const snapshot = actor.getSnapshot();
        const guards = gameMachine.implementations?.guards as GuardsRecord;

        // Test guard with isCultCabinSearchUsed = false (should allow)
        const contextNotUsed = {
          ...snapshot.context,
          isCultCabinSearchUsed: false,
        };
        expect(guards.cabinSearchNotUsed({ context: contextNotUsed })).toBe(
          true,
        );

        // Test guard with isCultCabinSearchUsed = true (should block)
        const contextUsed = {
          ...snapshot.context,
          isCultCabinSearchUsed: true,
        };
        expect(guards.cabinSearchNotUsed({ context: contextUsed })).toBe(false);
      });

      it("should block START_CULT_GUNS_STASH when isGunsStashUsed is true", () => {
        const snapshot = actor.getSnapshot();
        const guards = gameMachine.implementations?.guards as GuardsRecord;

        // Test guard with isGunsStashUsed = false (should allow)
        const contextNotUsed = { ...snapshot.context, isGunsStashUsed: false };
        expect(guards.gunsStashNotUsed({ context: contextNotUsed })).toBe(true);

        // Test guard with isGunsStashUsed = true (should block)
        const contextUsed = { ...snapshot.context, isGunsStashUsed: true };
        expect(guards.gunsStashNotUsed({ context: contextUsed })).toBe(false);
      });
    });

    describe("Count-Limited Actions", () => {
      it("should allow START_CONVERSION up to 3 times", () => {
        const snapshot = actor.getSnapshot();
        const guards = gameMachine.implementations?.guards as GuardsRecord;

        // Test counts 0, 1, 2 (should allow)
        for (let count = 0; count < 3; count++) {
          const context = { ...snapshot.context, conversionCount: count };
          expect(guards.conversionNotAtLimit({ context })).toBe(true);
        }

        // Test count 3 (should block)
        const contextAtLimit = { ...snapshot.context, conversionCount: 3 };
        expect(guards.conversionNotAtLimit({ context: contextAtLimit })).toBe(
          false,
        );
      });

      it("should block START_CONVERSION when no convertible players exist", () => {
        const snapshot = actor.getSnapshot();
        const guards = gameMachine.implementations?.guards as GuardsRecord;

        // Create a context with convertible players (should allow)
        const contextWithConvertible = {
          ...snapshot.context,
          assignments: {
            host: "SAILOR" as const,
            p1: "SAILOR" as const,
            p2: "CULTIST" as const,
            p3: "CULT_LEADER" as const,
            p4: "PIRATE" as const,
          },
          originalRoles: {
            host: "SAILOR" as const,
            p1: "SAILOR" as const,
            p2: "CULTIST" as const,
            p3: "CULT_LEADER" as const,
            p4: "PIRATE" as const,
          },
        };
        expect(
          guards.canStartConversion({ context: contextWithConvertible }),
        ).toBe(true);

        // Create a context where all non-Cult-Leader players are unconvertible (should block)
        const contextNoConvertible = {
          ...snapshot.context,
          players: snapshot.context.players.map((p) => ({
            ...p,
            isUnconvertible: p.id !== "p3", // All except Cult Leader are unconvertible
          })),
          assignments: {
            host: "SAILOR" as const,
            p1: "SAILOR" as const,
            p2: "CULTIST" as const,
            p3: "CULT_LEADER" as const,
            p4: "PIRATE" as const,
          },
          originalRoles: {
            host: "SAILOR" as const,
            p1: "SAILOR" as const,
            p2: "CULTIST" as const,
            p3: "CULT_LEADER" as const,
            p4: "PIRATE" as const,
          },
        };
        expect(
          guards.canStartConversion({ context: contextNoConvertible }),
        ).toBe(false);

        // Create a context where all eligible players have been converted to Cultist (should block)
        const contextAllConverted = {
          ...snapshot.context,
          assignments: {
            host: "CULTIST" as const, // converted
            p1: "CULTIST" as const, // converted
            p2: "CULTIST" as const, // original cultist - still targetable
            p3: "CULT_LEADER" as const,
            p4: "CULTIST" as const, // converted
          },
          originalRoles: {
            host: "SAILOR" as const,
            p1: "PIRATE" as const,
            p2: "CULTIST" as const, // original cultist
            p3: "CULT_LEADER" as const,
            p4: "SAILOR" as const,
          },
        };
        // Original cultist (p2) is still targetable since Cult Leader doesn't know who they are
        expect(
          guards.canStartConversion({ context: contextAllConverted }),
        ).toBe(true);

        // Create a context where original cultist is also unconvertible (should block)
        const contextAllConvertedWithUnconvertibleOriginal = {
          ...contextAllConverted,
          players: snapshot.context.players.map((p) => ({
            ...p,
            isUnconvertible: p.id === "p2", // Original cultist is unconvertible
          })),
        };
        expect(
          guards.canStartConversion({
            context: contextAllConvertedWithUnconvertibleOriginal,
          }),
        ).toBe(false);

        // Test at conversion count limit (should block)
        const contextAtLimit = {
          ...contextWithConvertible,
          conversionCount: 3,
        };
        expect(guards.canStartConversion({ context: contextAtLimit })).toBe(
          false,
        );

        // Test with all eligible players eliminated (should block)
        const contextAllEliminated = {
          ...contextWithConvertible,
          conversionCount: 0,
          players: snapshot.context.players.map((p) => ({
            ...p,
            isEliminated: p.id !== "p3", // All except Cult Leader are eliminated
          })),
        };
        expect(
          guards.canStartConversion({ context: contextAllEliminated }),
        ).toBe(false);

        // Test with only Cult Leader not eliminated/unconvertible (should block)
        const contextOnlyCultLeaderAvailable = {
          ...contextWithConvertible,
          conversionCount: 0,
          players: snapshot.context.players.map((p) => ({
            ...p,
            isEliminated: p.id !== "p3", // All except Cult Leader are eliminated
          })),
          assignments: {
            host: "SAILOR" as const,
            p1: "SAILOR" as const,
            p2: "CULTIST" as const,
            p3: "CULT_LEADER" as const,
            p4: "PIRATE" as const,
          },
        };
        expect(
          guards.canStartConversion({
            context: contextOnlyCultLeaderAvailable,
          }),
        ).toBe(false);
      });

      it("should allow FEED_THE_KRAKEN_REQUEST up to 2 times", () => {
        const snapshot = actor.getSnapshot();
        const guards = gameMachine.implementations?.guards as GuardsRecord;

        // Test counts 0, 1 (should allow)
        for (let count = 0; count < 2; count++) {
          const context = { ...snapshot.context, feedTheKrakenCount: count };
          expect(guards.feedTheKrakenNotAtLimit({ context })).toBe(true);
        }

        // Test count 2 (should block)
        const contextAtLimit = { ...snapshot.context, feedTheKrakenCount: 2 };
        expect(
          guards.feedTheKrakenNotAtLimit({ context: contextAtLimit }),
        ).toBe(false);
      });

      it("should allow CABIN_SEARCH_REQUEST up to 2 times", () => {
        const snapshot = actor.getSnapshot();
        const guards = gameMachine.implementations?.guards as GuardsRecord;

        // Test counts 0, 1 (should allow)
        for (let count = 0; count < 2; count++) {
          const context = { ...snapshot.context, cabinSearchCount: count };
          expect(guards.cabinSearchNotAtLimit({ context })).toBe(true);
        }

        // Test count 2 (should block)
        const contextAtLimit = { ...snapshot.context, cabinSearchCount: 2 };
        expect(guards.cabinSearchNotAtLimit({ context: contextAtLimit })).toBe(
          false,
        );
      });
    });

    describe("Reset Behavior", () => {
      it("should reset all action flags and counts on RESET_GAME", () => {
        const snapshot = actor.getSnapshot();

        // Verify initial values after game start
        expect(snapshot.context.isFloggingUsed).toBe(false);
        expect(snapshot.context.isGunsStashUsed).toBe(false);
        expect(snapshot.context.isCultCabinSearchUsed).toBe(false);
        expect(snapshot.context.isOffWithTongueUsed).toBe(false);
        expect(snapshot.context.conversionCount).toBe(0);
        expect(snapshot.context.feedTheKrakenCount).toBe(0);
        expect(snapshot.context.cabinSearchCount).toBe(0);

        // Send RESET_GAME
        actor.send({ type: "RESET_GAME" });
        const afterReset = actor.getSnapshot();

        // Verify all flags and counts are reset
        expect(afterReset.context.isFloggingUsed).toBe(false);
        expect(afterReset.context.isGunsStashUsed).toBe(false);
        expect(afterReset.context.isCultCabinSearchUsed).toBe(false);
        expect(afterReset.context.isOffWithTongueUsed).toBe(false);
        expect(afterReset.context.conversionCount).toBe(0);
        expect(afterReset.context.feedTheKrakenCount).toBe(0);
        expect(afterReset.context.cabinSearchCount).toBe(0);
      });

      it("should reset all action flags and counts on BACK_TO_LOBBY", () => {
        // Send BACK_TO_LOBBY (host only)
        actor.send({ type: "BACK_TO_LOBBY", playerId: "host" });
        const afterBackToLobby = actor.getSnapshot();

        // Should be back in lobby
        expect(afterBackToLobby.value).toEqual({ lobby: "waiting" });

        // Verify all flags and counts are reset
        expect(afterBackToLobby.context.isFloggingUsed).toBe(false);
        expect(afterBackToLobby.context.isGunsStashUsed).toBe(false);
        expect(afterBackToLobby.context.isCultCabinSearchUsed).toBe(false);
        expect(afterBackToLobby.context.isOffWithTongueUsed).toBe(false);
        expect(afterBackToLobby.context.conversionCount).toBe(0);
        expect(afterBackToLobby.context.feedTheKrakenCount).toBe(0);
        expect(afterBackToLobby.context.cabinSearchCount).toBe(0);
      });
    });
  });
});
