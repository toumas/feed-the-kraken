import type * as Party from "partykit/server";
import { MIN_PLAYERS, type Role } from "@/app/types";
import { QUIZ_QUESTIONS } from "../app/data/quiz";

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
      playerQuestions: Record<string, number>;
      leaderChoice: string | null;
      playerAnswers: Record<string, string>;
      result?: {
        convertedPlayerId: string | null;
        correctAnswers: string[];
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
  initialGameState?: {
    assignments: Record<string, Role>;
    originalRoles: Record<string, Role>;
    players: {
      id: string;
      isEliminated: boolean;
      isUnconvertible: boolean;
      notRole: Role | null;
    }[];
  };
  gunsStashStatus?: {
    initiatorId: string;
    state: "WAITING_FOR_PLAYERS" | "DISTRIBUTION" | "COMPLETED" | "CANCELLED";
    readyPlayers: string[];
    startTime?: number;
    distribution?: Record<string, number>;
    playerQuestions?: Record<string, number>;
    playerAnswers?: Record<string, string>;
    results?: {
      correctAnswers: string[];
    };
    cancellationReason?: string;
  };
  feedTheKrakenResult?: {
    targetPlayerId: string;
    cultVictory: boolean;
  };
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

type FloggingRequestMessage = {
  type: "FLOGGING_REQUEST";
  targetPlayerId: string;
};

type FloggingConfirmationResponseMessage = {
  type: "FLOGGING_CONFIRMATION_RESPONSE";
  hostId: string;
  confirmed: boolean;
};

type StartConversionMessage = {
  type: "START_CONVERSION";
  initiatorId: string;
};

type RespondConversionMessage = {
  type: "RESPOND_CONVERSION";
  playerId: string;
  accept: boolean;
};

type SubmitConversionActionMessage = {
  type: "SUBMIT_CONVERSION_ACTION";
  playerId: string;
  action: "PICK_PLAYER" | "ANSWER_QUIZ";
  targetId?: string;
  answer?: string;
};

type StartCultCabinSearchMessage = {
  type: "START_CULT_CABIN_SEARCH";
  initiatorId: string;
};

type ClaimCultCabinSearchRoleMessage = {
  type: "CLAIM_CULT_CABIN_SEARCH_ROLE";
  playerId: string;
  role: "CAPTAIN" | "NAVIGATOR" | "LIEUTENANT" | "CREW";
};

type CancelCultCabinSearchMessage = {
  type: "CANCEL_CULT_CABIN_SEARCH";
  playerId: string;
};

type SubmitCultCabinSearchActionMessage = {
  type: "SUBMIT_CULT_CABIN_SEARCH_ACTION";
  playerId: string;
  answer: string;
};

type StartCultGunsStashMessage = {
  type: "START_CULT_GUNS_STASH";
  initiatorId: string;
};

type ConfirmCultGunsStashReadyMessage = {
  type: "CONFIRM_CULT_GUNS_STASH_READY";
  playerId: string;
};

type SubmitCultGunsStashDistributionMessage = {
  type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION";
  playerId: string;
  distribution: Record<string, number>;
};

type SubmitCultGunsStashActionMessage = {
  type: "SUBMIT_CULT_GUNS_STASH_ACTION";
  playerId: string;
  answer: string;
};

type CancelCultGunsStashMessage = {
  type: "CANCEL_CULT_GUNS_STASH";
  playerId: string;
};

type FeedTheKrakenRequestMessage = {
  type: "FEED_THE_KRAKEN_REQUEST";
  targetPlayerId: string;
};

type FeedTheKrakenResponseMessage = {
  type: "FEED_THE_KRAKEN_RESPONSE";
  captainId: string;
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
        case "FLOGGING_REQUEST":
          await this.handleFloggingRequest(data, sender);
          break;
        case "FLOGGING_CONFIRMATION_RESPONSE":
          await this.handleFloggingConfirmationResponse(data, sender);
          break;
        case "START_CONVERSION":
          await this.handleStartConversion(data, sender);
          break;
        case "RESPOND_CONVERSION":
          await this.handleRespondConversion(data, sender);
          break;
        case "SUBMIT_CONVERSION_ACTION":
          await this.handleSubmitConversionAction(data, sender);
          break;
        case "START_CULT_CABIN_SEARCH":
          await this.handleStartCabinSearch(data, sender);
          break;
        case "CLAIM_CULT_CABIN_SEARCH_ROLE":
          await this.handleClaimCabinSearchRole(data, sender);
          break;
        case "CANCEL_CULT_CABIN_SEARCH":
          await this.handleCancelCabinSearch(data, sender);
          break;
        case "SUBMIT_CULT_CABIN_SEARCH_ACTION":
          await this.handleSubmitCabinSearchAction(data, sender);
          break;
        case "RESET_GAME":
          await this.handleResetGame(sender);
          break;
        case "START_CULT_GUNS_STASH":
          await this.handleStartGunsStash(data, sender);
          break;
        case "CONFIRM_CULT_GUNS_STASH_READY":
          await this.handleConfirmGunsStashReady(data, sender);
          break;
        case "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION":
          await this.handleSubmitGunsStashDistribution(data, sender);
          break;
        case "SUBMIT_CULT_GUNS_STASH_ACTION":
          await this.handleSubmitGunsStashAction(data, sender);
          break;
        case "CANCEL_CULT_GUNS_STASH":
          await this.handleCancelGunsStash(data, sender);
          break;
        case "FEED_THE_KRAKEN_REQUEST":
          await this.handleFeedTheKrakenRequest(data, sender);
          break;
        case "FEED_THE_KRAKEN_RESPONSE":
          await this.handleFeedTheKrakenResponse(data, sender);
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  async handleResetGame(sender: Party.Connection) {
    if (!this.lobbyState || !this.lobbyState.initialGameState) return;

    const playerId = this.connectionToPlayer.get(sender.id);
    const player = this.lobbyState.players.find((p) => p.id === playerId);

    // Only host can reset
    if (!player?.isHost) return;

    const snapshot = this.lobbyState.initialGameState;

    // Restore Game State
    this.lobbyState.assignments = { ...snapshot.assignments };
    this.lobbyState.originalRoles = { ...snapshot.originalRoles };
    this.lobbyState.status = "PLAYING";
    this.lobbyState.isFloggingUsed = false;
    this.lobbyState.conversionCount = 0;
    this.lobbyState.conversionStatus = undefined;

    // Restore Player States
    this.lobbyState.players.forEach((p) => {
      const initialP = snapshot.players.find((ip) => ip.id === p.id);
      if (initialP) {
        p.isEliminated = initialP.isEliminated;
        p.isUnconvertible = initialP.isUnconvertible;
        p.notRole = initialP.notRole;
      } else {
        // Player wasn't in the snapshot (joined late? shouldn't happen in locked game)
        // Reset them to default safe state just in case
        p.isEliminated = false;
        p.isUnconvertible = false;
        p.notRole = null;
      }
    });

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();

    // Re-broadcast game start to ensure clients have correct assignments if needed
    // (Though LOBBY_UPDATE should handle it, explicit GAME_STARTED might be safer for some clients)
    this.room.broadcast(
      JSON.stringify({
        type: "GAME_STARTED",
        assignments: this.lobbyState.assignments,
      }),
    );
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
          notRole: null,
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
      notRole: null,
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

    if (!player?.isHost || this.lobbyState.players.length < MIN_PLAYERS) return;

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
    this.lobbyState.originalRoles = { ...assignments };
    this.lobbyState.isFloggingUsed = false;
    this.lobbyState.conversionCount = 0;

    // Capture initial game state for reset
    this.lobbyState.initialGameState = {
      assignments: { ...assignments },
      originalRoles: { ...assignments },
      players: this.lobbyState.players.map((p) => ({
        id: p.id,
        isEliminated: p.isEliminated,
        isUnconvertible: p.isUnconvertible,
        notRole: p.notRole,
      })),
    };

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
      notRole: null,
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

    const searcherPlayer = this.lobbyState.players.find(
      (p) => p.id === searcherId,
    );
    const searcherName = searcherPlayer ? searcherPlayer.name : "Unknown";

    if (targetConnection) {
      targetConnection.send(
        JSON.stringify({
          type: "CABIN_SEARCH_PROMPT",
          searcherId,
          searcherName,
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

  async handleFloggingRequest(
    data: FloggingRequestMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.assignments) return;

    const hostId = this.connectionToPlayer.get(sender.id);
    if (!hostId) return;

    const { targetPlayerId } = data;

    if (this.lobbyState.isFloggingUsed) {
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "Flogging has already been used this game.",
        }),
      );
      return;
    }

    // Send confirmation request to target player
    const targetConnection = Array.from(this.room.getConnections()).find(
      (conn) => this.connectionToPlayer.get(conn.id) === targetPlayerId,
    );

    const hostPlayer = this.lobbyState.players.find((p) => p.id === hostId);
    const hostName = hostPlayer ? hostPlayer.name : "Unknown";

    if (targetConnection) {
      targetConnection.send(
        JSON.stringify({
          type: "FLOGGING_CONFIRMATION_REQUEST",
          hostId,
          hostName,
        }),
      );
    }
  }

  async handleFloggingConfirmationResponse(
    data: FloggingConfirmationResponseMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.assignments) return;

    const targetPlayerId = this.connectionToPlayer.get(sender.id);
    if (!targetPlayerId) return;

    const { hostId, confirmed } = data;

    if (confirmed) {
      const targetRole = this.lobbyState.assignments[targetPlayerId];
      if (!targetRole) return;

      // Determine the 3 cards: Red (Pirate), Blue (Sailor), Yellow/Green (Cult)
      // The player keeps the one matching their role.
      // The other two are shuffled and placed face down.
      // Host picks one.

      // So we need to find which options are available (i.e., NOT the player's role).
      const allOptions: Role[] = ["PIRATE", "SAILOR", "CULT_LEADER"]; // Using CULT_LEADER to represent Cult faction
      // Note: Cultist also maps to Cult faction.

      let playerFaction: Role;
      if (targetRole === "CULTIST" || targetRole === "CULT_LEADER") {
        playerFaction = "CULT_LEADER";
      } else {
        playerFaction = targetRole;
      }

      const availableOptions = allOptions.filter((r) => r !== playerFaction);

      // Randomly select one option
      const revealedRole =
        availableOptions[Math.floor(Math.random() * availableOptions.length)];

      // Update player state immediately
      const player = this.lobbyState.players.find(
        (p) => p.id === targetPlayerId,
      );
      if (player) {
        player.notRole = revealedRole;
        player.isUnconvertible = true;
        this.lobbyState.isFloggingUsed = true;
        await this.saveLobbyState();
        this.broadcastLobbyUpdate();

        // Send reveal only to host
        const hostConnection = Array.from(this.room.getConnections()).find(
          (conn) => this.connectionToPlayer.get(conn.id) === hostId,
        );

        if (hostConnection) {
          hostConnection.send(
            JSON.stringify({
              type: "FLOGGING_REVEAL",
              targetPlayerId,
              revealedRole,
            }),
          );
        }
      }
    } else {
      // Notify host of denial
      const hostConnection = Array.from(this.room.getConnections()).find(
        (conn) => this.connectionToPlayer.get(conn.id) === hostId,
      );

      if (hostConnection) {
        hostConnection.send(
          JSON.stringify({
            type: "FLOGGING_DENIED",
            targetPlayerId,
          }),
        );
      }
    }
  }

  async handleStartConversion(
    data: StartConversionMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState) return;

    const initiatorId = this.connectionToPlayer.get(sender.id);
    if (!initiatorId || initiatorId !== data.initiatorId) return;

    // Check if conversion is already active
    if (
      this.lobbyState.conversionStatus &&
      this.lobbyState.conversionStatus.state === "PENDING"
    ) {
      return;
    }

    // Check conversion limit
    if ((this.lobbyState.conversionCount || 0) >= 3) {
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message:
            "The conversion ritual can only be performed 3 times per game.",
        }),
      );
      return;
    }

    // Initialize conversion state
    this.lobbyState.conversionStatus = {
      initiatorId,
      responses: { [initiatorId]: true }, // Initiator implicitly accepts
      state: "PENDING",
    };

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleRespondConversion(
    data: RespondConversionMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.conversionStatus) return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId || playerId !== data.playerId) return;

    if (this.lobbyState.conversionStatus.state !== "PENDING") return;

    if (!data.accept) {
      // If anyone declines, cancel the conversion
      this.lobbyState.conversionStatus.state = "CANCELLED";
      this.lobbyState.conversionStatus.responses[playerId] = false;
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
      return;
    }

    // Mark player as accepted
    this.lobbyState.conversionStatus.responses[playerId] = true;

    // Check if all players have accepted
    // We need to check if every player in the lobby (who is not eliminated) has accepted
    const activePlayers = this.lobbyState.players.filter(
      (p) => !p.isEliminated && p.isOnline,
    );

    const allAccepted = activePlayers.every(
      (p) => this.lobbyState?.conversionStatus?.responses[p.id],
    );

    if (allAccepted) {
      // Start the conversion round
      this.lobbyState.conversionStatus.state = "ACTIVE";
      this.lobbyState.conversionCount =
        (this.lobbyState.conversionCount || 0) + 1;

      // Assign questions (randomly 0-9)
      const playerQuestions: Record<string, number> = {};
      activePlayers.forEach((p) => {
        playerQuestions[p.id] = Math.floor(Math.random() * 10);
      });

      this.lobbyState.conversionStatus.round = {
        startTime: Date.now(),
        duration: 15000, // 15 seconds
        playerQuestions,
        leaderChoice: null,
        playerAnswers: {},
      };

      await this.saveLobbyState();
      this.broadcastLobbyUpdate();

      // Broadcast success result to trigger navigation to /conversion
      this.room.broadcast(
        JSON.stringify({
          type: "CONVERSION_RESULT",
          success: true,
        }),
      );

      // Schedule round end
      setTimeout(async () => {
        await this.resolveConversionRound();
      }, 15000);
    } else {
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
  }

  // ... (existing imports if any, but I'm replacing a block that doesn't show them)

  async handleSubmitConversionAction(
    data: SubmitConversionActionMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState?.conversionStatus?.round) return;
    if (this.lobbyState.conversionStatus.state !== "ACTIVE") return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId || playerId !== data.playerId) return;

    const round = this.lobbyState.conversionStatus.round;

    if (data.action === "PICK_PLAYER" && data.targetId) {
      // Verify sender is Cult Leader
      const role = this.lobbyState.assignments?.[playerId];
      if (role === "CULT_LEADER") {
        round.leaderChoice = data.targetId;
      }
    } else if (
      data.action === "ANSWER_QUIZ" &&
      typeof data.answer === "string"
    ) {
      round.playerAnswers[playerId] = data.answer;
    }

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async resolveConversionRound() {
    if (!this.lobbyState?.conversionStatus?.round) return;
    if (this.lobbyState.conversionStatus.state !== "ACTIVE") return;

    const round = this.lobbyState.conversionStatus.round;

    // 0. Handle missing inputs (Random Fallback)

    // Fallback for Cult Leader choice
    if (!round.leaderChoice) {
      const initiatorId = this.lobbyState.conversionStatus.initiatorId;
      const potentialTargets = this.lobbyState.players.filter(
        (p) =>
          p.id !== initiatorId &&
          !p.isEliminated &&
          !p.isUnconvertible &&
          this.lobbyState?.assignments?.[p.id] !== "CULTIST" &&
          this.lobbyState?.assignments?.[p.id] !== "CULT_LEADER",
      );

      if (potentialTargets.length > 0) {
        const randomTarget =
          potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        round.leaderChoice = randomTarget.id;
      }
    }

    // Fallback for Player Answers
    const activePlayers = this.lobbyState.players.filter(
      (p) => !p.isEliminated && p.isOnline,
    );
    activePlayers.forEach((p) => {
      // Skip Cult Leader
      if (this.lobbyState?.assignments?.[p.id] === "CULT_LEADER") return;

      if (round.playerAnswers[p.id] === undefined) {
        // Pick random answer from options
        const qIdx = round.playerQuestions[p.id];
        const options = QUIZ_QUESTIONS[qIdx].options;
        const randomOption =
          options[Math.floor(Math.random() * options.length)];
        round.playerAnswers[p.id] = randomOption.id;
      }
    });

    // 1. Determine correct answers
    const correctAnswers: string[] = [];
    Object.entries(round.playerAnswers).forEach(([pid, answer]) => {
      const qIdx = round.playerQuestions[pid];
      if (QUIZ_QUESTIONS[qIdx].correctAnswer === answer) {
        correctAnswers.push(pid);
      }
    });

    // 2. Handle Conversion
    let convertedPlayerId: string | null = null;
    if (round.leaderChoice) {
      const target = this.lobbyState.players.find(
        (p) => p.id === round.leaderChoice,
      );
      // Can only convert if not already Cult Leader and not unconvertible (maybe?)
      // User requirements didn't specify unconvertible logic here, but usually unconvertible players can't be converted.
      // "The player who the Cult Leader chose will also see a message that they have been converted"
      if (
        target &&
        !target.isUnconvertible &&
        this.lobbyState.assignments?.[target.id] !== "CULT_LEADER"
      ) {
        convertedPlayerId = target.id;
        // Update role
        if (this.lobbyState.assignments) {
          this.lobbyState.assignments[target.id] = "CULTIST";
        }
      }
    }

    // 3. Update State
    this.lobbyState.conversionStatus.state = "COMPLETED";
    round.result = {
      convertedPlayerId,
      correctAnswers,
    };

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleStartCabinSearch(
    data: StartCultCabinSearchMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState) return;

    const initiatorId = this.connectionToPlayer.get(sender.id);
    if (!initiatorId || initiatorId !== data.initiatorId) return;

    // Check if cabin search is already active
    if (
      this.lobbyState.cabinSearchStatus &&
      this.lobbyState.cabinSearchStatus.state !== "COMPLETED" &&
      this.lobbyState.cabinSearchStatus.state !== "CANCELLED"
    ) {
      return;
    }

    // Initialize cabin search state
    this.lobbyState.cabinSearchStatus = {
      initiatorId,
      claims: {},
      state: "SETUP",
    };
    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleClaimCabinSearchRole(
    data: ClaimCultCabinSearchRoleMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.cabinSearchStatus) return;
    if (this.lobbyState.cabinSearchStatus.state !== "SETUP") return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId || playerId !== data.playerId) return;

    const { role } = data;

    // Check if role is already claimed by someone else (for unique roles)
    if (role !== "CREW") {
      const alreadyClaimed = Object.entries(
        this.lobbyState.cabinSearchStatus.claims,
      ).find(([pid, r]) => r === role && pid !== playerId);

      if (alreadyClaimed) {
        // Role already claimed, reject
        return;
      }
    }

    // Update player's claim
    this.lobbyState.cabinSearchStatus.claims[playerId] = role;

    // Check if all players have claimed
    const activePlayers = this.lobbyState.players.filter(
      (p) => !p.isEliminated && p.isOnline,
    );

    const allClaimed = activePlayers.every(
      (p) => this.lobbyState?.cabinSearchStatus?.claims[p.id],
    );

    if (allClaimed) {
      // Validate roles: Must have exactly 1 Captain, 1 Navigator, 1 Lieutenant
      const claims = Object.values(this.lobbyState.cabinSearchStatus.claims);
      const captainCount = claims.filter((r) => r === "CAPTAIN").length;
      const navigatorCount = claims.filter((r) => r === "NAVIGATOR").length;
      const lieutenantCount = claims.filter((r) => r === "LIEUTENANT").length;

      if (captainCount !== 1 || navigatorCount !== 1 || lieutenantCount !== 1) {
        // Invalid distribution, cancel immediately
        this.lobbyState.cabinSearchStatus.state = "CANCELLED";
        this.lobbyState.cabinSearchStatus.cancellationReason =
          "Invalid role distribution: Must have exactly one Captain, one Navigator, and one Lieutenant.";
      } else {
        // Initialize questions and answers
        const playerQuestions: Record<string, number> = {};
        activePlayers.forEach((p) => {
          playerQuestions[p.id] = Math.floor(
            Math.random() * QUIZ_QUESTIONS.length,
          );
        });

        this.lobbyState.cabinSearchStatus.playerQuestions = playerQuestions;
        this.lobbyState.cabinSearchStatus.playerAnswers = {};

        // Start the active phase
        this.lobbyState.cabinSearchStatus.state = "ACTIVE";
        this.lobbyState.cabinSearchStatus.startTime = Date.now();

        // Schedule completion after 15 seconds (15000ms)
        setTimeout(async () => {
          await this.completeCabinSearch();
        }, 15000); // 15 seconds
      }

      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    } else {
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
  }

  async handleCancelCabinSearch(
    _data: CancelCultCabinSearchMessage,
    _sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.cabinSearchStatus) return;

    // Anyone can cancel during SETUP
    if (this.lobbyState.cabinSearchStatus.state === "SETUP") {
      this.lobbyState.cabinSearchStatus.state = "CANCELLED";
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
  }

  async completeCabinSearch() {
    if (!this.lobbyState || !this.lobbyState.cabinSearchStatus) return;
    if (this.lobbyState.cabinSearchStatus.state !== "ACTIVE") return;

    const { playerQuestions, playerAnswers } =
      this.lobbyState.cabinSearchStatus;

    if (!playerQuestions || !playerAnswers) {
      // Should not happen if initialized correctly
      this.lobbyState.cabinSearchStatus.state = "COMPLETED";
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
      return;
    }

    // Determine correct answers
    const correctAnswers: string[] = [];
    Object.entries(playerAnswers).forEach(([pid, answer]) => {
      const qIdx = playerQuestions[pid];
      if (
        qIdx !== undefined &&
        QUIZ_QUESTIONS[qIdx] &&
        QUIZ_QUESTIONS[qIdx].correctAnswer === answer
      ) {
        correctAnswers.push(pid);
      }
    });

    this.lobbyState.cabinSearchStatus.result = {
      correctAnswers,
    };

    this.lobbyState.cabinSearchStatus.state = "COMPLETED";
    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleSubmitCabinSearchAction(
    data: SubmitCultCabinSearchActionMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.cabinSearchStatus) return;
    if (this.lobbyState.cabinSearchStatus.state !== "ACTIVE") return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId || playerId !== data.playerId) return;

    // Verify player is part of the search (has a claim)
    if (!this.lobbyState.cabinSearchStatus.claims[playerId]) return;

    // Verify we have questions initialized
    if (!this.lobbyState.cabinSearchStatus.playerQuestions) return;
    if (!this.lobbyState.cabinSearchStatus.playerAnswers) {
      this.lobbyState.cabinSearchStatus.playerAnswers = {};
    }

    // Store the answer
    this.lobbyState.cabinSearchStatus.playerAnswers[playerId] = data.answer;

    await this.saveLobbyState();
    // We don't necessarily need to broadcast every answer for secrecy,
    // but updating the lobby state allows the client to know their answer is recorded if they check.
    // Given the UI doesn't show other people's answers usually, it's fine.
    this.broadcastLobbyUpdate();
  }

  async handleStartGunsStash(
    data: StartCultGunsStashMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState) return;

    const initiatorId = this.connectionToPlayer.get(sender.id);
    if (!initiatorId || initiatorId !== data.initiatorId) return;

    // Check if any exclusive action is already active
    if (
      (this.lobbyState.cabinSearchStatus &&
        this.lobbyState.cabinSearchStatus.state !== "COMPLETED" &&
        this.lobbyState.cabinSearchStatus.state !== "CANCELLED") ||
      (this.lobbyState.conversionStatus &&
        this.lobbyState.conversionStatus.state !== "COMPLETED" &&
        this.lobbyState.conversionStatus.state !== "CANCELLED") ||
      (this.lobbyState.gunsStashStatus &&
        this.lobbyState.gunsStashStatus.state !== "COMPLETED" &&
        this.lobbyState.gunsStashStatus.state !== "CANCELLED")
    ) {
      return;
    }

    // Verify initiator is Cult Leader - REMOVED per requirement (Anyone can start)
    // if (this.lobbyState.assignments?.[initiatorId] !== "CULT_LEADER") return;

    // Initialize guns stash state
    this.lobbyState.gunsStashStatus = {
      initiatorId,
      state: "WAITING_FOR_PLAYERS",
      readyPlayers: [initiatorId], // Initiator is automatically ready (Eyes Closed)
    };
    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleConfirmGunsStashReady(
    data: ConfirmCultGunsStashReadyMessage,
    sender: Party.Connection,
  ) {
    if (
      !this.lobbyState ||
      !this.lobbyState.gunsStashStatus ||
      this.lobbyState.gunsStashStatus.state !== "WAITING_FOR_PLAYERS"
    )
      return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId || playerId !== data.playerId) return;

    // Add to ready players if not already there
    if (!this.lobbyState.gunsStashStatus.readyPlayers.includes(playerId)) {
      this.lobbyState.gunsStashStatus.readyPlayers.push(playerId);
    }

    // Check if ALL active players are ready
    const activePlayers = this.lobbyState.players.filter(
      (p) => !p.isEliminated && p.isOnline,
    );
    const allReady = activePlayers.every((p) =>
      this.lobbyState?.gunsStashStatus?.readyPlayers.includes(p.id),
    );

    if (allReady) {
      // Assign questions to all players except initiator (who is typically leader in original flow, but here anyone can start)
      // Actually, initiator might be leader, or anyone.
      // Requirements: Leader distributes. Others answer quiz.
      // But ANYONE can start the action.
      // If a non-leader starts it, who distributes?
      // Wait, original requirement: "Any player can start Guns Stash".
      // But distinct roles: "Cult Leader distributes".
      // If I start it and I am NOT Cult Leader, what happens?
      // The code says: "Cult Leader distributes".
      // So if I start it, I just set it up. The Cult Leader (wherever they are) gets the distribution UI.
      // So everyone else (including me if I'm not leader) gets Quiz.
      // Exception: If *I* am the Cult Leader, I distribute.

      const playerQuestions: Record<string, number> = {};
      const activePlayers = this.lobbyState.players.filter(
        (p) => !p.isEliminated && p.isOnline,
      );

      // We need to know who the Cult Leader is to exclude them from quiz?
      // Or just assign questions to everyone, and UI decides to show Distribution instead of Quiz for Leader.
      // Easier to assign to everyone.
      activePlayers.forEach((p) => {
        playerQuestions[p.id] = Math.floor(
          Math.random() * QUIZ_QUESTIONS.length,
        );
      });

      this.lobbyState.gunsStashStatus.state = "DISTRIBUTION";
      this.lobbyState.gunsStashStatus.startTime = Date.now();
      this.lobbyState.gunsStashStatus.playerQuestions = playerQuestions;
      this.lobbyState.gunsStashStatus.playerAnswers = {};

      // Schedule completion after 15 seconds
      setTimeout(async () => {
        await this.completeGunsStash();
      }, 15000);
    }

    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async completeGunsStash() {
    if (
      !this.lobbyState ||
      !this.lobbyState.gunsStashStatus ||
      this.lobbyState.gunsStashStatus.state !== "DISTRIBUTION"
    )
      return;

    // Auto-complete: Distribute remaining guns randomly
    const activePlayers = this.lobbyState.players.filter(
      (p) => !p.isEliminated && p.isOnline,
    );

    if (activePlayers.length > 0) {
      const currentDistribution =
        this.lobbyState.gunsStashStatus.distribution || {};
      let currentTotal = Object.values(currentDistribution).reduce(
        (sum, count) => sum + count,
        0,
      );

      // Clone to avoid mutating state directly during calculation
      const finalDistribution = { ...currentDistribution };

      // Fill remaining guns until we have 3
      while (currentTotal < 3) {
        const randomPlayer =
          activePlayers[Math.floor(Math.random() * activePlayers.length)];
        finalDistribution[randomPlayer.id] =
          (finalDistribution[randomPlayer.id] || 0) + 1;
        currentTotal++;
      }

      this.lobbyState.gunsStashStatus.distribution = finalDistribution;
    }

    // Calculate Quiz Results
    const questions = this.lobbyState.gunsStashStatus.playerQuestions || {};
    const answers = this.lobbyState.gunsStashStatus.playerAnswers || {};
    const correctAnswers: string[] = [];

    Object.keys(answers).forEach((playerId) => {
      const qIndex = questions[playerId];
      const answerId = answers[playerId];
      if (
        qIndex !== undefined &&
        QUIZ_QUESTIONS[qIndex].correctAnswer === answerId
      ) {
        correctAnswers.push(playerId);
      }
    });

    this.lobbyState.gunsStashStatus.results = { correctAnswers };
    this.lobbyState.gunsStashStatus.state = "COMPLETED";
    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleSubmitGunsStashAction(
    data: SubmitCultGunsStashActionMessage,
    sender: Party.Connection,
  ) {
    if (
      !this.lobbyState ||
      !this.lobbyState.gunsStashStatus ||
      this.lobbyState.gunsStashStatus.state !== "DISTRIBUTION"
    )
      return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId || playerId !== data.playerId) return;

    if (!this.lobbyState.gunsStashStatus.playerAnswers) {
      this.lobbyState.gunsStashStatus.playerAnswers = {};
    }

    this.lobbyState.gunsStashStatus.playerAnswers[playerId] = data.answer;
    await this.saveLobbyState();
    this.broadcastLobbyUpdate();
  }

  async handleSubmitGunsStashDistribution(
    data: SubmitCultGunsStashDistributionMessage,
    sender: Party.Connection,
  ) {
    if (
      !this.lobbyState ||
      !this.lobbyState.gunsStashStatus ||
      this.lobbyState.gunsStashStatus.state !== "DISTRIBUTION"
    )
      return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId || playerId !== data.playerId) return;

    // Validation: Total guns must be <= 3 (Draft mode)
    const totalGuns = Object.values(data.distribution).reduce(
      (sum, count) => sum + count,
      0,
    );

    if (totalGuns > 3) return;

    // Just update the draft distribution, DO NOT COMPLETE
    this.lobbyState.gunsStashStatus.distribution = data.distribution;

    await this.saveLobbyState();
    // Broadcast to update everyone (or just leader? everyone is fine, they can't see it anyway)
    // Actually other players shouldn't see it. But the UI hides it.
    this.broadcastLobbyUpdate();
  }

  async handleCancelGunsStash(
    _data: CancelCultGunsStashMessage,
    _sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.gunsStashStatus) return;

    // Allow cancelling in WAITING_FOR_PLAYERS phase
    if (this.lobbyState.gunsStashStatus.state === "WAITING_FOR_PLAYERS") {
      this.lobbyState.gunsStashStatus.state = "CANCELLED";
      this.lobbyState.gunsStashStatus.cancellationReason =
        "The action was cancelled.";
      await this.saveLobbyState();
      this.broadcastLobbyUpdate();
    }
  }

  async handleFeedTheKrakenRequest(
    data: FeedTheKrakenRequestMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.assignments) return;

    const captainId = this.connectionToPlayer.get(sender.id);
    if (!captainId) return;

    const { targetPlayerId } = data;

    // Captain cannot feed themselves
    if (captainId === targetPlayerId) {
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "The captain cannot feed themselves to the Kraken.",
        }),
      );
      return;
    }

    // Find target's connection and send prompt
    const targetConnection = Array.from(this.room.getConnections()).find(
      (conn) => this.connectionToPlayer.get(conn.id) === targetPlayerId,
    );

    const captainPlayer = this.lobbyState.players.find(
      (p) => p.id === captainId,
    );
    const captainName = captainPlayer ? captainPlayer.name : "Unknown";

    if (targetConnection) {
      targetConnection.send(
        JSON.stringify({
          type: "FEED_THE_KRAKEN_PROMPT",
          captainId,
          captainName,
        }),
      );
    }
  }

  async handleFeedTheKrakenResponse(
    data: FeedTheKrakenResponseMessage,
    sender: Party.Connection,
  ) {
    if (!this.lobbyState || !this.lobbyState.assignments) return;

    const targetPlayerId = this.connectionToPlayer.get(sender.id);
    if (!targetPlayerId) return;

    const { captainId, confirmed } = data;

    if (confirmed) {
      const targetPlayer = this.lobbyState.players.find(
        (p) => p.id === targetPlayerId,
      );
      if (targetPlayer) {
        // Mark player as eliminated
        targetPlayer.isEliminated = true;

        // Check if target was Cult Leader - cult victory!
        const targetRole = this.lobbyState.assignments[targetPlayerId];
        const cultVictory = targetRole === "CULT_LEADER";

        // Set the result for UI display
        this.lobbyState.feedTheKrakenResult = {
          targetPlayerId,
          cultVictory,
        };

        await this.saveLobbyState();
        this.broadcastLobbyUpdate();

        // Broadcast result to everyone (including victim and captain)
        this.room.broadcast(
          JSON.stringify({
            type: "FEED_THE_KRAKEN_RESULT",
            targetPlayerId,
            cultVictory,
          }),
        );
      }
    } else {
      // Notify captain of denial
      const captainConnection = Array.from(this.room.getConnections()).find(
        (conn) => this.connectionToPlayer.get(conn.id) === captainId,
      );

      if (captainConnection) {
        captainConnection.send(
          JSON.stringify({
            type: "FEED_THE_KRAKEN_DENIED",
            targetPlayerId,
          }),
        );
      }
    }
  }

  async onAlarm() {
    await this.resolveConversionRound();
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
    case 3:
      sailors = 0;
      pirates = 2;
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
