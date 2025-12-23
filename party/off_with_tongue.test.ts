import type * as Party from "partykit/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LobbyState } from "../app/types";
import Server from "./index";

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
  getConnections: vi.fn(),
} as unknown as Party.Room;

describe("Off with the Tongue Server Logic", () => {
  let server: Server;
  let mockLobbyState: LobbyState;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new Server(mockRoom);

    // Setup mock connections map
    server.connectionToPlayer = new Map([
      ["conn_1", "p1"], // Captain
      ["conn_2", "p2"], // Target Player
      ["conn_3", "p3"], // Already silenced player
    ]);

    // Setup mock lobby state
    mockLobbyState = {
      code: "TEST",
      status: "PLAYING",
      players: [
        {
          id: "p1",
          name: "Captain",
          photoUrl: null,
          isHost: true,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
          hasTongue: true,
        },
        {
          id: "p2",
          name: "Sailor",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
          hasTongue: true,
        },
        {
          id: "p3",
          name: "Silenced Sailor",
          photoUrl: null,
          isHost: false,
          isReady: true,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          notRole: null,
          joinedAt: Date.now(),
          hasTongue: false,
        },
      ],
    };
    server.lobbyState = mockLobbyState;

    // Mock getConnections
    (
      mockRoom.getConnections as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue([
      { id: "conn_1", send: vi.fn() },
      { id: "conn_2", send: vi.fn() },
      { id: "conn_3", send: vi.fn() },
    ]);
  });

  it("should allow Captain to request silencing a player", async () => {
    const captainConn = {
      id: "conn_1",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleOffWithTongueRequest(
      { type: "OFF_WITH_TONGUE_REQUEST", targetPlayerId: "p2" },
      captainConn,
    );

    // Should verify that the target player receives the prompt
    const connections = Array.from(mockRoom.getConnections());
    const targetConn = connections.find((c) => c.id === "conn_2");

    expect(targetConn?.send).toHaveBeenCalledWith(
      expect.stringContaining("OFF_WITH_TONGUE_PROMPT"),
    );
    expect(targetConn?.send).toHaveBeenCalledWith(
      expect.stringContaining('"captainName":"Captain"'),
    );
  });

  it("should prevent Captain from silencing themselves", async () => {
    const captainConn = {
      id: "conn_1",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleOffWithTongueRequest(
      { type: "OFF_WITH_TONGUE_REQUEST", targetPlayerId: "p1" },
      captainConn,
    );

    expect(captainConn.send).toHaveBeenCalledWith(
      expect.stringContaining("ERROR"),
    );
    expect(captainConn.send).toHaveBeenCalledWith(
      expect.stringContaining("errors.cannotTargetSelf"),
    );
  });

  it("should prevent silencing an already silenced player", async () => {
    const captainConn = {
      id: "conn_1",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleOffWithTongueRequest(
      { type: "OFF_WITH_TONGUE_REQUEST", targetPlayerId: "p3" },
      captainConn,
    );

    expect(captainConn.send).toHaveBeenCalledWith(
      expect.stringContaining("ERROR"),
    );
    expect(captainConn.send).toHaveBeenCalledWith(
      expect.stringContaining("errors.playerAlreadySilenced"),
    );
  });

  it("should silence player when they accept", async () => {
    // Target (p2) accepts
    const targetConn = {
      id: "conn_2",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleOffWithTongueResponse(
      {
        type: "OFF_WITH_TONGUE_RESPONSE",
        captainId: "p1",
        confirmed: true,
      },
      targetConn,
    );

    // Player should be silenced
    expect(server.lobbyState?.players[1].hasTongue).toBe(false);

    // Should broadcast lobby update
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining("LOBBY_UPDATE"),
    );

    // Captain should receive result notification
    const connections = Array.from(mockRoom.getConnections());
    const captainConn = connections.find((c) => c.id === "conn_1");

    expect(captainConn?.send).toHaveBeenCalledWith(
      expect.stringContaining("OFF_WITH_TONGUE_RESULT"),
    );
  });

  it("should notify Captain when player denies", async () => {
    // Target (p2) denies
    const targetConn = {
      id: "conn_2",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleOffWithTongueResponse(
      {
        type: "OFF_WITH_TONGUE_RESPONSE",
        captainId: "p1",
        confirmed: false,
      },
      targetConn,
    );

    // Player should NOT be silenced
    expect(server.lobbyState?.players[1].hasTongue).toBe(true);

    // Captain should receive denial message
    const connections = Array.from(mockRoom.getConnections());
    const captainConn = connections.find((c) => c.id === "conn_1");

    expect(captainConn?.send).toHaveBeenCalledWith(
      expect.stringContaining("OFF_WITH_TONGUE_DENIED"),
    );
  });

  it("should prevent silenced player from claiming Captain in cabin search", async () => {
    // Setup cabin search state
    if (!server.lobbyState) throw new Error("lobbyState should be set");
    server.lobbyState.cabinSearchStatus = {
      initiatorId: "p1",
      claims: {},
      state: "SETUP",
    };

    const silencedConn = {
      id: "conn_3",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleClaimCabinSearchRole(
      {
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: "p3",
        role: "CAPTAIN",
      },
      silencedConn,
    );

    // Silenced player should receive error
    expect(silencedConn.send).toHaveBeenCalledWith(
      expect.stringContaining("ERROR"),
    );
    expect(silencedConn.send).toHaveBeenCalledWith(
      expect.stringContaining("errors.silencedCannotClaimCaptain"),
    );

    // Role should not be claimed
    expect(server.lobbyState?.cabinSearchStatus?.claims.p3).toBeUndefined();
  });
});
