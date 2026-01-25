/**
 * XState V5 Game Machine Type Contracts
 *
 * This file defines the TypeScript types for the XState game machine.
 * These types ensure type-safety across the server and define the
 * contract for machine context, events, and snapshots.
 */

// =============================================================================
// Core Role Types
// =============================================================================

export type Role = "SAILOR" | "PIRATE" | "CULT_LEADER" | "CULTIST";
export type CabinRole = "CAPTAIN" | "NAVIGATOR" | "LIEUTENANT" | "CREW";

// =============================================================================
// Player Entity
// =============================================================================

export interface Player {
  id: string;
  name: string;
  photoUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  isOnline: boolean;
  isEliminated: boolean;
  isUnconvertible: boolean;
  notRole: Role | null;
  joinedAt: number;
  hasTongue: boolean;
}

// =============================================================================
// Status Types (Sub-flows)
// =============================================================================

export interface RoleSelectionStatus {
  state: "SELECTING" | "COMPLETED" | "CANCELLED";
  availableRoles: Role[];
  selections: Record<string, { role: Role; confirmed: boolean }>;
  cancellationReason?: string;
}

export interface ConversionStatus {
  initiatorId: string;
  responses: Record<string, boolean>;
  state: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  cancellationReason?: string;
  round?: ConversionRound;
}

export interface ConversionRound {
  startTime: number;
  duration: number;
  endTime: number; // startTime + duration for client-side timer sync
  playerQuestions: Record<string, number>;
  leaderChoice: string | null;
  playerAnswers: Record<string, string>;
  result?: {
    convertedPlayerId: string | null;
    correctAnswers: string[];
  };
}

// Captain's Cabin Search - role reveal action
export interface CaptainCabinSearchStatus {
  searcherId: string;
  targetPlayerId: string;
  state: "PENDING" | "COMPLETED" | "CANCELLED";
  result?: {
    role: Role;
    originalRole?: Role;
  };
}

// Cult Cabin Search - quiz-based team action
export interface CabinSearchStatus {
  initiatorId: string;
  claims: Record<string, CabinRole>;
  state: "SETUP" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  cancellationReason?: string;
  startTime?: number;
  endTime?: number; // startTime + 30000 for client-side timer sync
  playerQuestions?: Record<string, number>;
  playerAnswers?: Record<string, string>;
  result?: { correctAnswers: string[] };
}

export interface GunsStashStatus {
  initiatorId: string;
  state: "WAITING_FOR_PLAYERS" | "DISTRIBUTION" | "COMPLETED" | "CANCELLED";
  readyPlayers: string[];
  startTime?: number;
  endTime?: number; // startTime + 30000 for client-side timer sync
  distribution?: Record<string, number>;
  playerQuestions?: Record<string, number>;
  playerAnswers?: Record<string, string>;
  results?: { correctAnswers: string[] };
  cancellationReason?: string;
}

export interface FeedTheKrakenResult {
  targetPlayerId: string;
  cultVictory: boolean;
}

export interface InitialGameState {
  assignments: Record<string, Role>;
  originalRoles: Record<string, Role>;
  players: Array<{
    id: string;
    isEliminated: boolean;
    isUnconvertible: boolean;
    notRole: Role | null;
  }>;
}

// =============================================================================
// XState Machine Context
// =============================================================================

export interface FloggingStatus {
  initiatorId: string;
  targetPlayerId: string;
  state: "PENDING" | "COMPLETED" | "CANCELLED";
  result?: { notRole: Role };
}

export interface FeedTheKrakenStatus {
  initiatorId: string;
  targetPlayerId: string;
  state: "PENDING" | "COMPLETED" | "CANCELLED";
  result?: {
    targetPlayerId: string;
    cultVictory: boolean;
  };
}

export interface GameContext {
  code: string;
  players: Player[];
  roleDistributionMode: "automatic" | "manual";
  roleSelectionStatus?: RoleSelectionStatus;
  assignments?: Record<string, Role>;
  originalRoles?: Record<string, Role>;
  isFloggingUsed: boolean;
  isGunsStashUsed: boolean;
  isCultCabinSearchUsed: boolean;
  isOffWithTongueUsed: boolean;

