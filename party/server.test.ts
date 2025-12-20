import type * as Party from "partykit/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
} as unknown as Party.Room;

const mockConnection = {
  id: "conn_1",
  send: vi.fn(),
} as unknown as Party.Connection;

describe("Server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle DENIAL_OF_COMMAND", async () => {
    const server = new Server(mockRoom);

    // Setup initial state
    server.lobbyState = {
      code: "TEST",
      players: [
        {
          id: "player_1",
          name: "Player 1",
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
      ],
      status: "PLAYING",
    };

    // Execute action
    await server.handleDenialOfCommand(
      { type: "DENIAL_OF_COMMAND", playerId: "player_1" },
      mockConnection,
    );

    // Verify state change
    expect(server.lobbyState?.players[0].isEliminated).toBe(true);

    // Verify broadcast
    expect(mockRoom.broadcast).toHaveBeenCalledWith(
      expect.stringContaining('"isEliminated":true'),
    );

    // Verify storage update
    expect(mockStorage.put).toHaveBeenCalledWith("lobby", server.lobbyState);
  });

  it("should ignore DENIAL_OF_COMMAND if player not found", async () => {
    const server = new Server(mockRoom);
    server.lobbyState = {
      code: "TEST",
      players: [],
      status: "PLAYING",
    };

    await server.handleDenialOfCommand(
      { type: "DENIAL_OF_COMMAND", playerId: "unknown" },
      mockConnection,
    );

    expect(mockRoom.broadcast).not.toHaveBeenCalled();
  });
});
