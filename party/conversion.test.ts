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
  schedule: vi.fn(), // Mock schedule
} as unknown as Party.Room;

const _mockConnection = {
  id: "conn_1",
  send: vi.fn(),
} as unknown as Party.Connection;

describe("Server - Conversion Flow", () => {
  let server: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new Server(mockRoom);

    // Setup initial state with 3 players
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
        },
      ],
      status: "PLAYING",
      assignments: {
        p1: "CULT_LEADER",
        p2: "SAILOR",
        p3: "PIRATE",
      },
      conversionStatus: {
        initiatorId: "p1",
        responses: { p1: true }, // Initiator auto-accepts usually, or we simulate it
        state: "PENDING",
      },
    } as LobbyState;

    // Mock connection mapping
    server.connectionToPlayer = new Map([
      ["conn_1", "p1"],
      ["conn_2", "p2"],
      ["conn_3", "p3"],
    ]);
  });

  it("should start conversion round when all players accept", async () => {
    vi.useFakeTimers();
    const resolveSpy = vi.spyOn(server, "resolveConversionRound");

    // P2 accepts
    await server.handleRespondConversion(
      { type: "RESPOND_CONVERSION", playerId: "p2", accept: true },
      { id: "conn_2" } as Party.Connection,
    );

    // P3 accepts (triggering start)
    await server.handleRespondConversion(
      { type: "RESPOND_CONVERSION", playerId: "p3", accept: true },
      { id: "conn_3" } as Party.Connection,
    );

    expect(server.lobbyState?.conversionStatus?.state).toBe("ACTIVE");

    // Verify broadcast of CONVERSION_RESULT success
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining('"type":"CONVERSION_RESULT","success":true'),
    );

    // Fast-forward time
    vi.advanceTimersByTime(15000);

    expect(resolveSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("should handle Cult Leader picking a player", async () => {
    // Setup active round
    server.lobbyState!.conversionStatus!.state = "ACTIVE";
    server.lobbyState!.conversionStatus!.round = {
      startTime: Date.now(),
      duration: 15000,
      playerQuestions: { p1: 0, p2: 0, p3: 0 },
      leaderChoice: null,
      playerAnswers: {},
    };

    // P1 (Cult Leader) picks P2
    await server.handleSubmitConversionAction(
      {
        type: "SUBMIT_CONVERSION_ACTION",
        playerId: "p1",
        action: "PICK_PLAYER",
        targetId: "p2",
      },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.conversionStatus?.round?.leaderChoice).toBe("p2");
  });

  it("should handle player answering quiz", async () => {
    // Setup active round
    server.lobbyState!.conversionStatus!.state = "ACTIVE";
    server.lobbyState!.conversionStatus!.round = {
      startTime: Date.now(),
      duration: 15000,
      playerQuestions: { p1: 0, p2: 0, p3: 0 },
      leaderChoice: null,
      playerAnswers: {},
    };

    // P2 answers quiz
    await server.handleSubmitConversionAction(
      {
        type: "SUBMIT_CONVERSION_ACTION",
        playerId: "p2",
        action: "ANSWER_QUIZ",
        answer: "q0-b", // Plankton option ID
      },
      { id: "conn_2" } as Party.Connection,
    );

    expect(server.lobbyState?.conversionStatus?.round?.playerAnswers.p2).toBe(
      "q0-b",
    );
  });

  it("should resolve round correctly", async () => {
    // Setup active round with choices made
    server.lobbyState!.conversionStatus!.state = "ACTIVE";
    server.lobbyState!.conversionStatus!.round = {
      startTime: Date.now(),
      duration: 15000,
      playerQuestions: { p1: 0, p2: 0, p3: 0 }, // Q0: correct answer is "q0-a" (Ships and Sailors)
      leaderChoice: "p2",
      playerAnswers: {
        p2: "q0-a", // Correct
        p3: "q0-b", // Incorrect
      },
    };

    await server.resolveConversionRound();

    expect(server.lobbyState?.conversionStatus?.state).toBe("COMPLETED");
    expect(server.lobbyState?.conversionStatus?.round?.result).toBeDefined();

    // P2 should be converted
    expect(
      server.lobbyState?.conversionStatus?.round?.result?.convertedPlayerId,
    ).toBe("p2");
    expect(server.lobbyState?.assignments?.p2).toBe("CULTIST");

    // P2 should be in correctAnswers, P3 should not
    expect(
      server.lobbyState?.conversionStatus?.round?.result?.correctAnswers,
    ).toContain("p2");
    expect(
      server.lobbyState?.conversionStatus?.round?.result?.correctAnswers,
    ).not.toContain("p3");
  });

  it("should handle random fallback when no choices made", async () => {
    // Setup active round
    server.lobbyState!.conversionStatus!.state = "ACTIVE";
    server.lobbyState!.conversionStatus!.round = {
      startTime: Date.now(),
      duration: 15000,
      playerQuestions: { p1: 0, p2: 0, p3: 0 },
      leaderChoice: null,
      playerAnswers: {},
    };

    await server.resolveConversionRound();

    expect(server.lobbyState?.conversionStatus?.state).toBe("COMPLETED");
    expect(server.lobbyState?.conversionStatus?.round?.result).toBeDefined();

    // Should have picked a random leader choice (p2 or p3, since p1 is leader)
    expect(
      server.lobbyState?.conversionStatus?.round?.leaderChoice,
    ).not.toBeNull();
    expect(["p2", "p3"]).toContain(
      server.lobbyState?.conversionStatus?.round?.leaderChoice,
    );

    // Should have picked random answers for p2 and p3
    expect(
      server.lobbyState?.conversionStatus?.round?.playerAnswers.p2,
    ).toBeDefined();
    expect(
      server.lobbyState?.conversionStatus?.round?.playerAnswers.p3,
    ).toBeDefined();
  });
  it("should limit conversions to 3 per game", async () => {
    // Set conversion count to 3 and clear any active conversion
    server.lobbyState!.conversionCount = 3;
    server.lobbyState!.conversionStatus = undefined;
    const mockSend = vi.fn();

    // Try to start conversion
    await server.handleStartConversion(
      { type: "START_CONVERSION", initiatorId: "p1" },
      { id: "conn_1", send: mockSend } as unknown as Party.Connection,
    );

    // Should send error message
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining(
        "The conversion ritual can only be performed 3 times per game",
      ),
    );
  });

  it("should increment conversion count on successful start", async () => {
    server.lobbyState!.conversionCount = 0;
    server.lobbyState!.conversionStatus = {
      initiatorId: "p1",
      responses: { p1: true, p2: true },
      state: "PENDING",
    };

    // P3 accepts, triggering start
    await server.handleRespondConversion(
      { type: "RESPOND_CONVERSION", playerId: "p3", accept: true },
      { id: "conn_3" } as Party.Connection,
    );

    expect(server.lobbyState?.conversionCount).toBe(1);
  });
});
