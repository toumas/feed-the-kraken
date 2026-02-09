import { describe, expect, it } from "vitest";
import { rehydrateGameState } from "./rehydrate-game-state";
import type { AnonymizedGameState } from "./anonymize-game-state";

describe("rehydrateGameState", () => {
    const sampleAnonymizedState: AnonymizedGameState = {
        code: "TEST123",
        status: "PLAYING",
        players: [
            {
                pseudonym: "Player 1",
                isHost: true,
                isReady: true,
                isOnline: true,
                isEliminated: false,
                isUnconvertible: false,
                notRole: null,
                hasTongue: true,
            },
            {
                pseudonym: "Player 2",
                isHost: false,
                isReady: true,
                isOnline: true,
                isEliminated: false,
                isUnconvertible: false,
                notRole: "SAILOR" as any,
                hasTongue: true,
            },
        ],
        roleDistributionMode: "automatic",
        isFloggingUsed: false,
        conversionCount: 2,
        captainPseudonym: "Player 1",
        conversionState: "ACTIVE",
    };

    it("should rehydrate anonymized state back to LobbyState", () => {
        const result = rehydrateGameState(sampleAnonymizedState);

        expect(result).not.toBeNull();
        expect(result!.code).toBe("TEST123");
        expect(result!.players).toHaveLength(2);
        expect(result!.players[0].id).toBe("dev_player_1");
        expect(result!.players[0].name).toBe("Dev Player 1");
        expect(result!.players[1].id).toBe("dev_player_2");
        expect(result!.players[1].name).toBe("Dev Player 2");
    });

    it("should map captain pseudonym to deterministic ID", () => {
        const result = rehydrateGameState(sampleAnonymizedState);
        expect(result!.captainId).toBe("dev_player_1");
    });

    it("should reconstruct minimal status objects", () => {
        const result = rehydrateGameState(sampleAnonymizedState);
        expect(result!.conversionStatus).toBeDefined();
        expect(result!.conversionStatus!.state).toBe("ACTIVE");
        expect(result!.conversionStatus!.initiatorId).toBe("dev_player_1");
    });

    it("should handle missing optional fields with defaults", () => {
        const minimalState: AnonymizedGameState = {
            code: "MIN123",
            status: "WAITING",
            players: [
                {
                    pseudonym: "Player 1",
                    isHost: true,
                    isReady: true,
                    isOnline: true,
                    isEliminated: false,
                    isUnconvertible: false,
                    notRole: null,
                    hasTongue: true,
                }
            ]
        };

        const result = rehydrateGameState(minimalState);
        expect(result!.isFloggingUsed).toBe(false);
        expect(result!.conversionCount).toBe(0);
        expect(result!.roleDistributionMode).toBe("automatic");
    });

    it("should return null for null input", () => {
        // @ts-expect-error - testing runtime behavior
        expect(rehydrateGameState(null)).toBeNull();
    });
});
