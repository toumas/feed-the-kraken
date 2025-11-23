import type * as Party from "partykit/server";

export type Player = {
  id: string;
  name: string;
  photoUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  isOnline: boolean;
  isEliminated: boolean;
  isUnconvertible: boolean;
  joinedAt: number;
};

export type LobbyState = {
  code: string;
  players: Player[];
  status: "WAITING" | "PLAYING";
  assignments?: Record<string, Role>;
};

type CreateLobbyMessage = {
  type: "CREATE_LOBBY";
  playerId: string;
  playerName: string;
  playerPhoto: string | null;
};

type JoinLobbyMessage = {
  type: "JOIN_LOBBY";
  playerId: string;
  playerName: string;
  playerPhoto: string | null;
};

type UpdateProfileMessage = {
  type: "UPDATE_PROFILE";
  playerId: string;
  name: string;
  photoUrl: string | null;
};

type LeaveLobbyMessage = {
  type: "LEAVE_LOBBY";
  playerId: string;
};

type StartGameMessage = {
  type: "START_GAME";
  playerId: string;
};

type AddBotMessage = {
  type: "ADD_BOT";
};

type DenialOfCommandMessage = {
  type: "DENIAL_OF_COMMAND";
  playerId: string;
};

type CabinSearchRequestMessage = {
  type: "CABIN_SEARCH_REQUEST";
  targetPlayerId: string;
};

