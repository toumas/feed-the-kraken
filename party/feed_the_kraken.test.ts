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

describe("Feed the Kraken Server Logic", () => {
  let server: Server;
  let mockLobbyState: LobbyState;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new Server(mockRoom);

    // Setup mock connections map
    server.connectionToPlayer = new Map([
      ["conn_1", "p1"], // Captain
      ["conn_2", "p2"], // Target Sailor
      ["conn_3", "p3"], // Target Cult Leader
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
          name: "Cult Leader",
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
      ],
      assignments: {
        p1: "PIRATE",
        p2: "SAILOR",
        p3: "CULT_LEADER",
      },
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

  it("should allow Captain to request feeding a player", async () => {
    const captainConn = {
      id: "conn_1",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleFeedTheKrakenRequest(
      { type: "FEED_THE_KRAKEN_REQUEST", targetPlayerId: "p2" },
      captainConn,
    );

    // Should verify that the target player receives the prompt
    const connections = Array.from(mockRoom.getConnections());
    const targetConn = connections.find((c) => c.id === "conn_2");

    expect(targetConn?.send).toHaveBeenCalledWith(
      expect.stringContaining("FEED_THE_KRAKEN_PROMPT"),
    );
    expect(targetConn?.send).toHaveBeenCalledWith(
      expect.stringContaining('"captainName":"Captain"'),
    );
  });

  it("should prevent Captain from feeding themselves", async () => {
    const captainConn = {
      id: "conn_1",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleFeedTheKrakenRequest(
      { type: "FEED_THE_KRAKEN_REQUEST", targetPlayerId: "p1" },
      captainConn,
    );

    expect(captainConn.send).toHaveBeenCalledWith(
      expect.stringContaining("ERROR"),
    );
    expect(captainConn.send).toHaveBeenCalledWith(
      expect.stringContaining("cannot feed themselves"),
    );
  });

  it("should eliminate player when they accept", async () => {
    // Target (p2) accepts
    const targetConn = {
      id: "conn_2",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleFeedTheKrakenResponse(
      {
        type: "FEED_THE_KRAKEN_RESPONSE",
        captainId: "p1",
        confirmed: true,
      },
      targetConn,
    );

    // Player should be eliminated
    expect(server.lobbyState?.players[1].isEliminated).toBe(true);

    // Result should be set (no cult victory)
    expect(server.lobbyState?.feedTheKrakenResult).toEqual({
      targetPlayerId: "p2",
      cultVictory: false,
    });

    // Should broadcast lobby update
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining("LOBBY_UPDATE"),
    );

    // Should broadcast result prompt to everyone
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining("FEED_THE_KRAKEN_RESULT"),
    );
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining('"cultVictory":false'),
    );
  });

  it("should trigger Cult Victory when Cult Leader is fed", async () => {
    // Cult Leader (p3) accepts
    const targetConn = {
      id: "conn_3",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleFeedTheKrakenResponse(
      {
        type: "FEED_THE_KRAKEN_RESPONSE",
        captainId: "p1",
        confirmed: true,
      },
      targetConn,
    );

    // Player should be eliminated
    expect(server.lobbyState?.players[2].isEliminated).toBe(true);

    // Result should show cult victory
    expect(server.lobbyState?.feedTheKrakenResult).toEqual({
      targetPlayerId: "p3",
      cultVictory: true,
    });

    // Should broadcast result prompt to everyone
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining("FEED_THE_KRAKEN_RESULT"),
    );
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining('"cultVictory":true'),
    );
  });

  it("should notify Captain when player denies", async () => {
    // Target (p2) denies
    const targetConn = {
      id: "conn_2",
      send: vi.fn(),
    } as unknown as Party.Connection;

    await server.handleFeedTheKrakenResponse(
      {
        type: "FEED_THE_KRAKEN_RESPONSE",
        captainId: "p1",
        confirmed: false,
      },
      targetConn,
    );

    // Player should NOT be eliminated
    expect(server.lobbyState?.players[1].isEliminated).toBe(false);

    // Captain should receive denial message
    const connections = Array.from(mockRoom.getConnections());
    const captainConn = connections.find((c) => c.id === "conn_1");

    expect(captainConn?.send).toHaveBeenCalledWith(
      expect.stringContaining("FEED_THE_KRAKEN_DENIED"),
    );
  });
});
