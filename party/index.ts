/**
 * PartyKit Server with XState v5 Integration
 *
 * This server uses an XState actor as the single source of truth for game state.
 * The actor is persisted to durable storage and rehydrated on server restart.
 */

import type * as Party from "partykit/server";
import { type Actor, createActor, type Snapshot } from "xstate";
import { type GameEvent, type GameSnapshot, gameMachine } from "./machine";

// =============================================================================
// Server Implementation
// =============================================================================

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {}

  /**
   * XState actor - single source of truth for game state
   */
  private gameActor: Actor<typeof gameMachine> | null = null;

  /**
   * Map connection ID to player ID for connection management
   */
  private connectionToPlayer = new Map<string, string>();

  /**
   * Initialize the server and restore state from storage
   */
  async onStart() {
    // Try to restore persisted snapshot from storage
    const persistedSnapshot =
      await this.room.storage.get<Snapshot<unknown>>("gameSnapshot");

    if (persistedSnapshot) {
      // Rehydrate actor from persisted snapshot
      this.gameActor = createActor(gameMachine, {
        snapshot: persistedSnapshot,
      });
    } else {
      // Create fresh actor
      this.gameActor = createActor(gameMachine);
    }

    // Subscribe to state changes and broadcast to all clients
    this.gameActor.subscribe((snapshot) => {
      this.broadcastStateUpdate(snapshot);
      // Persist significant state changes
      this.persistSnapshot();
    });

    // Start the actor
    this.gameActor.start();
  }

  /**
   * Handle new client connection
   */
  async onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
    if (!this.gameActor) return;

    // Send current state to the connecting client
    const snapshot = this.gameActor.getSnapshot();
    conn.send(
      JSON.stringify({
        type: "STATE_UPDATE",
        snapshot: this.serializeSnapshot(snapshot),
      }),
    );
  }

  /**
   * Handle client disconnection
   */
  async onClose(conn: Party.Connection) {
    const playerId = this.connectionToPlayer.get(conn.id);
    if (!playerId) return;

    this.connectionToPlayer.delete(conn.id);

    // Send disconnect event to the machine
    if (this.gameActor) {
      this.gameActor.send({
        type: "PLAYER_DISCONNECTED",
        playerId,
      });
    }
  }

  /**
   * Handle incoming messages from clients
   *
   * All messages are forwarded to the XState actor as events.
   * The actor handles validation via guards and state transitions.
   */
  async onMessage(message: string, sender: Party.Connection) {
    if (!this.gameActor) return;

    try {
      const data = JSON.parse(message) as GameEvent;

      // Track player-connection mapping for connection events
      if (
        (data.type === "CREATE_LOBBY" || data.type === "JOIN_LOBBY") &&
        "playerId" in data
      ) {
        this.connectionToPlayer.set(sender.id, data.playerId);
      }

      // Inject room code for CREATE_LOBBY events
      if (data.type === "CREATE_LOBBY") {
        this.gameActor.send({
          ...data,
          code: this.room.id.toUpperCase(),
        });
      } else if (
        data.type === "CLAIM_CULT_CABIN_SEARCH_ROLE" &&
        data.role === "CAPTAIN"
      ) {
        // Players who have lost their tongue cannot claim Captain in Cult Cabin Search
        const snapshot = this.gameActor.getSnapshot();
        const player = snapshot.context.players.find(
          (p) => p.id === data.playerId,
        );
        if (player && player.hasTongue === false) {
          sender.send(
            JSON.stringify({
              type: "ERROR",
              message: "errors.silencedCannotClaimCaptain",
            }),
          );
          return;
        }
        this.gameActor.send(data);
      } else {
        // Forward other events directly to the XState actor
        this.gameActor.send(data);
      }

      // For game start, also send GAME_STARTED message for backward compatibility
      if (data.type === "START_GAME") {
        const snapshot = this.gameActor.getSnapshot();
        this.room.broadcast(
          JSON.stringify({
            type: "GAME_STARTED",
            assignments: snapshot.context.assignments,
          }),
        );
      }

      // Send targeted FLOGGING_CONFIRMATION_REQUEST to target player
      // Send targeted FLOGGING_CONFIRMATION_REQUEST to target player
      // MOVED TO STATE DERIVATION - REMOVED IMPERATIVE MESSAGE
      if (data.type === "FLOGGING_REQUEST") {
        // No-op: client derives prompt from state
      }

      // Handle FLOGGING_CONFIRMATION_RESPONSE - send reveal/denied to host
      if (data.type === "FLOGGING_CONFIRMATION_RESPONSE") {
        const targetPlayerId = this.connectionToPlayer.get(sender.id);
        const { hostId, confirmed } = data;

        // Find host's connection
        const hostConnection = Array.from(this.room.getConnections()).find(
          (conn) => this.connectionToPlayer.get(conn.id) === hostId,
        );

        if (hostConnection && targetPlayerId) {
          if (confirmed) {
            // STATE DERIVATION HANDLES REVEAL - REMOVED IMPERATIVE MESSAGE
          } else {
            hostConnection.send(
              JSON.stringify({
                type: "ERROR",
                message: "errors.floggingDenied",
              }),
            );
          }
        }
      }

      // Send targeted CABIN_SEARCH_PROMPT to target player
      // Send targeted CABIN_SEARCH_PROMPT to target player
      // MOVED TO STATE DERIVATION - REMOVED IMPERATIVE MESSAGE
      if (data.type === "CABIN_SEARCH_REQUEST") {
        // No-op: client derives prompt from state
      }

      // Handle CABIN_SEARCH_RESPONSE - send result/denied to searcher
      if (data.type === "CABIN_SEARCH_RESPONSE") {
        const targetPlayerId = this.connectionToPlayer.get(sender.id);
        const { searcherId, confirmed } = data;

        // Find searcher's connection
        const searcherConnection = Array.from(this.room.getConnections()).find(
          (conn) => this.connectionToPlayer.get(conn.id) === searcherId,
        );

        if (searcherConnection && targetPlayerId) {
          if (confirmed) {
            // STATE DERIVATION HANDLES RESULT - REMOVED IMPERATIVE MESSAGE
          } else {
            searcherConnection.send(
              JSON.stringify({
                type: "ERROR",
                message: "errors.cabinSearchDenied",
              }),
            );
          }
        }
      }

      // Handle OFF_WITH_TONGUE_RESPONSE - send denied to captain
      if (data.type === "OFF_WITH_TONGUE_RESPONSE") {
        const { captainId, confirmed } = data;

        // Find captain's connection
        const captainConnection = Array.from(this.room.getConnections()).find(
          (conn) => this.connectionToPlayer.get(conn.id) === captainId,
        );

        if (captainConnection && !confirmed) {
          captainConnection.send(
            JSON.stringify({
              type: "ERROR",
              message: "errors.offWithTongueDenied",
            }),
          );
        }
      }

      // Handle FEED_THE_KRAKEN_RESPONSE - send denied to captain
      if (data.type === "FEED_THE_KRAKEN_RESPONSE") {
        const { captainId, confirmed } = data;

        // Find captain's connection
        const captainConnection = Array.from(this.room.getConnections()).find(
          (conn) => this.connectionToPlayer.get(conn.id) === captainId,
        );

        if (captainConnection && !confirmed) {
          captainConnection.send(
            JSON.stringify({
              type: "ERROR",
              message: "errors.feedTheKrakenDenied",
            }),
          );
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "Invalid message format",
        }),
      );
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Broadcast state update to all connected clients
   */
  private broadcastStateUpdate(snapshot: {
    value: unknown;
    context: GameSnapshot["context"];
  }) {
    // Send STATE_UPDATE with full XState snapshot (new format)
    const stateUpdateMessage = JSON.stringify({
      type: "STATE_UPDATE",
      snapshot: this.serializeSnapshot(snapshot),
    });
    console.log("Server: Broadcasting State Update:", snapshot.value);
    this.room.broadcast(stateUpdateMessage);
  }

  /**
   * Persist the current snapshot to durable storage
   */
  private async persistSnapshot() {
    if (!this.gameActor) return;

    try {
      const snapshot = this.gameActor.getPersistedSnapshot();
      await this.room.storage.put("gameSnapshot", snapshot);
    } catch (error) {
      console.error("Error persisting snapshot:", error);
    }
  }

  /**
   * Serialize snapshot for transmission to clients
   */
  private serializeSnapshot(snapshot: {
    value: unknown;
    context: GameSnapshot["context"];
  }): GameSnapshot {
    return {
      value: snapshot.value as GameSnapshot["value"],
      context: snapshot.context,
    };
  }
}
