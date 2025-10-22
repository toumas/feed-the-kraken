import type * as Party from "partykit/server";

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
          joinedAt: Date.now(),
        },
      ],
      status: "WAITING",
    };

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
    } else {
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
        joinedAt: Date.now(),
      });
    }

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
    } else {
      // If host left, assign new host
      if (!this.lobbyState.players.some((p) => p.isHost)) {
        this.lobbyState.players[0].isHost = true;
      }
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
  }

  async handleStartGame(data: StartGameMessage, _sender: Party.Connection) {
    if (!this.lobbyState) return;

    const { playerId } = data;
    const player = this.lobbyState.players.find((p) => p.id === playerId);

    if (player?.isHost && this.lobbyState.players.length >= 5) {
      this.lobbyState.status = "PLAYING";
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
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
      joinedAt: Date.now(),
    });

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
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
