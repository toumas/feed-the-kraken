// --- Types ---
export type ViewState = "HOME" | "JOIN" | "LOBBY" | "GAME";

export type Player = {
  id: string;
  name: string;
  photoUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
};

export type LobbyState = {
  code: string;
  players: Player[];
  status: "WAITING" | "PLAYING";
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
  | { type: "START_GAME"; playerId: string };

// --- Constants ---
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 11;
