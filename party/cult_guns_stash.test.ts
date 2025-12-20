/** biome-ignore-all lint/style/noNonNullAssertion: Test file uses non-null assertions for controlled test setup */
import type * as Party from "partykit/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Server, { type LobbyState } from "./index";

// Mock Party.Room and Party.Connection
const mockStorage = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

const mockRoom = {
  id: "TEST_ROOM",
  storage: mockStorage,
  broadcast: vi.fn(),
  getConnections: vi.fn(() => []),
} as unknown as Party.Room;

describe("Server - Guns Stash Flow", () => {
  let server: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new Server(mockRoom);

    // Setup initial state with 5 players
    server.lobbyState = {
      code: "TEST",
      players: [
        {
          id: "p1",
          name: "P1",
          photoUrl: null,
          isHost: true,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: 0,
          hasTongue: true,
        },
        {
          id: "p2",
          name: "P2",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: 0,
          hasTongue: true,
        },
        {
          id: "p3",
          name: "P3",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: 0,
          hasTongue: true,
        },
        {
          id: "p4",
          name: "P4",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: 0,
          hasTongue: true,
        },
        {
          id: "p5",
          name: "P5",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: 0,
          hasTongue: true,
        },
      ],
      status: "PLAYING",
      assignments: {
        p1: "CULT_LEADER",
        p2: "SAILOR",
        p3: "PIRATE",
        p4: "SAILOR",
        p5: "CULTIST",
      },
    } as LobbyState;

    // Mock connection mapping
    server.connectionToPlayer = new Map([
      ["conn_1", "p1"],
      ["conn_2", "p2"],
      ["conn_3", "p3"],
      ["conn_4", "p4"],
      ["conn_5", "p5"],
    ]);
  });

  it("should initialize guns stash in WAITING_FOR_PLAYERS state", async () => {
    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus).toBeDefined();
    expect(server.lobbyState?.gunsStashStatus?.state).toBe(
      "WAITING_FOR_PLAYERS",
    );
    expect(server.lobbyState?.gunsStashStatus?.initiatorId).toBe("p1");
    expect(server.lobbyState?.gunsStashStatus?.readyPlayers).toContain("p1");
  });

  it("should allow any player to start guns stash", async () => {
    // Non-leader starting
    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p2" },
      { id: "conn_2" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus).toBeDefined();
    expect(server.lobbyState?.gunsStashStatus?.initiatorId).toBe("p2");
  });

  it("should auto-add initiator to readyPlayers", async () => {
    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus?.readyPlayers).toContain("p1");
  });

  it("should allow players to confirm ready", async () => {
    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    await server.handleConfirmGunsStashReady(
      { type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" },
      { id: "conn_2" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus?.readyPlayers).toContain("p2");
  });

  it("should transition to DISTRIBUTION when all players ready", async () => {
    vi.useFakeTimers();

    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // All other players confirm ready
    for (let i = 2; i <= 5; i++) {
      await server.handleConfirmGunsStashReady(
        { type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: `p${i}` },
        { id: `conn_${i}` } as Party.Connection,
      );
    }

    expect(server.lobbyState?.gunsStashStatus?.state).toBe("DISTRIBUTION");
    expect(server.lobbyState?.gunsStashStatus?.startTime).toBeDefined();
    expect(server.lobbyState?.gunsStashStatus?.playerQuestions).toBeDefined();

    vi.useRealTimers();
  });

  it("should allow distribution draft updates", async () => {
    // Setup distribution state
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      startTime: Date.now(),
      playerQuestions: { p2: 0, p3: 1, p4: 2, p5: 3 },
      playerAnswers: {},
    };

    await server.handleSubmitGunsStashDistribution(
      {
        type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
        playerId: "p1",
        distribution: { p2: 1, p3: 2 },
      },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus?.distribution).toEqual({
      p2: 1,
      p3: 2,
    });
  });

  it("should allow quiz answer submissions", async () => {
    // Setup distribution state
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      startTime: Date.now(),
      playerQuestions: { p2: 0, p3: 1, p4: 2, p5: 3 },
      playerAnswers: {},
    };

    await server.handleSubmitGunsStashAction(
      { type: "SUBMIT_CULT_GUNS_STASH_ACTION", playerId: "p2", answer: "A" },
      { id: "conn_2" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus?.playerAnswers?.p2).toBe("A");
  });

  it("should complete with random fill if distribution incomplete", async () => {
    // Setup distribution state with partial distribution (1 gun)
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      startTime: Date.now(),
      playerQuestions: { p2: 0, p3: 1, p4: 2, p5: 3 },
      playerAnswers: {},
      distribution: { p2: 1 },
    };

    await server.completeGunsStash();

    expect(server.lobbyState?.gunsStashStatus?.state).toBe("COMPLETED");

    // Total guns should be 3
    const totalGuns = Object.values(
      server.lobbyState?.gunsStashStatus?.distribution || {},
    ).reduce((sum, count) => sum + count, 0);
    expect(totalGuns).toBe(3);
  });

  it("should calculate quiz results on completion", async () => {
    // Setup distribution state with answers
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      startTime: Date.now(),
      playerQuestions: { p2: 0, p3: 0 }, // Both get question 0
      playerAnswers: {},
      distribution: { p2: 1, p3: 1, p4: 1 },
    };

    // Simulate submitting answers (assuming question 0's correct answer)
    // We'll check that results object exists after completion
    await server.completeGunsStash();

    expect(server.lobbyState?.gunsStashStatus?.results).toBeDefined();
    expect(
      server.lobbyState?.gunsStashStatus?.results?.correctAnswers,
    ).toBeInstanceOf(Array);
  });

  it("should allow cancellation during WAITING_FOR_PLAYERS", async () => {
    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus).toBeDefined();

    await server.handleCancelGunsStash(
      { type: "CANCEL_CULT_GUNS_STASH", playerId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus?.state).toBe("CANCELLED");
  });

  it("should not start guns stash during active cabin search", async () => {
    // Setup active cabin search
    server.lobbyState!.cabinSearchStatus = {
      initiatorId: "p1",
      claims: {},
      state: "SETUP",
    };

    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // Guns stash should not be started
    expect(server.lobbyState?.gunsStashStatus).toBeUndefined();
  });

  it("should not start guns stash during active conversion", async () => {
    // Setup active conversion
    server.lobbyState!.conversionStatus = {
      initiatorId: "p1",
      responses: {},
      state: "ACTIVE",
    };

    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // Guns stash should not be started
    expect(server.lobbyState?.gunsStashStatus).toBeUndefined();
  });

  it("should not start guns stash during existing active guns stash", async () => {
    // Setup existing active guns stash
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p2",
      state: "WAITING_FOR_PLAYERS",
      readyPlayers: ["p2"],
    };

    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // Should still be p2's stash, not overwritten
    expect(server.lobbyState?.gunsStashStatus?.initiatorId).toBe("p2");
  });

  it("should not add duplicate ready players", async () => {
    await server.handleStartGunsStash(
      { type: "START_CULT_GUNS_STASH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // P1 is already ready (auto-added as initiator)
    await server.handleConfirmGunsStashReady(
      { type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // Should still only have one entry for p1
    const readyCount = server.lobbyState?.gunsStashStatus?.readyPlayers.filter(
      (id) => id === "p1",
    ).length;
    expect(readyCount).toBe(1);
  });

  it("should ignore ready confirmation if not in WAITING_FOR_PLAYERS", async () => {
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1"],
      startTime: Date.now(),
      playerQuestions: {},
      playerAnswers: {},
    };

    await server.handleConfirmGunsStashReady(
      { type: "CONFIRM_CULT_GUNS_STASH_READY", playerId: "p2" },
      { id: "conn_2" } as Party.Connection,
    );

    // P2 should not be added since we're in DISTRIBUTION already
    expect(server.lobbyState?.gunsStashStatus?.readyPlayers).not.toContain(
      "p2",
    );
  });

  it("should ignore distribution submission if not in DISTRIBUTION state", async () => {
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "WAITING_FOR_PLAYERS",
      readyPlayers: ["p1"],
    };

    await server.handleSubmitGunsStashDistribution(
      {
        type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
        playerId: "p1",
        distribution: { p2: 1, p3: 2 },
      },
      { id: "conn_1" } as Party.Connection,
    );

    // Should not set distribution
    expect(server.lobbyState?.gunsStashStatus?.distribution).toBeUndefined();
  });

  it("should ignore quiz answer if not in DISTRIBUTION state", async () => {
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "COMPLETED",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      distribution: { p2: 1, p3: 1, p4: 1 },
    };

    await server.handleSubmitGunsStashAction(
      { type: "SUBMIT_CULT_GUNS_STASH_ACTION", playerId: "p2", answer: "A" },
      { id: "conn_2" } as Party.Connection,
    );

    // Should not set answer
    expect(server.lobbyState?.gunsStashStatus?.playerAnswers).toBeUndefined();
  });

  it("should allow multiple distribution updates (overwrites previous)", async () => {
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      startTime: Date.now(),
      playerQuestions: { p2: 0, p3: 1, p4: 2, p5: 3 },
      playerAnswers: {},
      distribution: { p2: 1 },
    };

    await server.handleSubmitGunsStashDistribution(
      {
        type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
        playerId: "p1",
        distribution: { p3: 2, p4: 1 },
      },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus?.distribution).toEqual({
      p3: 2,
      p4: 1,
    });
  });

  it("should allow player to change quiz answer", async () => {
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      startTime: Date.now(),
      playerQuestions: { p2: 0, p3: 1, p4: 2, p5: 3 },
      playerAnswers: { p2: "A" },
    };

    await server.handleSubmitGunsStashAction(
      { type: "SUBMIT_CULT_GUNS_STASH_ACTION", playerId: "p2", answer: "B" },
      { id: "conn_2" } as Party.Connection,
    );

    expect(server.lobbyState?.gunsStashStatus?.playerAnswers?.p2).toBe("B");
  });

  it("should complete with full random fill if no distribution given", async () => {
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "DISTRIBUTION",
      readyPlayers: ["p1", "p2", "p3", "p4", "p5"],
      startTime: Date.now(),
      playerQuestions: { p2: 0, p3: 1, p4: 2, p5: 3 },
      playerAnswers: {},
      // No distribution set
    };

    await server.completeGunsStash();

    expect(server.lobbyState?.gunsStashStatus?.state).toBe("COMPLETED");

    // Total guns should be 3
    const totalGuns = Object.values(
      server.lobbyState?.gunsStashStatus?.distribution || {},
    ).reduce((sum, count) => sum + count, 0);
    expect(totalGuns).toBe(3);
  });

  it("should not complete if not in DISTRIBUTION state", async () => {
    server.lobbyState!.gunsStashStatus = {
      initiatorId: "p1",
      state: "WAITING_FOR_PLAYERS",
      readyPlayers: ["p1"],
    };

    await server.completeGunsStash();

    // Should still be in WAITING_FOR_PLAYERS
    expect(server.lobbyState?.gunsStashStatus?.state).toBe(
      "WAITING_FOR_PLAYERS",
    );
  });
});
