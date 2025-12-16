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

describe("Server - Cabin Search Flow", () => {
  let server: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new Server(mockRoom);

    // Setup initial state with 4 players (enough to have Captain, Navigator, Lieutenant, Crew)
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
        },
      ],
      status: "PLAYING",
      assignments: {
        p1: "CULT_LEADER",
        p2: "SAILOR",
        p3: "PIRATE",
        p4: "SAILOR",
      },
    } as LobbyState;

    // Mock connection mapping
    server.connectionToPlayer = new Map([
      ["conn_1", "p1"],
      ["conn_2", "p2"],
      ["conn_3", "p3"],
      ["conn_4", "p4"],
    ]);
  });

  it("should initialize cabin search in SETUP state", async () => {
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus).toBeDefined();
    expect(server.lobbyState?.cabinSearchStatus?.state).toBe("SETUP");
    expect(server.lobbyState?.cabinSearchStatus?.initiatorId).toBe("p1");
    expect(server.lobbyState?.cabinSearchStatus?.claims).toEqual({});
  });

  it("should allow players to claim roles", async () => {
    // Start search
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // P1 claims Captain
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p1", role: "CAPTAIN" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus?.claims.p1).toBe("CAPTAIN");
  });

  it("should enforce unique role constraints", async () => {
    // Start search
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // P1 claims Captain
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p1", role: "CAPTAIN" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus?.claims.p1).toBe("CAPTAIN");

    // P2 tries to claim Captain (should be rejected)
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p2", role: "CAPTAIN" },
      { id: "conn_2" } as Party.Connection,
    );

    // P2 should not have Captain
    expect(server.lobbyState?.cabinSearchStatus?.claims.p2).toBeUndefined();
  });

  it("should allow multiple crew members", async () => {
    // Start search
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // P1 and P2 both claim CREW
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p1", role: "CREW" },
      { id: "conn_1" } as Party.Connection,
    );

    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p2", role: "CREW" },
      { id: "conn_2" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus?.claims.p1).toBe("CREW");
    expect(server.lobbyState?.cabinSearchStatus?.claims.p2).toBe("CREW");
  });

  it("should transition to ACTIVE when all players claim", async () => {
    vi.useFakeTimers();

    // Start search
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // All players claim roles
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p1", role: "CAPTAIN" },
      { id: "conn_1" } as Party.Connection,
    );

    await server.handleClaimCabinSearchRole(
      {
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p2",
        role: "NAVIGATOR",
      },
      { id: "conn_2" } as Party.Connection,
    );

    await server.handleClaimCabinSearchRole(
      {
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p3",
        role: "LIEUTENANT",
      },
      { id: "conn_3" } as Party.Connection,
    );

    // Last player triggers transition
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p4", role: "CREW" },
      { id: "conn_4" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus?.state).toBe("ACTIVE");
    expect(server.lobbyState?.cabinSearchStatus?.startTime).toBeDefined();

    vi.useRealTimers();
  });

  it("should allow cancellation during SETUP", async () => {
    // Start search
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus).toBeDefined();

    // Cancel
    await server.handleCancelCabinSearch(
      { type: "CANCEL_CULT_CABIN_SEARCH", playerId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus).toBeDefined();
    expect(server.lobbyState?.cabinSearchStatus?.state).toBe("CANCELLED");
  });

  it("should not allow cancellation during ACTIVE state", async () => {
    // Start search and set to ACTIVE
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    server.lobbyState!.cabinSearchStatus!.state = "ACTIVE";

    // Try to cancel
    await server.handleCancelCabinSearch(
      { type: "CANCEL_CULT_CABIN_SEARCH", playerId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // Should still be defined
    expect(server.lobbyState?.cabinSearchStatus).toBeDefined();
    expect(server.lobbyState?.cabinSearchStatus?.state).toBe("ACTIVE");
  });

  it("should complete after timer (manual completion)", async () => {
    // Setup active state
    server.lobbyState!.cabinSearchStatus = {
      initiatorId: "p1",
      claims: {
        p1: "CAPTAIN",
        p2: "NAVIGATOR",
        p3: "LIEUTENANT",
        p4: "CREW",
      },
      state: "ACTIVE",
      startTime: Date.now(),
    };

    await server.completeCabinSearch();

    expect(server.lobbyState?.cabinSearchStatus?.state).toBe("COMPLETED");
  });

  it("should allow player to change role during SETUP", async () => {
    // Start search
    await server.handleStartCabinSearch(
      { type: "START_CULT_CABIN_SEARCH", initiatorId: "p1" },
      { id: "conn_1" } as Party.Connection,
    );

    // P1 claims Captain
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p1", role: "CAPTAIN" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus?.claims.p1).toBe("CAPTAIN");

    // P1 changes to Crew
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p1", role: "CREW" },
      { id: "conn_1" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus?.claims.p1).toBe("CREW");

    // Now P2 can claim Captain
    await server.handleClaimCabinSearchRole(
      { type: "CLAIM_CULT_CABIN_SEARCH_ROLE", playerId: "p2", role: "CAPTAIN" },
      { id: "conn_2" } as Party.Connection,
    );

    expect(server.lobbyState?.cabinSearchStatus?.claims.p2).toBe("CAPTAIN");
  });
});
