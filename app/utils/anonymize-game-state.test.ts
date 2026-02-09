import { describe, expect, it } from "vitest";
import { anonymizeGameState } from "./anonymize-game-state";
import type { LobbyState } from "../types";

describe("anonymizeGameState", () => {
    const createMockLobby = (overrides: Partial<LobbyState> = {}): LobbyState => ({
        code: "TEST123",
        status: "PLAYING",
        players: [
            {
                id: "player-uuid-123",
                name: "John Doe",
                photoUrl: "https://example.com/john.jpg",
                isHost: true,
                isReady: true,
                isOnline: true,
                isEliminated: false,
                isUnconvertible: false,
                notRole: null,
                hasTongue: true,
                joinedAt: 1234567890,
            },
            {
                id: "player-uuid-456",
                name: "Jane Smith",
                photoUrl: "https://example.com/jane.jpg",
                isHost: false,
                isReady: true,
                isOnline: true,
                isEliminated: false,
                isUnconvertible: false,
                notRole: "SAILOR",
                hasTongue: true,
                joinedAt: 1234567891,
            },
        ],
        roleDistributionMode: "automatic",
        ...overrides,
    });

    it("should anonymize player names and IDs correctly", () => {
        const lobby = createMockLobby();
        const result = anonymizeGameState(lobby);

        expect(result).not.toBeNull();
        expect(result!.players).toHaveLength(2);
        expect(result!.players[0].pseudonym).toBe("Player 1");
        expect(result!.players[1].pseudonym).toBe("Player 2");
    });

    it("should NOT include player ids, names, or photo URLs in the result", () => {
        const lobby = createMockLobby();
        const result = anonymizeGameState(lobby);
        const resultStr = JSON.stringify(result);

        // Should not contain the actual player data
        expect(resultStr).not.toContain("player-uuid-123");
        expect(resultStr).not.toContain("player-uuid-456");
        expect(resultStr).not.toContain("John Doe");
        expect(resultStr).not.toContain("Jane Smith");
        expect(resultStr).not.toContain("https://example.com/john.jpg");
        expect(resultStr).not.toContain("https://example.com/jane.jpg");
    });

    it("should preserve functional game state data", () => {
        const lobby = createMockLobby({
            isFloggingUsed: true,
            conversionCount: 3,
            captainId: "player-uuid-123",
        });
        const result = anonymizeGameState(lobby);

        expect(result!.code).toBe("TEST123");
        expect(result!.status).toBe("PLAYING");
        expect(result!.roleDistributionMode).toBe("automatic");
        expect(result!.isFloggingUsed).toBe(true);
        expect(result!.conversionCount).toBe(3);
    });

    it("should anonymize captain ID to pseudonym", () => {
        const lobby = createMockLobby({
            captainId: "player-uuid-123",
        });
        const result = anonymizeGameState(lobby);

        expect(result!.captainPseudonym).toBe("Player 1");
    });

    it("should preserve player state flags", () => {
        const lobby = createMockLobby();
        lobby.players[0].isEliminated = true;
        lobby.players[1].hasTongue = false;

        const result = anonymizeGameState(lobby);

        expect(result!.players[0].isHost).toBe(true);
        expect(result!.players[0].isEliminated).toBe(true);
        expect(result!.players[1].hasTongue).toBe(false);
        expect(result!.players[1].notRole).toBe("SAILOR");
    });

    it("should return null for null/undefined input", () => {
        // @ts-expect-error - Testing runtime behavior
        expect(anonymizeGameState(null)).toBeNull();
        // @ts-expect-error - Testing runtime behavior
        expect(anonymizeGameState(undefined)).toBeNull();
    });

    it("should include status state names without detailed objects", () => {
        const lobby = createMockLobby({
            conversionStatus: {
                initiatorId: "player-uuid-123",
                responses: { "player-uuid-123": true },
                state: "ACTIVE",
            },
        });
        const result = anonymizeGameState(lobby);
        const resultStr = JSON.stringify(result);

        expect(result!.conversionState).toBe("ACTIVE");
        // Should not leak initiator ID
        expect(resultStr).not.toContain("player-uuid-123");
    });
});
