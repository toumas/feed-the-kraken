import type { LobbyState, Player, Role } from "../types";
import type { AnonymizedGameState, AnonymizedPlayer } from "./anonymize-game-state";

/**
 * Rehydrates an anonymized game state into a usable LobbyState for development/debugging.
 *
 * @param anonymizedState - The anonymized state to rehydrate
 * @returns A LobbyState that can be injected into the application
 */
export function rehydrateGameState(
    anonymizedState: AnonymizedGameState,
): LobbyState | null {
    if (!anonymizedState) return null;

    // Map pseudonyms to deterministic IDs
    const pseudonymToId = (pseudonym: string): string => {
        return `dev_${pseudonym.toLowerCase().replace(/\s+/g, "_")}`;
    };

    const rehydratedPlayers: Player[] = anonymizedState.players.map((p, index) => ({
        id: pseudonymToId(p.pseudonym),
        name: `Dev ${p.pseudonym}`,
        photoUrl: null, // We don't have these, use null
        isHost: p.isHost,
        isReady: p.isReady,
        isOnline: p.isOnline,
        isEliminated: p.isEliminated,
        isUnconvertible: p.isUnconvertible,
        notRole: p.notRole,
        hasTongue: p.hasTongue,
        joinedAt: Date.now() - (anonymizedState.players.length - index) * 1000,
    }));

    // Find captainId from pseudonym
    const captainId = anonymizedState.captainPseudonym
        ? pseudonymToId(anonymizedState.captainPseudonym)
        : undefined;

    // Construct status objects if state is provided
    // We only have the state names, so we reconstruct minimal valid status objects
    const conversionStatus = anonymizedState.conversionState
        ? {
            initiatorId: rehydratedPlayers[0]?.id || "unknown",
            responses: {},
            state: anonymizedState.conversionState as any,
        }
        : undefined;

    const roleSelectionStatus = anonymizedState.roleSelectionState
        ? {
            state: anonymizedState.roleSelectionState as any,
            availableRoles: [] as Role[],
            selections: {},
        }
        : undefined;

    return {
        code: anonymizedState.code || "DEV123",
        status: anonymizedState.status || "PLAYING",
        players: rehydratedPlayers,
        roleDistributionMode: anonymizedState.roleDistributionMode || "automatic",
        isFloggingUsed: anonymizedState.isFloggingUsed ?? false,
        isGunsStashUsed: anonymizedState.isGunsStashUsed ?? false,
        isCultCabinSearchUsed: anonymizedState.isCultCabinSearchUsed ?? false,
        isOffWithTongueUsed: anonymizedState.isOffWithTongueUsed ?? false,
        conversionCount: anonymizedState.conversionCount ?? 0,
        feedTheKrakenCount: anonymizedState.feedTheKrakenCount ?? 0,
        cabinSearchCount: anonymizedState.cabinSearchCount ?? 0,
        convertedPlayerIds: anonymizedState.convertedPlayerCount
            ? Array.from({ length: anonymizedState.convertedPlayerCount }, (_, i) => rehydratedPlayers[i]?.id || "unknown")
            : [],

        // Rehydrated statuses
        conversionStatus,
        roleSelectionStatus,

        // We don't have full details for these, but can provide skeleton if state is known
        captainCabinSearchStatus: anonymizedState.captainCabinSearchState
            ? { searcherId: "unknown", targetPlayerId: "unknown", state: anonymizedState.captainCabinSearchState as any }
            : undefined,
        cabinSearchStatus: anonymizedState.cabinSearchState
            ? { initiatorId: "unknown", claims: {}, state: anonymizedState.cabinSearchState as any }
            : undefined,
        gunsStashStatus: anonymizedState.gunsStashState
            ? { initiatorId: "unknown", state: anonymizedState.gunsStashState as any, readyPlayers: [] }
            : undefined,
        floggingStatus: anonymizedState.floggingState
            ? { initiatorId: "unknown", targetPlayerId: "unknown", state: anonymizedState.floggingState as any }
            : undefined,
        offWithTongueStatus: anonymizedState.offWithTongueState
            ? { initiatorId: "unknown", targetPlayerId: "unknown", state: anonymizedState.offWithTongueState as any }
            : undefined,
        feedTheKrakenStatus: anonymizedState.feedTheKrakenState
            ? { initiatorId: "unknown", targetPlayerId: "unknown", state: anonymizedState.feedTheKrakenState as any }
            : undefined,

        captainId,
    };
}
