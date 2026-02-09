/**
 * Anonymizes game state data for GDPR compliance.
 *
 * This utility replaces player-identifying information (names, IDs, photo URLs)
 * with pseudonymized values like "Player 1", "Player 2", etc. while preserving
 * the game state structure for debugging purposes.
 */

import type { LobbyState, Player } from "../types";

export interface AnonymizedPlayer {
    pseudonym: string;
    isHost: boolean;
    isReady: boolean;
    isOnline: boolean;
    isEliminated: boolean;
    isUnconvertible: boolean;
    notRole: Player["notRole"];
    hasTongue: boolean;
}

export interface AnonymizedGameState {
    code: string;
    status: LobbyState["status"];
    players: AnonymizedPlayer[];
    roleDistributionMode?: LobbyState["roleDistributionMode"];
    isFloggingUsed?: boolean;
    isGunsStashUsed?: boolean;
    isCultCabinSearchUsed?: boolean;
    isOffWithTongueUsed?: boolean;
    conversionCount?: number;
    feedTheKrakenCount?: number;
    cabinSearchCount?: number;
    convertedPlayerCount?: number;
    // Anonymized status objects
    roleSelectionState?: string;
    conversionState?: string;
    captainCabinSearchState?: string;
    cabinSearchState?: string;
    gunsStashState?: string;
    floggingState?: string;
    offWithTongueState?: string;
    feedTheKrakenState?: string;
    captainPseudonym?: string;
}

/**
 * Anonymizes a lobby state for feedback submission.
 *
 * @param lobby - The lobby state to anonymize
 * @returns An anonymized version of the game state safe for external transmission
 */
export function anonymizeGameState(
    lobby: LobbyState,
): AnonymizedGameState | null {
    if (!lobby || !lobby.players) return null;

    // Create a mapping from player IDs to pseudonyms
    const playerIdToPseudonym = new Map<string, string>();
    lobby.players.forEach((player, index) => {
        playerIdToPseudonym.set(player.id, `Player ${index + 1}`);
    });

    // Helper to get pseudonym for a player ID
    const getPseudonym = (playerId: string | undefined): string | undefined => {
        if (!playerId) return undefined;
        return playerIdToPseudonym.get(playerId) || "Unknown Player";
    };

    // Anonymize players
    const anonymizedPlayers: AnonymizedPlayer[] = lobby.players.map(
        (player, index) => ({
            pseudonym: `Player ${index + 1}`,
            isHost: player.isHost,
            isReady: player.isReady,
            isOnline: player.isOnline,
            isEliminated: player.isEliminated,
            isUnconvertible: player.isUnconvertible,
            notRole: player.notRole,
            hasTongue: player.hasTongue,
        }),
    );

    return {
        code: lobby.code,
        status: lobby.status,
        players: anonymizedPlayers,
        roleDistributionMode: lobby.roleDistributionMode,
        isFloggingUsed: lobby.isFloggingUsed,
        isGunsStashUsed: lobby.isGunsStashUsed,
        isCultCabinSearchUsed: lobby.isCultCabinSearchUsed,
        isOffWithTongueUsed: lobby.isOffWithTongueUsed,
        conversionCount: lobby.conversionCount,
        feedTheKrakenCount: lobby.feedTheKrakenCount,
        cabinSearchCount: lobby.cabinSearchCount,
        convertedPlayerCount: lobby.convertedPlayerIds?.length,
        // Include state names only, not detailed status objects
        roleSelectionState: lobby.roleSelectionStatus?.state,
        conversionState: lobby.conversionStatus?.state,
        captainCabinSearchState: lobby.captainCabinSearchStatus?.state,
        cabinSearchState: lobby.cabinSearchStatus?.state,
        gunsStashState: lobby.gunsStashStatus?.state,
        floggingState: lobby.floggingStatus?.state,
        offWithTongueState: lobby.offWithTongueStatus?.state,
        feedTheKrakenState: lobby.feedTheKrakenStatus?.state,
        captainPseudonym: getPseudonym(lobby.captainId),
    };
}