  conversionCount: number;
  feedTheKrakenCount: number;
  cabinSearchCount: number;
  convertedPlayerIds: string[]; // All players who have been successfully converted (including original Cultists)
  conversionStatus?: ConversionStatus;
  captainCabinSearchStatus?: CaptainCabinSearchStatus;
  cabinSearchStatus?: CabinSearchStatus;
  gunsStashStatus?: GunsStashStatus;
  floggingStatus?: FloggingStatus;
  offWithTongueStatus?: {
    initiatorId: string;
    targetPlayerId: string;
    state: "PENDING" | "COMPLETED" | "CANCELLED";
    result?: { outcome: "SILENCED" };
  };
  feedTheKrakenStatus?: FeedTheKrakenStatus;
  captainId?: string;
  initialGameState?: InitialGameState;
}

// =============================================================================
// XState Events
// =============================================================================

// Lobby events
export type CreateLobbyEvent = {
  type: "CREATE_LOBBY";
  playerId: string;
  playerName: string;
  playerPhoto: string | null;
  code: string; // Room code from server
};

export type JoinLobbyEvent = {
  type: "JOIN_LOBBY";
  playerId: string;
  playerName: string;
  playerPhoto: string | null;
};

export type UpdateProfileEvent = {
  type: "UPDATE_PROFILE";
  playerId: string;
  name: string;
  photoUrl: string | null;
};

export type LeaveLobbyEvent = { type: "LEAVE_LOBBY"; playerId: string };
export type KickPlayerEvent = {
  type: "KICK_PLAYER";
  playerId: string; // Host performing the kick
  targetPlayerId: string; // Player being kicked
};
export type AddBotEvent = { type: "ADD_BOT" };
export type SetRoleDistributionModeEvent = {
  type: "SET_ROLE_DISTRIBUTION_MODE";
  mode: "automatic" | "manual";
};

// Game start events
export type StartGameEvent = { type: "START_GAME"; playerId: string };
export type SelectRoleEvent = {
  type: "SELECT_ROLE";
  playerId: string;
  role: Role;
};
export type ConfirmRoleEvent = { type: "CONFIRM_ROLE"; playerId: string };
export type CancelRoleSelectionEvent = {
  type: "CANCEL_ROLE_SELECTION";
  playerId: string;
};

// Captain action events
export type DenialOfCommandEvent = {
  type: "DENIAL_OF_COMMAND";
  playerId: string;
};
export type CabinSearchRequestEvent = {
  type: "CABIN_SEARCH_REQUEST";
  playerId: string;
  targetPlayerId: string;
};
export type CabinSearchResponseEvent = {
  type: "CABIN_SEARCH_RESPONSE";
  searcherId: string;
  confirmed: boolean;
};
export type FloggingRequestEvent = {
  type: "FLOGGING_REQUEST";
  targetPlayerId: string;
};
export type FloggingConfirmationResponseEvent = {
  type: "FLOGGING_CONFIRMATION_RESPONSE";
  hostId: string;
  confirmed: boolean;
};

// Conversion events
export type StartConversionEvent = {
  type: "START_CONVERSION";
  initiatorId: string;
};
export type RespondConversionEvent = {
  type: "RESPOND_CONVERSION";
  playerId: string;
  accept: boolean;
};
export type SubmitConversionActionEvent = {
  type: "SUBMIT_CONVERSION_ACTION";
  playerId: string;
  action: "PICK_PLAYER" | "ANSWER_QUIZ";
  targetId?: string;
  answer?: string;
};

// Cult cabin search events
export type StartCultCabinSearchEvent = {
  type: "START_CULT_CABIN_SEARCH";
  initiatorId: string;
};
export type ClaimCultCabinSearchRoleEvent = {
  type: "CLAIM_CULT_CABIN_SEARCH_ROLE";
  playerId: string;
  role: CabinRole;
};
export type CancelCultCabinSearchEvent = {
  type: "CANCEL_CULT_CABIN_SEARCH";
  playerId: string;
};
export type SubmitCultCabinSearchActionEvent = {
  type: "SUBMIT_CULT_CABIN_SEARCH_ACTION";
  playerId: string;
  answer: string;
};

