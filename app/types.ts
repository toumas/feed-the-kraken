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
};

export type LobbyState = {
  code: string;
  players: Player[];
  status: "WAITING" | "PLAYING";
  assignments?: Record<string, Role>;
  isFloggingUsed?: boolean;
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
  | { type: "FLOGGING_DENIED"; targetPlayerId: string };

// --- Constants ---
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 11;

export type Role = "SAILOR" | "PIRATE" | "CULT_LEADER" | "CULTIST";