type CabinSearchResponseMessage = {
  type: "CABIN_SEARCH_RESPONSE";
  searcherId: string;
  confirmed: boolean;
};

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // Store lobby state in durable storage
  lobbyState: LobbyState | null = null;

  async onStart() {
    // Load lobby state from storage if it exists
    const stored = await this.room.storage.get<LobbyState>("lobby");
    if (stored) {
      this.lobbyState = stored;
    }
  }

  async onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
    // Send current lobby state to new connection
    if (this.lobbyState) {
      conn.send(
        JSON.stringify({
          type: "LOBBY_UPDATE",
          lobby: this.lobbyState,
        }),
      );
    }
  }

  async onClose(conn: Party.Connection) {
    if (!this.lobbyState) return;

    const playerId = this.connectionToPlayer.get(conn.id);
    if (!playerId) return;

    this.connectionToPlayer.delete(conn.id);

    const player = this.lobbyState.players.find((p) => p.id === playerId);
    if (!player) return;

    player.isOnline = false;
    this.broadcastLobbyUpdate();
  }

  // Map connection ID to player ID
  connectionToPlayer = new Map<string, string>();

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "CREATE_LOBBY":
          await this.handleCreateLobby(data, sender);
          break;
        case "JOIN_LOBBY":
          await this.handleJoinLobby(data, sender);
          break;
        case "UPDATE_PROFILE":
          await this.handleUpdateProfile(data, sender);
          break;
        case "LEAVE_LOBBY":
          await this.handleLeaveLobby(data, sender);
          break;
        case "START_GAME":
          await this.handleStartGame(data, sender);
          break;
        case "ADD_BOT":
          await this.handleAddBot(data, sender);
          break;
        case "DENIAL_OF_COMMAND":
          await this.handleDenialOfCommand(data, sender);
          break;
        case "CABIN_SEARCH_REQUEST":
          await this.handleCabinSearchRequest(data, sender);
          break;
        case "CABIN_SEARCH_RESPONSE":
          await this.handleCabinSearchResponse(data, sender);
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  async handleCreateLobby(data: CreateLobbyMessage, sender: Party.Connection) {
    if (this.lobbyState) {
      // Lobby already exists
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "Lobby already exists",
        }),
      );
      return;
    }

    const { playerId, playerName, playerPhoto } = data;
    const code = this.room.id.toUpperCase();

    this.lobbyState = {
      code,
      players: [
        {
          id: playerId,
          name: playerName,
          photoUrl: playerPhoto,
          isHost: true,
          isReady: false,
          isOnline: true,
          isEliminated: false,
          isUnconvertible: false,
          joinedAt: Date.now(),
        },
      ],
      status: "WAITING",
    };

    this.connectionToPlayer.set(sender.id, playerId);
    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleJoinLobby(data: JoinLobbyMessage, sender: Party.Connection) {
    if (!this.lobbyState) {
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "Lobby not found",
        }),
      );
      return;
    }

    const { playerId, playerName, playerPhoto } = data;

    // Check if player already exists
    const existingPlayer = this.lobbyState.players.find(
      (p) => p.id === playerId,
    );
    if (existingPlayer) {
      // Player is rejoining, just update their info
      existingPlayer.name = playerName;
      existingPlayer.photoUrl = playerPhoto;
      existingPlayer.isOnline = true;

      this.connectionToPlayer.set(sender.id, playerId);
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
      return;
    }

    // New player joining
    if (this.lobbyState.players.length >= 11) {
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "Lobby is full",
        }),
      );
      return;
    }

    this.lobbyState.players.push({
      id: playerId,
      name: playerName,
      photoUrl: playerPhoto,
      isHost: false,
      isReady: false,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      joinedAt: Date.now(),
    });

    this.connectionToPlayer.set(sender.id, playerId);

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleUpdateProfile(
    data: UpdateProfileMessage,
    _sender: Party.Connection,
  ) {
    if (!this.lobbyState) return;

    const { playerId, name, photoUrl } = data;
    const player = this.lobbyState.players.find((p) => p.id === playerId);
    if (player) {
      player.name = name;
      player.photoUrl = photoUrl;
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
  }

  async handleLeaveLobby(data: LeaveLobbyMessage, _sender: Party.Connection) {
    if (!this.lobbyState) return;

    const { playerId } = data;
    this.lobbyState.players = this.lobbyState.players.filter(
      (p) => p.id !== playerId,
    );

    // If no players left, delete the lobby
    if (this.lobbyState.players.length === 0) {
      this.lobbyState = null;
      await this.room.storage.delete("lobby");
      return;
    }

    // If host left, assign new host
    if (!this.lobbyState.players.some((p) => p.isHost)) {
      this.lobbyState.players[0].isHost = true;
    }
    await this.saveLobbyState();
    this.broadcastLobbyUpdate();

    // Also remove from connection map
    // We might not know the connection ID here if it came from a different connection (unlikely but possible)
    // But usually sender is the one leaving.
    // We'll clean up in onClose anyway.
  }

  async handleStartGame(data: StartGameMessage, _sender: Party.Connection) {
    if (!this.lobbyState) return;

    const { playerId } = data;
    const player = this.lobbyState.players.find((p) => p.id === playerId);

    if (!player?.isHost || this.lobbyState.players.length < 5) return;

    // 1. Determine roles based on player count
    const playerCount = this.lobbyState.players.length;
    const roles = getRolesForPlayerCount(playerCount);

    // 2. Shuffle roles
    const shuffledRoles = roles.sort(() => Math.random() - 0.5);

    // 3. Assign roles to players map for easy lookup (optional, but good for server authority if we wanted to store it)
    const assignments: Record<string, Role> = {};
    this.lobbyState.players.forEach((p, index) => {
      assignments[p.id] = shuffledRoles[index];
    });

    this.lobbyState.status = "PLAYING";
    this.lobbyState.assignments = assignments;
    await this.saveLobbyState();

    // Broadcast the start with assignments
    this.room.broadcast(
      JSON.stringify({
        type: "GAME_STARTED",
        assignments,
      }),
    );
    this.broadcastLobbyUpdate();
  }

  async handleAddBot(_data: AddBotMessage, sender: Party.Connection) {
    if (!this.lobbyState) return;

    if (this.lobbyState.players.length >= 11) {
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "Lobby is full",
        }),
      );
      return;
    }

    const botId = `bot_${Date.now()}`;
    const names = [
      "Captain Ahab",
      "Davey Jones",
      "Jack Sparrow",
      "Blackbeard",
      "Anne Bonny",
      "Calico Jack",
      "William Kidd",
      "Francis Drake",
    ];

    this.lobbyState.players.push({
      id: botId,
      name: `${names[Math.floor(Math.random() * names.length)]} (Bot)`,
      photoUrl: null,
      isHost: false,
      isReady: true,
      isOnline: true,
      isEliminated: false,
      isUnconvertible: false,
      joinedAt: Date.now(),
    });

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleDenialOfCommand(
    data: DenialOfCommandMessage,
    _sender: Party.Connection,
  ) {
    if (!this.lobbyState) return;

    const { playerId } = data;
    const player = this.lobbyState.players.find((p) => p.id === playerId);

    if (player && !player.isEliminated) {
      player.isEliminated = true;
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
  }

  async handleCabinSearchRequest(
    data: CabinSearchRequestMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState) return;

    const searcherId = this.connectionToPlayer.get(sender.id);
    if (!searcherId) return;

    const { targetPlayerId } = data;
    // Find target's connection
    // We need a way to map playerId to connection(s).
    // Currently we have connectionToPlayer (connId -> playerId).
    // We can iterate connections or create a reverse map. Iterating is fine for small lobbies.

    const targetConnection = Array.from(this.room.getConnections()).find(
      (conn) => this.connectionToPlayer.get(conn.id) === targetPlayerId,
    );

    if (targetConnection) {
      targetConnection.send(
        JSON.stringify({
          type: "CABIN_SEARCH_PROMPT",
          searcherId,
        }),
      );
    }
  }

  async handleCabinSearchResponse(
    data: CabinSearchResponseMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.assignments) return;

    const targetPlayerId = this.connectionToPlayer.get(sender.id);
    if (!targetPlayerId) return;

    const { searcherId, confirmed } = data;

    if (confirmed) {
      const targetPlayer = this.lobbyState.players.find(
        (p) => p.id === targetPlayerId,
      );
      if (targetPlayer) {
        targetPlayer.isUnconvertible = true;
        await this.saveLobbyState();
        this.broadcastLobbyUpdate();

        // Send result to searcher
        const searcherConnection = Array.from(this.room.getConnections()).find(
          (conn) => this.connectionToPlayer.get(conn.id) === searcherId,
        );

        if (searcherConnection) {
          const role = this.lobbyState.assignments[targetPlayerId];
          searcherConnection.send(
            JSON.stringify({
              type: "CABIN_SEARCH_RESULT",
              targetPlayerId,
              role,
            }),
          );
        }
      }
    } else {
      // Notify searcher of denial
      const searcherConnection = Array.from(this.room.getConnections()).find(
        (conn) => this.connectionToPlayer.get(conn.id) === searcherId,
      );

      if (searcherConnection) {
        searcherConnection.send(
          JSON.stringify({
            type: "CABIN_SEARCH_DENIED",
            targetPlayerId,
          }),
        );
      }
    }
  }

  async saveLobbyState() {
    if (this.lobbyState) {
      await this.room.storage.put("lobby", this.lobbyState);
    }
  }

  broadcastLobbyUpdate() {
    if (this.lobbyState) {
      this.room.broadcast(
        JSON.stringify({
          type: "LOBBY_UPDATE",
          lobby: this.lobbyState,
        }),
      );
    }
  }
}

