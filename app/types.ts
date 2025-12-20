// --- Types ---
export type ViewState = "HOME" | "JOIN" | "LOBBY" | "GAME" | "PROFILE_SETUP";

export type Player = {
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
  hasTongue: boolean; // true by default, false when silenced by "off with the tongue" action
};

export type LobbyState = {
  code: string;
  players: Player[];
  status: "WAITING" | "PLAYING";
  roleDistributionMode?: "automatic" | "manual"; // Defaults to "automatic"
  roleSelectionStatus?: {
    state: "SELECTING" | "COMPLETED" | "CANCELLED";
    availableRoles: Role[]; // Pool of roles remaining to pick from
    selections: Record<string, { role: Role; confirmed: boolean }>;
    cancellationReason?: string;
  };
  assignments?: Record<string, Role>;
  originalRoles?: Record<string, Role>;
  isFloggingUsed?: boolean;
  conversionCount?: number;
  conversionStatus?: {
    initiatorId: string;
    responses: Record<string, boolean>;
    state: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
    round?: {
      startTime: number;
      duration: number;
      playerQuestions: Record<string, number>; // playerId -> questionIndex
      leaderChoice: string | null;
      playerAnswers: Record<string, string>; // playerId -> answer
      result?: {
        convertedPlayerId: string | null;
        correctAnswers: string[]; // list of playerIds
      };
    };
  };
  cabinSearchStatus?: {
    initiatorId: string;
    claims: Record<string, "CAPTAIN" | "NAVIGATOR" | "LIEUTENANT" | "CREW">;
    state: "SETUP" | "ACTIVE" | "COMPLETED" | "CANCELLED";
    cancellationReason?: string;
    startTime?: number; // For the 15m timer
    playerQuestions?: Record<string, number>; // playerId -> questionIndex
    playerAnswers?: Record<string, string>; // playerId -> answer
    result?: {
      correctAnswers: string[]; // list of playerIds
    };
  };
  gunsStashStatus?: {
    initiatorId: string;
    state: "WAITING_FOR_PLAYERS" | "DISTRIBUTION" | "COMPLETED" | "CANCELLED";
    readyPlayers: string[]; // List of playerIds who have Pressed "Ready"
    startTime?: number; // For the timer during distribution
    distribution?: Record<string, number>; // playerId -> number of guns given
    playerQuestions?: Record<string, number>; // playerId -> questionIndex
    playerAnswers?: Record<string, string>; // playerId -> answer
    results?: {
      correctAnswers: string[]; // list of playerIds
    };
    cancellationReason?: string;
  };
  feedTheKrakenResult?: {
    targetPlayerId: string;
    cultVictory: boolean;
  };
};

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type MessagePayload =
  | {
      type: "CREATE_LOBBY";
      playerId: string;
      playerName: string;
      playerPhoto: string | null;
    }
  | {
      type: "JOIN_LOBBY";
      playerId: string;
      playerName: string;
      playerPhoto: string | null;
    }
  | {
      type: "UPDATE_PROFILE";
      playerId: string;
      name: string;
      photoUrl: string | null;
    }
  | { type: "ADD_BOT" }
  | { type: "LEAVE_LOBBY"; playerId: string }
  | { type: "START_GAME"; playerId: string }
  | { type: "START_GAME"; playerId: string }
  | { type: "DENIAL_OF_COMMAND"; playerId: string }
  | { type: "CABIN_SEARCH_REQUEST"; targetPlayerId: string }
  | { type: "CABIN_SEARCH_PROMPT"; searcherId: string; searcherName: string }
  | { type: "CABIN_SEARCH_RESPONSE"; searcherId: string; confirmed: boolean }
  | { type: "CABIN_SEARCH_RESULT"; targetPlayerId: string; role: Role }
  | { type: "CABIN_SEARCH_RESULT"; targetPlayerId: string; role: Role }
  | { type: "CABIN_SEARCH_DENIED"; targetPlayerId: string }
  | { type: "FLOGGING_REQUEST"; targetPlayerId: string }
  | { type: "FLOGGING_CONFIRMATION_REQUEST"; hostId: string; hostName: string }
  | {
      type: "FLOGGING_CONFIRMATION_RESPONSE";
      hostId: string;
      confirmed: boolean;
    }
  | { type: "FLOGGING_PROMPT"; targetPlayerId: string; options: Role[] }
  | { type: "FLOGGING_REVEAL"; targetPlayerId: string; revealedRole: Role }
  | { type: "FLOGGING_REVEAL"; targetPlayerId: string; revealedRole: Role }
  | { type: "FLOGGING_DENIED"; targetPlayerId: string }
  | { type: "START_CONVERSION"; initiatorId: string }
  | { type: "RESPOND_CONVERSION"; playerId: string; accept: boolean }
  | {
      type: "SUBMIT_CONVERSION_ACTION";
      playerId: string;
      action: "PICK_PLAYER" | "ANSWER_QUIZ";
      targetId?: string;
      answer?: string;
    }
  | {
      type: "CONVERSION_UPDATE";
      status: LobbyState["conversionStatus"];
    }
  | { type: "CONVERSION_RESULT"; success: boolean }
  | { type: "START_CULT_CABIN_SEARCH"; initiatorId: string }
  | {
      type: "CLAIM_CULT_CABIN_SEARCH_ROLE";
      playerId: string;
      role: "CAPTAIN" | "NAVIGATOR" | "LIEUTENANT" | "CREW";
    }
  | {
      type: "SUBMIT_CULT_CABIN_SEARCH_ACTION";
      playerId: string;
      answer: string;
    }
  | { type: "CANCEL_CULT_CABIN_SEARCH"; playerId: string }
  | { type: "START_CULT_GUNS_STASH"; initiatorId: string }
  | { type: "CONFIRM_CULT_GUNS_STASH_READY"; playerId: string }
  | {
      type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION";
      playerId: string;
      distribution: Record<string, number>;
    }
  | { type: "CANCEL_CULT_GUNS_STASH"; playerId: string }
  | { type: "RESET_GAME" }
  | { type: "BACK_TO_LOBBY" }
  | { type: "FEED_THE_KRAKEN_REQUEST"; targetPlayerId: string }
  | {
      type: "FEED_THE_KRAKEN_PROMPT";
      captainId: string;
      captainName: string;
    }
  | {
      type: "FEED_THE_KRAKEN_RESPONSE";
      captainId: string;
      confirmed: boolean;
    }
  | { type: "FEED_THE_KRAKEN_DENIED"; targetPlayerId: string }
  | {
      type: "FEED_THE_KRAKEN_RESULT";
      targetPlayerId: string;
      cultVictory: boolean;
    }
  | { type: "OFF_WITH_TONGUE_REQUEST"; targetPlayerId: string }
  | {
      type: "OFF_WITH_TONGUE_PROMPT";
      captainId: string;
      captainName: string;
    }
  | {
      type: "OFF_WITH_TONGUE_RESPONSE";
      captainId: string;
      confirmed: boolean;
    }
  | { type: "OFF_WITH_TONGUE_RESULT"; targetPlayerId: string }
  | { type: "OFF_WITH_TONGUE_DENIED"; targetPlayerId: string }
  | { type: "SET_ROLE_DISTRIBUTION_MODE"; mode: "automatic" | "manual" }
  | { type: "SELECT_ROLE"; playerId: string; role: Role }
  | { type: "CONFIRM_ROLE"; playerId: string }
  | { type: "CANCEL_ROLE_SELECTION"; playerId: string };

// --- Constants ---
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 11;

export type Role = "SAILOR" | "PIRATE" | "CULT_LEADER" | "CULTIST";