// Guns stash events
export type StartCultGunsStashEvent = {
  type: "START_CULT_GUNS_STASH";
  initiatorId: string;
};
export type ConfirmCultGunsStashReadyEvent = {
  type: "CONFIRM_CULT_GUNS_STASH_READY";
  playerId: string;
};
export type SubmitCultGunsStashDistributionEvent = {
  type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION";
  playerId: string;
  distribution: Record<string, number>;
};
export type SubmitCultGunsStashActionEvent = {
  type: "SUBMIT_CULT_GUNS_STASH_ACTION";
  playerId: string;
  answer: string;
};
export type CancelCultGunsStashEvent = {
  type: "CANCEL_CULT_GUNS_STASH";
  playerId: string;
};

// Feed the kraken events
export type FeedTheKrakenRequestEvent = {
  type: "FEED_THE_KRAKEN_REQUEST";
  playerId: string;
  targetPlayerId: string;
};
export type FeedTheKrakenResponseEvent = {
  type: "FEED_THE_KRAKEN_RESPONSE";
  captainId: string;
  confirmed: boolean;
};

// Off with tongue events
export type OffWithTongueRequestEvent = {
  type: "OFF_WITH_TONGUE_REQUEST";
  playerId: string;
  targetPlayerId: string;
};
export type OffWithTongueResponseEvent = {
  type: "OFF_WITH_TONGUE_RESPONSE";
  captainId: string;
  confirmed: boolean;
};

// Game management events
export type ResetGameEvent = { type: "RESET_GAME" };
export type BackToLobbyEvent = { type: "BACK_TO_LOBBY"; playerId: string };

// Internal events
export type PlayerDisconnectedEvent = {
  type: "PLAYER_DISCONNECTED";
  playerId: string;
};
export type PlayerReconnectedEvent = {
  type: "PLAYER_RECONNECTED";
  playerId: string;
};

// Union type of all events
export type GameEvent =
  | CreateLobbyEvent
  | JoinLobbyEvent
  | UpdateProfileEvent
  | LeaveLobbyEvent
  | KickPlayerEvent
  | AddBotEvent
  | SetRoleDistributionModeEvent
  | StartGameEvent
  | SelectRoleEvent
  | ConfirmRoleEvent
  | CancelRoleSelectionEvent
  | DenialOfCommandEvent
  | CabinSearchRequestEvent
  | CabinSearchResponseEvent
  | FloggingRequestEvent
  | FloggingConfirmationResponseEvent
  | StartConversionEvent
  | RespondConversionEvent
  | SubmitConversionActionEvent
  | StartCultCabinSearchEvent
  | ClaimCultCabinSearchRoleEvent
  | CancelCultCabinSearchEvent
  | SubmitCultCabinSearchActionEvent
  | StartCultGunsStashEvent
  | ConfirmCultGunsStashReadyEvent
  | SubmitCultGunsStashDistributionEvent
  | SubmitCultGunsStashActionEvent
  | CancelCultGunsStashEvent
  | FeedTheKrakenRequestEvent
  | FeedTheKrakenResponseEvent
  | OffWithTongueRequestEvent
  | OffWithTongueResponseEvent
  | ResetGameEvent
  | BackToLobbyEvent
  | PlayerDisconnectedEvent
  | PlayerReconnectedEvent;

// =============================================================================
// State Value Types
// =============================================================================

export type LobbyStateValue = "empty" | "waiting";

export type PlayingActionStateValue =
  | "idle"
  | "roleSelection"
  | "conversion"
  | "cabinSearchAction"
  | "floggingAction"
  | "cultCabinSearch"
  | "gunsStash"
  | "feedTheKraken"
  | "offWithTongue";

export type GameStateValue =
  | { lobby: LobbyStateValue }
  | { playing: PlayingActionStateValue }
  | "finished";

// =============================================================================
// Snapshot Type (for persistence and client sync)
// =============================================================================

export interface GameSnapshot {
  value: GameStateValue;
  context: GameContext;
  // Additional XState snapshot fields will be present but these are the key ones
}

// =============================================================================
// WebSocket Message Types (Server → Client)
// =============================================================================

export type ServerMessage =
  | { type: "LOBBY_UPDATE"; snapshot: GameSnapshot }
  | { type: "GAME_STARTED"; snapshot: GameSnapshot }
  | { type: "STATE_UPDATE"; snapshot: GameSnapshot }
  | { type: "ERROR"; message: string };