Server satisfies Party.Worker;

// --- Helpers ---

export type Role = "SAILOR" | "PIRATE" | "CULT_LEADER" | "CULTIST";

export function getRolesForPlayerCount(count: number): Role[] {
  const roles: Role[] = [];

  // Always 1 Cult Leader
  roles.push("CULT_LEADER");

  let sailors = 0;
  let pirates = 0;
  let cultists = 0;

  switch (count) {
    case 5:
      // 5 players: 3 Sailors, 1 Pirate OR 2 Sailors, 2 Pirates
      if (Math.random() < 0.5) {
        sailors = 3;
        pirates = 1;
      } else {
        sailors = 2;
        pirates = 2;
      }
      break;
    case 6:
      sailors = 3;
      pirates = 2;
      break;
    case 7:
      sailors = 4;
      pirates = 2;
      break;
    case 8:
      sailors = 4;
      pirates = 3;
      break;
    case 9:
      sailors = 5;
      pirates = 3;
      break;
    case 10:
      sailors = 5;
      pirates = 4;
      break;
    case 11:
      sailors = 5;
      pirates = 4;
      cultists = 1;
      break;
    default:
      // Fallback for unexpected counts (should be blocked by UI/logic)
      // Just fill with sailors to avoid crash
      sailors = count - 1;
      break;
  }

  for (let i = 0; i < sailors; i++) roles.push("SAILOR");
  for (let i = 0; i < pirates; i++) roles.push("PIRATE");
  for (let i = 0; i < cultists; i++) roles.push("CULTIST");

  return roles;
}
