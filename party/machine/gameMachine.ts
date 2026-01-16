/**
 * XState V5 Game Machine Definition
 *
 * Main state machine for the Feed the Kraken game.
 * Server-side authoritative state management.
 *
 * In XState v5, we define actions inline in the setup() configuration
 * to ensure proper type inference.
 */

import { assign, setup } from "xstate";
import { QUIZ_QUESTIONS } from "@/app/data/quiz";
import {
  getRolesForPlayerCount,
  isValidComposition,
} from "@/app/utils/role-utils";
import { MAX_PLAYERS, MIN_PLAYERS, QUIZ_DURATION_MS } from "./constants";
import type { GameContext, GameEvent, Player, Role } from "./types";

// =============================================================================
// Helper Functions
// =============================================================================

function createPlayer(
  id: string,
  name: string,
  photoUrl: string | null,
  isHost: boolean,
): Player {
  return {
    id,
    name,
    photoUrl,
    isHost,
    isReady: false,
    isOnline: true,
    isEliminated: false,
    isUnconvertible: false,
    notRole: null,
    joinedAt: Date.now(),
    hasTongue: true,
  };
}

function generateBotName(): string {
  const adjectives = ["Swift", "Brave", "Silent", "Dark", "Wild"];
  const nouns = ["Sailor", "Pirate", "Captain", "Mate", "Swabbie"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// Initial Context
// =============================================================================

const initialContext: GameContext = {
  code: "",
  players: [],
  roleDistributionMode: "automatic",
  isFloggingUsed: false,
  isGunsStashUsed: false,
  isCultCabinSearchUsed: false,
  isOffWithTongueUsed: false,
  conversionCount: 0,
  feedTheKrakenCount: 0,
  cabinSearchCount: 0,
  convertedPlayerIds: [],
};

// =============================================================================
// Machine Setup with Inline Actions for Type Safety
// =============================================================================

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  guards: {
    isHost: ({ context, event }) => {
      if (!("playerId" in event)) return false;
      const player = context.players.find((p) => p.id === event.playerId);
      return player?.isHost === true;
    },
    hasMinPlayers: ({ context }) => context.players.length >= MIN_PLAYERS,
    canJoinLobby: ({ context }) => context.players.length < MAX_PLAYERS,
    isManualMode: ({ context }) => context.roleDistributionMode === "manual",
    isAutomaticMode: ({ context }) =>
      context.roleDistributionMode === "automatic",
    allRolesConfirmed: ({ context }) => {
      if (!context.roleSelectionStatus) return false;
      const { selections } = context.roleSelectionStatus;
      const allConfirmed = context.players.every(
        (p) => selections[p.id]?.confirmed === true,
      );
      if (!allConfirmed) return false;
      // Also check that the composition is valid
      const selectedRoles = Object.values(selections).map((s) => s.role);
      return isValidComposition(selectedRoles, context.players.length);
    },
    roleSelectionInvalid: ({ context }) => {
      if (!context.roleSelectionStatus) return false;
      const { selections } = context.roleSelectionStatus;
      const allConfirmed = context.players.every(
        (p) => selections[p.id]?.confirmed === true,
      );
      if (!allConfirmed) return false;
      // Check that the composition is INVALID
      const selectedRoles = Object.values(selections).map((s) => s.role);
      return !isValidComposition(selectedRoles, context.players.length);
    },
    conversionCancelled: ({ context }) =>
      context.conversionStatus?.state === "CANCELLED",
    conversionActive: ({ context }) =>
      context.conversionStatus?.state === "ACTIVE",
    conversionComplete: ({ context }) => {
      if (!context.conversionStatus?.round) return false;
      // Check that the round timer has expired
      const now = Date.now();
      const elapsed = now - context.conversionStatus.round.startTime;
      const timerExpired = elapsed >= context.conversionStatus.round.duration;
      // Only complete when timer has expired and we have the required data
      return (
        timerExpired &&
        context.conversionStatus.round.leaderChoice !== null &&
        Object.keys(context.conversionStatus.round.playerAnswers || {}).length >
          0
      );
    },
    cabinSearchTimerExpired: ({ context }) => {
      if (
        !context.cabinSearchStatus ||
        context.cabinSearchStatus.state !== "ACTIVE" ||
        !context.cabinSearchStatus.startTime
      )
        return false;
      const elapsed = Date.now() - context.cabinSearchStatus.startTime;
      return elapsed >= 15000; // 15 second quiz timer
    },
    cabinSearchActive: ({ context }) =>
      context.cabinSearchStatus?.state === "ACTIVE",
    cabinSearchComplete: ({ context }) =>
      context.cabinSearchStatus?.state === "COMPLETED",
    cabinSearchCancelled: ({ context }) =>
      context.cabinSearchStatus?.state === "CANCELLED",
    gunsStashAllReady: ({ context }) => {
      if (!context.gunsStashStatus) return false;
      // All non-eliminated players must be ready
      const activePlayers = context.players.filter((p) => !p.isEliminated);
      return activePlayers.every((p) =>
        context.gunsStashStatus?.readyPlayers.includes(p.id),
      );
    },
    gunsStashDistribution: ({ context }) =>
      context.gunsStashStatus?.state === "DISTRIBUTION",
    gunsStashComplete: ({ context }) =>
      context.gunsStashStatus?.state === "COMPLETED",
    gunsStashNotUsed: ({ context }) => context.isGunsStashUsed !== true,
    cabinSearchNotUsed: ({ context }) => context.isCultCabinSearchUsed !== true,
    floggingNotUsed: ({ context }) => context.isFloggingUsed !== true,
    conversionNotAtLimit: ({ context }) => (context.conversionCount || 0) < 3,
    feedTheKrakenNotAtLimit: ({ context }) =>
      (context.feedTheKrakenCount || 0) < 2,
    cabinSearchNotAtLimit: ({ context }) => (context.cabinSearchCount || 0) < 2,
    offWithTongueNotUsed: ({ context }) => context.isOffWithTongueUsed !== true,
    lastPlayerLeaving: ({ context, event }) => {
      if (!("playerId" in event)) return false;
      const remaining = context.players.filter((p) => p.id !== event.playerId);
      return remaining.length === 0;
    },
    isConfirmed: ({ event }) => {
      if (!("confirmed" in event)) return false;
      return event.confirmed === true;
    },
    canStartManual: ({ context, event }) => {
      if (!("playerId" in event)) return false;
      const player = context.players.find((p) => p.id === event.playerId);
      return (
        player?.isHost === true &&
        context.players.length >= MIN_PLAYERS &&
        context.roleDistributionMode === "manual"
      );
    },
    canStartAutomatic: ({ context, event }) => {
      if (!("playerId" in event)) return false;
      const player = context.players.find((p) => p.id === event.playerId);
      return (
        player?.isHost === true &&
        context.players.length >= MIN_PLAYERS &&
        context.roleDistributionMode === "automatic"
      );
    },
    canKickPlayer: ({ context, event }) => {
      if (!("playerId" in event) || !("targetPlayerId" in event)) return false;
      const kicker = context.players.find((p) => p.id === event.playerId);
      const target = context.players.find(
        (p) => p.id === (event as { targetPlayerId: string }).targetPlayerId,
      );
      return kicker?.isHost === true && target !== undefined && !target.isHost;
    },
    lastKickedPlayerLeaving: ({ context, event }) => {
      if (!("targetPlayerId" in event)) return false;
      const remaining = context.players.filter(
        (p) => p.id !== (event as { targetPlayerId: string }).targetPlayerId,
      );
      return remaining.length === 0;
    },
  },
  actions: {
    // Lobby actions - defined inline for type safety
    addHostPlayer: assign(({ context, event }) => {
      if (event.type !== "CREATE_LOBBY") return {};
      return {
        code: event.code,
        players: [
          ...context.players,
          createPlayer(
            event.playerId,
            event.playerName,
            event.playerPhoto,
            true,
          ),
        ],
      };
    }),

    addPlayer: assign(({ context, event }) => {
      if (event.type !== "JOIN_LOBBY") return {};
      const existingIndex = context.players.findIndex(
        (p) => p.id === event.playerId,
      );

      if (existingIndex >= 0) {
        const updated = [...context.players];
        updated[existingIndex] = {
          ...updated[existingIndex],
          name: event.playerName,
          photoUrl: event.playerPhoto,
          isOnline: true,
        };
        return { players: updated };
      }

      return {
        players: [
          ...context.players,
          createPlayer(
            event.playerId,
            event.playerName,
            event.playerPhoto,
            false,
          ),
        ],
      };
    }),

    removePlayer: assign(({ context, event }) => {
      if (event.type !== "LEAVE_LOBBY") return {};
      const filtered = context.players.filter((p) => p.id !== event.playerId);

      if (
        filtered.length > 0 &&
        !filtered.some((p) => p.isHost) &&
        context.players.find((p) => p.id === event.playerId)?.isHost
      ) {
        filtered[0] = { ...filtered[0], isHost: true };
      }

      return { players: filtered };
    }),

    kickPlayer: assign(({ context, event }) => {
      if (event.type !== "KICK_PLAYER") return {};
      return {
        players: context.players.filter((p) => p.id !== event.targetPlayerId),
      };
    }),

    updateProfile: assign(({ context, event }) => {
      if (event.type !== "UPDATE_PROFILE") return {};
      return {
        players: context.players.map((p) =>
          p.id === event.playerId
            ? { ...p, name: event.name, photoUrl: event.photoUrl }
            : p,
        ),
      };
    }),

    addBot: assign(({ context }) => ({
      players: [
        ...context.players,
        createPlayer(`bot-${Date.now()}`, generateBotName(), null, false),
      ],
    })),

    setRoleDistributionMode: assign(({ event }) => {
      if (event.type !== "SET_ROLE_DISTRIBUTION_MODE") return {};
      return { roleDistributionMode: event.mode };
    }),

    // Role assignment actions
    assignRolesAutomatic: assign(({ context }) => {
      const playerCount = context.players.length;
      const roles = getRolesForPlayerCount(playerCount);
      const shuffled = shuffleArray(roles);

      const assignments: Record<string, Role> = {};
      context.players.forEach((p, index) => {
        assignments[p.id] = shuffled[index];
      });

      return {
        assignments,
        originalRoles: { ...assignments },
        isFloggingUsed: false,
        isGunsStashUsed: false,
        isCultCabinSearchUsed: false,
        isOffWithTongueUsed: false,
        conversionCount: 0,
        feedTheKrakenCount: 0,
        cabinSearchCount: 0,
        convertedPlayerIds: [],
        // Explicitly clear all game status fields
        conversionStatus: undefined,
        cabinSearchStatus: undefined,
        captainCabinSearchStatus: undefined,
        gunsStashStatus: undefined,
        floggingStatus: undefined,
        feedTheKrakenStatus: undefined,
        feedTheKrakenResult: undefined,
        offWithTongueStatus: undefined,
        initialGameState: {
          assignments: { ...assignments },
          originalRoles: { ...assignments },
          players: context.players.map((p) => ({
            id: p.id,
            isEliminated: p.isEliminated,
            isUnconvertible: p.isUnconvertible,
            notRole: p.notRole,
          })),
        },
      };
    }),

    initManualRoleSelection: assign(({ context }) => {
      const playerCount = context.players.length;
      const roles = getRolesForPlayerCount(playerCount);
      return {
        roleSelectionStatus: {
          state: "SELECTING" as const,
          availableRoles: [...roles],
          selections: {},
        },
      };
    }),

    selectRole: assign(({ context, event }) => {
      if (event.type !== "SELECT_ROLE" || !context.roleSelectionStatus)
        return {};

      const currentSelection =
        context.roleSelectionStatus.selections[event.playerId];
      const previousRole = currentSelection?.role;

      const availableRoles = [...context.roleSelectionStatus.availableRoles];
      if (previousRole && previousRole !== event.role) {
        availableRoles.push(previousRole);
      }

      const roleIndex = availableRoles.indexOf(event.role);
      if (roleIndex >= 0) {
        availableRoles.splice(roleIndex, 1);
      }

      return {
        roleSelectionStatus: {
          ...context.roleSelectionStatus,
          availableRoles,
          selections: {
            ...context.roleSelectionStatus.selections,
            [event.playerId]: { role: event.role, confirmed: false },
          },
        },
      };
    }),

    confirmRole: assign(({ context, event }) => {
      if (event.type !== "CONFIRM_ROLE" || !context.roleSelectionStatus)
        return {};

      return {
        roleSelectionStatus: {
          ...context.roleSelectionStatus,
          selections: {
            ...context.roleSelectionStatus.selections,
            [event.playerId]: {
              ...context.roleSelectionStatus.selections[event.playerId],
              confirmed: true,
            },
          },
        },
      };
    }),

    finalizeManualRoles: assign(({ context }) => {
      if (!context.roleSelectionStatus) return {};

      const assignments: Record<string, Role> = {};
      for (const [playerId, selection] of Object.entries(
        context.roleSelectionStatus.selections,
      )) {
        assignments[playerId] = selection.role;
      }

      return {
        assignments,
        originalRoles: { ...assignments },
        roleSelectionStatus: {
          ...context.roleSelectionStatus,
          state: "COMPLETED" as const,
        },
        isFloggingUsed: false,
        isGunsStashUsed: false,
        isCultCabinSearchUsed: false,
        isOffWithTongueUsed: false,
        conversionCount: 0,
        feedTheKrakenCount: 0,
        cabinSearchCount: 0,
        convertedPlayerIds: [],
        // Explicitly clear all game status fields
        conversionStatus: undefined,
        cabinSearchStatus: undefined,
        captainCabinSearchStatus: undefined,
        gunsStashStatus: undefined,
        floggingStatus: undefined,
        feedTheKrakenStatus: undefined,
        feedTheKrakenResult: undefined,
        offWithTongueStatus: undefined,
        initialGameState: {
          assignments: { ...assignments },
          originalRoles: { ...assignments },
          players: context.players.map((p) => ({
            id: p.id,
            isEliminated: p.isEliminated,
            isUnconvertible: p.isUnconvertible,
            notRole: p.notRole,
          })),
        },
      };
    }),

    cancelRoleSelection: assign(({ context, event }) => {
      if (
        event.type !== "CANCEL_ROLE_SELECTION" ||
        !context.roleSelectionStatus
      )
        return {};
      return {
        roleSelectionStatus: {
          ...context.roleSelectionStatus,
          state: "CANCELLED" as const,
          cancellationReason: `Cancelled by player ${event.playerId}`,
        },
      };
    }),

    cancelRoleSelectionInvalid: assign(({ context }) => {
      if (!context.roleSelectionStatus) return {};
      return {
        roleSelectionStatus: {
          ...context.roleSelectionStatus,
          state: "CANCELLED" as const,
          cancellationReason:
            "Invalid role composition - each role must be selected the correct number of times",
        },
      };
    }),

    // Conversion actions
    startConversion: assign(({ event }) => {
      if (event.type !== "START_CONVERSION") return {};
      return {
        conversionStatus: {
          initiatorId: event.initiatorId,
          responses: { [event.initiatorId]: true },
          state: "PENDING" as const,
        },
      };
    }),

    respondConversion: assign(({ context, event }) => {
      if (event.type !== "RESPOND_CONVERSION" || !context.conversionStatus)
        return {};

      const newResponses = {
        ...context.conversionStatus.responses,
        [event.playerId]: event.accept,
      };

      // If anyone declines, immediately cancel
      const anyDeclined = Object.values(newResponses).some((v) => v === false);
      if (anyDeclined) {
        return {
          conversionStatus: {
            ...context.conversionStatus,
            responses: newResponses,
            state: "CANCELLED" as const,
          },
        };
      }

      const eligiblePlayers = context.players.filter((p) => !p.isEliminated);

      const allAccepted = eligiblePlayers.every(
        (p) => newResponses[p.id] === true,
      );

      if (allAccepted) {
        // Generate questions for eligible (non-cult) players
        const playerQuestions: Record<string, number> = {};
        eligiblePlayers.forEach((p) => {
          playerQuestions[p.id] = Math.floor(Math.random() * 10);
        });

        return {
          conversionStatus: {
            ...context.conversionStatus,
            responses: newResponses,
            state: "ACTIVE" as const,
            round: {
              startTime: Date.now(),
              duration: QUIZ_DURATION_MS,
              playerQuestions,
              leaderChoice: null,
              playerAnswers: {},
            },
          },
        };
      }

      return {
        conversionStatus: {
          ...context.conversionStatus,
          responses: newResponses,
        },
      };
    }),

    submitConversionAction: assign(({ context, event }) => {
      if (
        event.type !== "SUBMIT_CONVERSION_ACTION" ||
        !context.conversionStatus?.round
      )
        return {};

      if (event.action === "PICK_PLAYER" && event.targetId) {
        return {
          conversionStatus: {
            ...context.conversionStatus,
            round: {
              ...context.conversionStatus.round,
              leaderChoice: event.targetId,
            },
          },
        };
      }

      if (event.action === "ANSWER_QUIZ" && event.answer) {
        return {
          conversionStatus: {
            ...context.conversionStatus,
            round: {
              ...context.conversionStatus.round,
              playerAnswers: {
                ...context.conversionStatus.round.playerAnswers,
                [event.playerId]: event.answer,
              },
            },
          },
        };
      }

      return {};
    }),

    completeConversion: assign(({ context }) => {
      if (!context.conversionStatus?.round || !context.assignments) return {};

      // Get leader's choice, or pick randomly if not selected
      let targetId = context.conversionStatus.round.leaderChoice;

      if (!targetId) {
        // Find eligible targets:
        // - Not eliminated
        // - Not unconvertible
        // - Not Cult Leader
        // - Not a player who was CONVERTED to Cultist (original role !== CULTIST but current assignment === CULTIST)
        // Note: Original Cultist IS targetable because Cult Leader doesn't know who they are
        const wasConvertedToCultist = (playerId: string) =>
          context.assignments?.[playerId] === "CULTIST" &&
          context.originalRoles?.[playerId] !== "CULTIST";

        const eligibleTargets = context.players.filter(
          (p) =>
            !p.isEliminated &&
            !p.isUnconvertible &&
            !wasConvertedToCultist(p.id) &&
            context.assignments?.[p.id] !== "CULT_LEADER",
        );

        if (eligibleTargets.length > 0) {
          // Randomly select a target
          targetId =
            eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)]
              .id;
        } else {
          // No eligible targets - cancel conversion
          return {
            conversionStatus: {
              ...context.conversionStatus,
              state: "CANCELLED" as const,
            },
          };
        }
      }

      const playerQuestions = context.conversionStatus.round.playerQuestions;
      const playerAnswers = context.conversionStatus.round.playerAnswers;
      const correctAnswers: string[] = [];

      // Calculate correct answers
      Object.entries(playerAnswers).forEach(([playerId, answerId]) => {
        const questionIndex = playerQuestions[playerId];
        if (
          questionIndex !== undefined &&
          QUIZ_QUESTIONS[questionIndex] &&
          QUIZ_QUESTIONS[questionIndex].correctAnswer === answerId
        ) {
          correctAnswers.push(playerId);
        }
      });

      return {
        assignments: {
          ...context.assignments,
          [targetId]: "CULTIST" as Role,
        },
        conversionCount: context.conversionCount + 1,
        // Track all converted players (including original Cultists who now know the leader)
        convertedPlayerIds: [...context.convertedPlayerIds, targetId],
        conversionStatus: {
          ...context.conversionStatus,
          state: "COMPLETED" as const,
          round: {
            ...context.conversionStatus.round,
            leaderChoice: targetId, // Ensure leaderChoice is set for UI
            result: {
              convertedPlayerId: targetId,
              correctAnswers,
            },
          },
        },
      };
    }),

    clearConversionStatus: assign({ conversionStatus: undefined }),

    // Captain's Cabin Search actions (role reveal)
    startCaptainCabinSearch: assign(({ event }) => {
      if (event.type !== "CABIN_SEARCH_REQUEST") return {};
      // Use the initiator's ID (any player can be captain/searcher)
      return {
        captainCabinSearchStatus: {
          searcherId: event.playerId,
          targetPlayerId: event.targetPlayerId,
          state: "PENDING" as const,
        },
      };
    }),

    completeCaptainCabinSearch: assign(({ context }) => {
      if (!context.captainCabinSearchStatus || !context.assignments) return {};
      const targetId = context.captainCabinSearchStatus.targetPlayerId;
      const role = context.assignments[targetId];
      const originalRole = context.originalRoles?.[targetId];
      return {
        captainCabinSearchStatus: {
          ...context.captainCabinSearchStatus,
          state: "COMPLETED" as const,
          result: { role, originalRole },
        },
        cabinSearchCount: (context.cabinSearchCount || 0) + 1,
        // Mark target as unconvertible
        players: context.players.map((p) =>
          p.id === targetId ? { ...p, isUnconvertible: true } : p,
        ),
      };
    }),

    cancelCaptainCabinSearch: assign(({ context }) => {
      if (!context.captainCabinSearchStatus) return {};
      return {
        captainCabinSearchStatus: {
          ...context.captainCabinSearchStatus,
          state: "CANCELLED" as const,
        },
      };
    }),

    clearCaptainCabinSearchStatus: assign({
      captainCabinSearchStatus: undefined,
    }),

    // Cult cabin search actions
    startCultCabinSearch: assign(({ event }) => {
      if (event.type !== "START_CULT_CABIN_SEARCH") return {};
      return {
        cabinSearchStatus: {
          initiatorId: event.initiatorId,
          claims: {},
          state: "SETUP" as const,
        },
      };
    }),

    claimCabinSearchRole: assign(({ context, event }) => {
      if (
        event.type !== "CLAIM_CULT_CABIN_SEARCH_ROLE" ||
        !context.cabinSearchStatus
      )
        return {};

      // Update claims with the new claim
      const newClaims = {
        ...context.cabinSearchStatus.claims,
        [event.playerId]: event.role,
      };

      // Get active players (not eliminated, online)
      const activePlayers = context.players.filter(
        (p) => !p.isEliminated && p.isOnline,
      );

      // Check if all active players have claimed
      const allClaimed = activePlayers.every((p) => newClaims[p.id]);

      if (!allClaimed) {
        // Not all players have claimed yet, just update claims
        return {
          cabinSearchStatus: {
            ...context.cabinSearchStatus,
            claims: newClaims,
          },
        };
      }

      // All players have claimed - validate role distribution
      const claimValues = Object.values(newClaims);
      const hasCaptain = claimValues.includes("CAPTAIN");
      const hasNavigator = claimValues.includes("NAVIGATOR");
      const hasLieutenant = claimValues.includes("LIEUTENANT");

      if (!hasCaptain || !hasNavigator || !hasLieutenant) {
        // Invalid role distribution - cancel with reason
        const missing = [];
        if (!hasCaptain) missing.push("Captain");
        if (!hasNavigator) missing.push("Navigator");
        if (!hasLieutenant) missing.push("Lieutenant");

        return {
          cabinSearchStatus: {
            ...context.cabinSearchStatus,
            claims: newClaims,
            state: "CANCELLED" as const,
            cancellationReason: `Invalid role distribution|Missing required roles: ${missing.join(", ")}`,
          },
        };
      }

      // Valid distribution - transition to ACTIVE
      // Generate questions for all players
      const playerQuestions: Record<string, number> = {};
      activePlayers.forEach((p) => {
        playerQuestions[p.id] = Math.floor(Math.random() * 10);
      });

      return {
        cabinSearchStatus: {
          ...context.cabinSearchStatus,
          claims: newClaims,
          state: "ACTIVE" as const,
          startTime: Date.now(),
          playerQuestions,
          playerAnswers: {},
        },
      };
    }),

    submitCabinSearchAnswer: assign(({ context, event }) => {
      if (
        event.type !== "SUBMIT_CULT_CABIN_SEARCH_ACTION" ||
        !context.cabinSearchStatus
      )
        return {};
      return {
        cabinSearchStatus: {
          ...context.cabinSearchStatus,
          playerAnswers: {
            ...context.cabinSearchStatus.playerAnswers,
            [event.playerId]: event.answer,
          },
        },
      };
    }),

    completeCabinSearch: assign(({ context }) => {
      if (!context.cabinSearchStatus) return {};

      const playerQuestions = context.cabinSearchStatus.playerQuestions || {};
      const playerAnswers = context.cabinSearchStatus.playerAnswers || {};
      const correctAnswers: string[] = [];

      // Calculate correct answers
      Object.entries(playerAnswers).forEach(([playerId, answerId]) => {
        const questionIndex = playerQuestions[playerId];
        if (
          questionIndex !== undefined &&
          QUIZ_QUESTIONS[questionIndex] &&
          QUIZ_QUESTIONS[questionIndex].correctAnswer === answerId
        ) {
          correctAnswers.push(playerId);
        }
      });

      return {
        isCultCabinSearchUsed: true,
        cabinSearchStatus: {
          ...context.cabinSearchStatus,
          state: "COMPLETED" as const,
          result: { correctAnswers },
        },
      };
    }),

    cancelCabinSearch: assign(({ context, event }) => {
      if (
        event.type !== "CANCEL_CULT_CABIN_SEARCH" ||
        !context.cabinSearchStatus
      )
        return {};
      return {
        cabinSearchStatus: {
          ...context.cabinSearchStatus,
          state: "CANCELLED" as const,
          cancellationReason: `Cancelled by player ${event.playerId}`,
        },
      };
    }),

    clearCabinSearchStatus: assign({ cabinSearchStatus: undefined }),

    // Guns stash actions
    startGunsStash: assign(({ event }) => {
      if (event.type !== "START_CULT_GUNS_STASH") return {};
      return {
        gunsStashStatus: {
          initiatorId: event.initiatorId,
          state: "WAITING_FOR_PLAYERS" as const,
          readyPlayers: [event.initiatorId],
        },
      };
    }),

    confirmGunsStashReady: assign(({ context, event }) => {
      if (
        event.type !== "CONFIRM_CULT_GUNS_STASH_READY" ||
        !context.gunsStashStatus
      )
        return {};

      const readyPlayers = [...context.gunsStashStatus.readyPlayers];
      if (!readyPlayers.includes(event.playerId)) {
        readyPlayers.push(event.playerId);
      }

      return {
        gunsStashStatus: {
          ...context.gunsStashStatus,
          readyPlayers,
        },
      };
    }),

    // Called automatically when all cult members are ready
    startGunsDistribution: assign(({ context }) => {
      if (!context.gunsStashStatus) return {};

      // Generate questions for all players
      const playerQuestions: Record<string, number> = {};
      const activePlayers = context.players.filter((p) => !p.isEliminated);
      activePlayers.forEach((p) => {
        playerQuestions[p.id] = Math.floor(Math.random() * 10);
      });

      return {
        gunsStashStatus: {
          ...context.gunsStashStatus,
          state: "DISTRIBUTION" as const,
          startTime: Date.now(),
          playerQuestions,
          playerAnswers: {},
        },
      };
    }),

    submitGunsDistribution: assign(({ context, event }) => {
      if (
        event.type !== "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION" ||
        !context.gunsStashStatus
      )
        return {};
      return {
        gunsStashStatus: {
          ...context.gunsStashStatus,
          // Only update distribution, keep other fields intact
          distribution: event.distribution,
        },
      };
    }),

    submitGunsStashAnswer: assign(({ context, event }) => {
      if (
        event.type !== "SUBMIT_CULT_GUNS_STASH_ACTION" ||
        !context.gunsStashStatus
      )
        return {};
      return {
        gunsStashStatus: {
          ...context.gunsStashStatus,
          playerAnswers: {
            ...context.gunsStashStatus.playerAnswers,
            [event.playerId]: event.answer,
          },
        },
      };
    }),

    completeGunsStash: assign(({ context }) => {
      if (!context.gunsStashStatus) return {};

      // Get current distribution or empty object
      const currentDistribution = context.gunsStashStatus.distribution || {};
      const distributedGuns = Object.values(currentDistribution).reduce(
        (sum, count) => sum + count,
        0,
      );
      const remainingGuns = 3 - distributedGuns;

      // If all guns distributed, use current distribution as-is
      const finalDistribution = { ...currentDistribution };

      // If there are remaining guns, distribute randomly to active players
      if (remainingGuns > 0) {
        const activePlayers = context.players
          .filter((p) => !p.isEliminated)
          .map((p) => p.id);

        // Randomly assign each remaining gun to a random player
        for (let i = 0; i < remainingGuns; i++) {
          const randomPlayerId =
            activePlayers[Math.floor(Math.random() * activePlayers.length)];
          finalDistribution[randomPlayerId] =
            (finalDistribution[randomPlayerId] || 0) + 1;
        }
      }

      return {
        isGunsStashUsed: true,
        gunsStashStatus: {
          ...context.gunsStashStatus,
          state: "COMPLETED" as const,
          distribution: finalDistribution,
          results: { correctAnswers: [] },
        },
      };
    }),

    cancelGunsStash: assign(({ context, event }) => {
      if (event.type !== "CANCEL_CULT_GUNS_STASH" || !context.gunsStashStatus)
        return {};
      return {
        gunsStashStatus: {
          ...context.gunsStashStatus,
          state: "CANCELLED" as const,
          cancellationReason: `Cancelled by player ${event.playerId}`,
        },
      };
    }),

    clearGunsStashStatus: assign({ gunsStashStatus: undefined }),

    // Flogging actions
    startFlogging: assign(({ context, event }) => {
      if (event.type !== "FLOGGING_REQUEST") return {};
      // Find the initiator (the host/captain who initiated)
      const initiator = context.players.find((p) => p.isHost);
      return {
        floggingStatus: {
          initiatorId: initiator?.id ?? "",
          targetPlayerId: event.targetPlayerId,
          state: "PENDING" as const,
        },
      };
    }),

    executeFlogging: assign(({ context }) => {
      if (!context.floggingStatus || !context.assignments)
        return { isFloggingUsed: true };
      const targetId = context.floggingStatus.targetPlayerId;
      const targetRole = context.assignments[targetId];
      // Determine a "not role" - reveal what the player is NOT
      const notRole =
        targetRole === "CULT_LEADER"
          ? "SAILOR"
          : targetRole === "CULTIST"
            ? "PIRATE"
            : targetRole === "PIRATE"
              ? "SAILOR"
              : "PIRATE";
      return {
        isFloggingUsed: true,
        floggingStatus: {
          ...context.floggingStatus,
          state: "COMPLETED" as const,
          result: { notRole: notRole as Role },
        },
        players: context.players.map((p) =>
          p.id === targetId ? { ...p, notRole: notRole as Role } : p,
        ),
      };
    }),

    clearFloggingStatus: assign({ floggingStatus: undefined }),

    // Off with the Tongue actions
    startOffWithTongue: assign(({ event }) => {
      if (event.type !== "OFF_WITH_TONGUE_REQUEST") return {};
      return {
        offWithTongueStatus: {
          initiatorId: event.playerId,
          targetPlayerId: event.targetPlayerId,
          state: "PENDING" as const,
        },
      };
    }),

    executeOffWithTongue: assign(({ context }) => {
      if (!context.offWithTongueStatus) return {};
      const targetId = context.offWithTongueStatus.targetPlayerId;

      return {
        isOffWithTongueUsed: true,
        offWithTongueStatus: {
          ...context.offWithTongueStatus,
          state: "COMPLETED" as const,
          result: { outcome: "SILENCED" as const },
        },
        players: context.players.map((p) =>
          p.id === targetId ? { ...p, hasTongue: false } : p,
        ),
      };
    }),

    // Feed The Kraken actions
    startFeedTheKraken: assign(({ event }) => {
      if (event.type !== "FEED_THE_KRAKEN_REQUEST") return {};
      return {
        feedTheKrakenStatus: {
          initiatorId: event.playerId,
          targetPlayerId: event.targetPlayerId,
          state: "PENDING" as const,
        },
      };
    }),

    cancelFeedTheKraken: assign(({ context }) => ({
      feedTheKrakenStatus: context.feedTheKrakenStatus
        ? { ...context.feedTheKrakenStatus, state: "CANCELLED" }
        : undefined,
    })),

    executeFeedTheKraken: assign(({ context }) => {
      if (!context.feedTheKrakenStatus || !context.assignments) return {};

      const targetId = context.feedTheKrakenStatus.targetPlayerId;
      const targetRole = context.assignments[targetId];
      const isCultLeader = targetRole === "CULT_LEADER";

      return {
        feedTheKrakenStatus: {
          ...context.feedTheKrakenStatus,
          state: "COMPLETED" as const,
          result: {
            targetPlayerId: targetId,
            cultVictory: isCultLeader,
          },
        },
        players: context.players.map((p) => {
          if (p.id !== targetId) return p;

          // If Cult Leader is fed, what happens to them? They die, but Cult wins.
          // If not Cult Leader, they are eliminated.
          return {
            ...p,
            isEliminated: !isCultLeader, // Eliminated only if NOT cult victory (game ends anyway if cult wins)
            // Actually, if Cult Wins, game enters some finished state or just shows victory.
            // Standard logic: if Cult Leader is fed, Cult wins immediately.
            // If not, target is eliminated.
          };
        }),
        feedTheKrakenCount: (context.feedTheKrakenCount || 0) + 1,
      };
    }),

    clearFeedTheKrakenStatus: assign({
      feedTheKrakenStatus: undefined,
    }),

    clearOffWithTongueStatus: assign({ offWithTongueStatus: undefined }),
    resetGame: assign(({ context }) => {
      if (!context.initialGameState) return {};
      return {
        assignments: context.initialGameState.assignments,
        originalRoles: context.initialGameState.originalRoles,
        isFloggingUsed: false,
        isGunsStashUsed: false,
        isCultCabinSearchUsed: false,
        isOffWithTongueUsed: false,
        conversionCount: 0,
        feedTheKrakenCount: 0,
        cabinSearchCount: 0,
        convertedPlayerIds: [],

        // Clear all game status fields (matching backToLobby)
        conversionStatus: undefined,
        cabinSearchStatus: undefined,
        captainCabinSearchStatus: undefined,
        gunsStashStatus: undefined,
        floggingStatus: undefined,
        feedTheKrakenStatus: undefined,
        feedTheKrakenResult: undefined,
        offWithTongueStatus: undefined,

        players: context.players.map((p) => {
          const initial = context.initialGameState?.players.find(
            (ip) => ip.id === p.id,
          );
          if (initial) {
            return {
              ...p,
              isEliminated: initial.isEliminated,
              isUnconvertible: initial.isUnconvertible,
              notRole: initial.notRole,
              hasTongue: true,
            };
          }
          return {
            ...p,
            isEliminated: false,
            isUnconvertible: false,
            notRole: null,
            hasTongue: true,
          };
        }),
      };
    }),

    backToLobby: assign(({ context }) => ({
      assignments: undefined,
      originalRoles: undefined,
      roleSelectionStatus: undefined,
      isFloggingUsed: false,
      isGunsStashUsed: false,
      isCultCabinSearchUsed: false,
      isOffWithTongueUsed: false,
      conversionCount: 0,
      feedTheKrakenCount: 0,
      cabinSearchCount: 0,
      convertedPlayerIds: [],

      // Explicitly clear all game status fields
      conversionStatus: undefined,
      cabinSearchStatus: undefined,
      captainCabinSearchStatus: undefined,
      gunsStashStatus: undefined,
      floggingStatus: undefined,
      feedTheKrakenStatus: undefined,
      feedTheKrakenResult: undefined,
      offWithTongueStatus: undefined,

      initialGameState: undefined,
      players: context.players.map((p) => ({
        ...p,
        isReady: false,
        isEliminated: false,
        isUnconvertible: false,
        notRole: null,
        hasTongue: true,
      })),
    })),

    // Connection handling
    playerDisconnected: assign(({ context, event }) => {
      if (event.type !== "PLAYER_DISCONNECTED") return {};
      return {
        players: context.players.map((p) =>
          p.id === event.playerId ? { ...p, isOnline: false } : p,
        ),
      };
    }),

    playerReconnected: assign(({ context, event }) => {
      if (event.type !== "PLAYER_RECONNECTED") return {};
      return {
        players: context.players.map((p) =>
          p.id === event.playerId ? { ...p, isOnline: true } : p,
        ),
      };
    }),

    eliminatePlayer: assign(({ context, event }) => {
      if (event.type !== "DENIAL_OF_COMMAND") return {};
      return {
        players: context.players.map((p) =>
          p.id === event.playerId ? { ...p, isEliminated: true } : p,
        ),
      };
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswDoA2B7ARvgJ6ZhoAOALkQMQDCASgKICCAKkwPoAyA8gEL8AmgG0ADAF1EocrlgBLSvNwA7aSAAeiAEwBOXQA5MAFgCsAZm0A2c2OPmLVgDQgiiKwHZzmG6e3-jKwMrbQ8PAF9wl1QMHAJiTAB3FEV5FSgaACleAEkAOR4BYXEpJBBZBSVVdS0EbWMDXUwLAEZzewNgtpsXNwRdbSMQho87FrEvCKiQGKw8QhJk1PSablYANS4+QVFJdQrU6rLawZarH1MbMTsxA39dXsRg02bjFsC2j10HTsjo9Dm8UWKSUKzWLE2hR2IhapRkckOamOOgaxkwBlMujMjXauisplMjwQBksPg8LQ8pjEugJ5nJxj+MwBcQWSRBaQyAGkcnROZwAArcFhCJgMEr7BFVJGgE4GM4XK43O56IkeKxNUyddotAbmfSWRmzFkJJagrk8vmC4WimFw8qS5TSzQozGYcZYlqXakDKzOVyILzncnBcye67XTWG5nzE3slYAVX5ABF2Fx+QxeAAxHJrcVlA5Smo6PxNDGegbGcmmYzfIlWYxiTBqgktbR2QIN7RR2Ix4HLDIsJNJzj8XhsPPwyqOot1KmNvHjYzGNvBLzaInVtFy7R67SagYeQLdwGs00cmgAZSYbE4GbWnCTOQvbAYOX48bYOV4BQAsrwk0wE72lORwyiiXiYIYS6anKQS3ESS5GBiB6huYerUsexp9mal5sCwDA3gA4iwP6AXs+YOqBzoIH4RJyiY+g0l4JK6GIVitphvZsv2uH4URJGAbCEogU6tS0f6dR6C0Ph0i0OrVkElYGJxQLcThVoigwD5PnQ355EwdAcEmQEFtOyKzmI0kEqinr1ronxEg42iQWxnrmJ4GL2PYKmnnGGQaaKt4GXpBlGSZlGicWdgmAYS6hpiAw7kSe7nDStjtP4oZhLFmHkNgKBEBymAAE64NgYAXmA5UAMZSpeTBrIZt68Lm5GToiM7Vo2fjtKMlj1A2DwSeYjQmDWvqdONOq5flhXpCVZUVVVYC1Y69DftmDA-s1rV2qZVFiWhzS2cujSXLFBjJd8DH4jWerLhYDLTEaeUFUVpXlZVNV1XQLB5HQDU7VwV6NZ+37hSJM7aO8qWtJYrGeqEyWulYYgJXSnhtvWM1vfNH1Ld9a0Qx15nWNJQSUmxsXsTq5gIZS6Knd8e5ueqONzVAmDyBA5W8QRnC6XkmwMBeX55MThbmboHjJWIDgmGhdy3O8ctHs9zKvRzXM82A9AsPw+ScFe+F0AAEkFACK8ZMM+EtmWBCCejqTb4gSeiUuxBJEm0nRuux1xnJZliRursSa0V3O85mfCEYR+SEZb1u221wEkw77xUpBdLYmjBgeG2dMSZiaKGI0y4F58Xah1g4fzZHuvPnxAvxtwN6-QbBTGwwZt2wdiCBB4mCnG5LSdASJLe6YEE6niWr2O8e7sxHOt823LdEfGeQXkbeEXqbveRQgA9D3KI9j5qhd9Dq9TNDBBjUvndxTP8YezcvUdMEww5sKbXCcgwLBORMAKMwK2Ntxwp32ofPcg86RznJJSPUrZVSaiHniakFg7D2QJEvOuK8syZk4AAdRyD-TgbBvyEWtoncBB8ZxOyaM2N20tLiekJBJcYEELpmDlr6SkLRcGc3rjQfgLBeTkN4FCYokCIpQxhpBOGehLJ+Blhw64zkA56hGnLH45hBHa15swK8-FSJ0PMu8DwRhLj1FCGxBo9ZvZSQUcGUw7w86tiei-Gub88G8wClpR8F5Bb6UMl-Mx6d7AvHdCNU+dIkocJ1Oca4DZ8TqjQoEZS1dMC1yESvfxQVgmhTCTIyG5iOiYDlqxTBA97Le3GI2NG1JAg7i+HKTxTJX6405tVVQAA3MAxUFCqGyWAFQEBzxGP5N+Ycgthai3BiUtO1E2jrjUaxW+DZPTBErKPKuXjsk+O6X0gZQyVAjLGeecJ1FEqYHQjYVs9YH6qKvqhW5DYGijwjFiZ+HTvFdMwD0lQ-TBmOnOeMlYtphJLNqO5Qe3xKY6k9OSJidTgiMzRhSXcYQvj6MBcC05mAUCrX6ZeeM-AfykIFt+OZYtOBiLBuLRZksHYJWaJY7oeI0IWHYVfak0kRr530NYayId9k5IBSgfAaRKooGKtVAAFiwVaqg9YdyNqwbu5tJnfivFc2oDCXYEhLB7NhjiBhDwmJ0aGZh0F7N+Qc-51VJXSrALKhVSqfr60Nl3M2QULxTK3oJPasjzGuMYa7Y1rCvYJPVOiZR6plRyV9PogAZngKAUAOQerWtHXgsd45UryJtH87BaXasDXqxA7wGxZ0PJqXO+c5YIX0BUhwmMaRiD3A0VN6bM3pGzSq3N+a8gJ0FsW0t34-UBt1UJCipSIm2FrTnTUjbL79zlhUu4tIawNEaHal6hyAUAFdsCUDoM6lQMq5XyvoEKHI206DrwFl6zuGrfV3jIsG+d1FMSNgpLTdiWJrjkm9iMCphhbj2BpNYqwuKT1novVehVpLyWUsfa3Z9aqfXm3pWLStNE1QmD0OqAYU887Um9kgt0S48Q7sstLPRWTxXVXg+eqVl7XXXr1v9QG6G24vvVSbfeTL7bXP8Lc1i9zrCDTCJR107Q7BeC9GlTJYrD0sdPWxl1bqb34ciT4Jp9Ydx2EsGux2HymwDwxJNL4h59FQCPSoWAF5KAoFgDesdOQtrNww1QreO8WB7yCoOXYX7oXuA3TYlp9ZlwNDM6PEaJgp5UgpNDPw-h7OOec659zKGKVr185vbejcguBJfG+D8eGRN9xoncN0TTLETFpDSb2h5nJUg6P4X0tkfkHv+Q5pzLm3M3ovGS-LPmN7+ZKzhwyVWwvMuoqjJJSCJiWspPEq+9ZzgtmsKcCY9lMuDZyx5v6ANuATc4H54ru9hPzdE7UY+w9Wjnwnhw8kjYSOuJsN8VsbRDvZeGzQPTngT5yWexiC+3sSTeHGJcSx9ksRxdTWASAbB5VgE5MVFAABrUZNBMyf2-r-Tg-9AHAKnTqz9UKFsnBB3A4DFILD2VWX0TyQ8azWrVJ20+yPUfo8xzjvHBOv7kOJ6ToBICbbTqDdT+7iAbl3NDNJp5RIO0Wp3BlE6nh9G4BTSmohih5VsFUA5sAA6VA0AIcQ0h5sKEjuoeW3V1XD5uPnNnetK6C6q7COiNKth7I+1cTrvXBvKBG5N0es3yqLdW5IWQu3VCuCO5l3O8L5nRhLo93nL3ElOjSSxP4OSZhUbyUwimtI8h3OQBEWIvkFCpGhdlzV61sNUJKMRs8nQbi-Zo0xHKey+JIjTBULgCAcB1CzCb4fAAtMgiS0+knhiX8v6GPliBT6hm8aS7o3jKZ9H6TbTQzC2DVCxUIqW18kDIFQPo7UaeICyoPOWHKGi3DxDygMNJbluPzv+w8at9kuIzx0gN9SZLgmhhVLhUZ74QxO9HZO0NQwhDBDButO1YMmNDlQCHZ3JZYXh9B8R-0wdOhvh9F8YvoVoFsoEZwW1MRs4846Rgg2ID9+51lOxLESQsFqZ9F64sDlk20FZDxfQbAQgFJKNzV7I5Y7BUYGxLFcVjkQUqIqDzJYpvZrhvA0Z0JggSQ9Bqw5CgUTlQVyBRlwUoBeD9VrpLA5Y9w1D1RNQ6l7JmgJg2gLA2xbgRo9D8VQUiUlB+kzD3AsQTA2IUpHA858R7DnIFM3hs8+V3hcVENON3Vo8-DHYA9IIggSN2IRpRCOEsos4lxWwtFyQKQe1cAM0s0kjU978UiKRAiQhLIwhoZocNwb41R-BGs8Q1RKw4NNN4idNkiKQ0RxhA45J3Qgho0r4YIKlXEC4MRqRBh90NZD0BsAd3NkjoZpJj8qZOhPArhLoOFvgj9xgQg5JT885VN7VxUU0UcIA0cMcsdccnQlCHY85VcQhb4Roax852hLB2k+stZdd9dDdjd0hI9zd+jWJnJUZ4VPh7BdxVCN1jiuhyxuh0D9ly8VBK90cIBkjxI+hoZyRblgggNrADiaQh9wggA */
  id: "game",
  initial: "lobby",
  context: initialContext,

  states: {
    lobby: {
      initial: "empty",
      states: {
        empty: {
          on: {
            CREATE_LOBBY: {
              target: "waiting",
              actions: "addHostPlayer",
            },
          },
        },

        waiting: {
          on: {
            JOIN_LOBBY: {
              guard: "canJoinLobby",
              actions: "addPlayer",
            },
            LEAVE_LOBBY: [
              {
                guard: "lastPlayerLeaving",
                target: "empty",
                actions: "removePlayer",
              },
              {
                actions: "removePlayer",
              },
            ],
            KICK_PLAYER: [
              {
                guard: "lastKickedPlayerLeaving",
                target: "empty",
                actions: "kickPlayer",
              },
              {
                guard: "canKickPlayer",
                actions: "kickPlayer",
              },
            ],
            UPDATE_PROFILE: {
              actions: "updateProfile",
            },
            ADD_BOT: {
              guard: "canJoinLobby",
              actions: "addBot",
            },
            SET_ROLE_DISTRIBUTION_MODE: {
              actions: "setRoleDistributionMode",
            },
            START_GAME: [
              {
                guard: "canStartManual",
                target: "#game.playing.roleSelection",
                actions: "initManualRoleSelection",
              },
              {
                guard: "canStartAutomatic",
                target: "#game.playing.idle",
                actions: "assignRolesAutomatic",
              },
            ],
            PLAYER_DISCONNECTED: {
              actions: "playerDisconnected",
            },
            PLAYER_RECONNECTED: {
              actions: "playerReconnected",
            },
          },
        },
      },
    },

    playing: {
      on: {
        JOIN_LOBBY: {
          actions: "addPlayer",
        },
        // RESET_GAME should work from any playing state, not just idle
        RESET_GAME: {
          target: ".idle",
          actions: "resetGame",
        },
      },
      initial: "idle",
      states: {
        roleSelection: {
          on: {
            SELECT_ROLE: {
              actions: "selectRole",
            },
            CONFIRM_ROLE: {
              actions: "confirmRole",
            },
            CANCEL_ROLE_SELECTION: {
              target: "#game.lobby.waiting",
              actions: "cancelRoleSelection",
            },
          },
          always: [
            {
              guard: "roleSelectionInvalid",
              target: "#game.lobby.waiting",
              actions: "cancelRoleSelectionInvalid",
            },
            {
              guard: "allRolesConfirmed",
              target: "idle",
              actions: "finalizeManualRoles",
            },
          ],
        },

        idle: {
          on: {
            START_CONVERSION: {
              guard: "conversionNotAtLimit",
              target: "conversion",
              actions: "startConversion",
            },
            CABIN_SEARCH_REQUEST: {
              guard: "cabinSearchNotAtLimit",
              target: "cabinSearchAction",
              actions: "startCaptainCabinSearch",
            },
            FLOGGING_REQUEST: {
              guard: "floggingNotUsed",
              target: "floggingAction",
              actions: "startFlogging",
            },
            DENIAL_OF_COMMAND: {
              actions: "eliminatePlayer",
            },
            START_CULT_CABIN_SEARCH: {
              guard: "cabinSearchNotUsed",
              target: "cultCabinSearch",
              actions: "startCultCabinSearch",
            },
            START_CULT_GUNS_STASH: {
              guard: "gunsStashNotUsed",
              target: "gunsStash",
              actions: "startGunsStash",
            },
            FEED_THE_KRAKEN_REQUEST: {
              guard: "feedTheKrakenNotAtLimit",
              target: "feedTheKraken",
              actions: "startFeedTheKraken",
            },
            OFF_WITH_TONGUE_REQUEST: {
              guard: "offWithTongueNotUsed",
              target: "offWithTongueAction",
              actions: "startOffWithTongue",
            },
            BACK_TO_LOBBY: {
              guard: "isHost",
              target: "#game.lobby.waiting",
              actions: "backToLobby",
            },
            PLAYER_DISCONNECTED: {
              actions: "playerDisconnected",
            },
            PLAYER_RECONNECTED: {
              actions: "playerReconnected",
            },
          },
        },

        conversion: {
          initial: "pending",
          states: {
            pending: {
              on: {
                RESPOND_CONVERSION: {
                  actions: "respondConversion",
                },
              },
              always: [
                {
                  guard: "conversionCancelled",
                  target: "#game.playing.idle",
                  // Don't clear - let UI show the cancellation message
                },
                {
                  guard: "conversionActive",
                  target: "active",
                },
              ],
            },
            active: {
              on: {
                SUBMIT_CONVERSION_ACTION: {
                  actions: "submitConversionAction",
                },
              },
              after: {
                // Timer starts when entering active state (after all accept)
                [QUIZ_DURATION_MS + 100]: {
                  target: "#game.playing.idle",
                  actions: "completeConversion",
                },
              },
            },
          },
        },

        cabinSearchAction: {
          on: {
            CABIN_SEARCH_RESPONSE: [
              {
                guard: "isConfirmed",
                target: "idle",
                actions: ["completeCaptainCabinSearch"],
              },
              {
                target: "idle",
                actions: [
                  "cancelCaptainCabinSearch",
                  "clearCaptainCabinSearchStatus",
                ],
              },
            ],
          },
        },

        floggingAction: {
          on: {
            FLOGGING_CONFIRMATION_RESPONSE: [
              {
                guard: "isConfirmed",
                target: "idle",
                actions: ["executeFlogging"],
              },
              {
                target: "idle",
                actions: "clearFloggingStatus",
              },
            ],
          },
        },

        cultCabinSearch: {
          initial: "setup",
          on: {
            CANCEL_CULT_CABIN_SEARCH: {
              target: "idle",
              actions: "cancelCabinSearch",
            },
          },
          // Note: We intentionally do NOT clear cabinSearchStatus on COMPLETED
          // The client needs to display the results before the user navigates away
          states: {
            setup: {
              on: {
                CLAIM_CULT_CABIN_SEARCH_ROLE: {
                  actions: "claimCabinSearchRole",
                },
              },
              always: [
                {
                  // Transition to active when state becomes ACTIVE (set by claimCabinSearchRole action)
                  guard: "cabinSearchActive",
                  target: "active",
                },
                {
                  guard: "cabinSearchCancelled",
                  target: "#game.playing.idle",
                },
              ],
            },
            active: {
              on: {
                SUBMIT_CULT_CABIN_SEARCH_ACTION: {
                  actions: "submitCabinSearchAnswer",
                },
              },
              after: {
                // Timer starts when entering active state (15 seconds + buffer)
                15100: {
                  actions: "completeCabinSearch",
                  target: "#game.playing.idle",
                },
              },
            },
          },
        },

        gunsStash: {
          initial: "waiting",
          on: {
            CANCEL_CULT_GUNS_STASH: {
              target: "idle",
              actions: ["cancelGunsStash"],
            },
          },
          states: {
            waiting: {
              on: {
                CONFIRM_CULT_GUNS_STASH_READY: {
                  actions: "confirmGunsStashReady",
                },
              },
              always: [
                {
                  // When all cult members are ready, transition to distribution
                  guard: "gunsStashAllReady",
                  target: "distribution",
                  actions: "startGunsDistribution",
                },
              ],
            },
            distribution: {
              on: {
                SUBMIT_CULT_GUNS_STASH_DISTRIBUTION: {
                  actions: "submitGunsDistribution",
                },
                SUBMIT_CULT_GUNS_STASH_ACTION: {
                  actions: "submitGunsStashAnswer",
                },
              },
              after: {
                // Timer for distribution phase (15 seconds + buffer)
                15100: {
                  actions: "completeGunsStash",
                  target: "#game.playing.idle",
                },
              },
            },
          },
        },

        feedTheKraken: {
          on: {
            FEED_THE_KRAKEN_RESPONSE: [
              {
                guard: "isConfirmed",
                target: "idle",
                actions: ["executeFeedTheKraken"],
              },
              {
                target: "idle",
                actions: "cancelFeedTheKraken",
              },
            ],
          },
        },

        offWithTongueAction: {
          on: {
            OFF_WITH_TONGUE_RESPONSE: [
              {
                guard: "isConfirmed",
                target: "idle",
                actions: ["executeOffWithTongue"],
              },
              {
                target: "idle",
                actions: "clearOffWithTongueStatus",
              },
            ],
          },
        },
      },
    },

    finished: {
      on: {
        BACK_TO_LOBBY: {
          target: "#game.lobby.waiting",
          actions: "backToLobby",
        },
      },
    },
  },
});

// =============================================================================
// Export Types
// =============================================================================

export type GameMachine = typeof gameMachine;

// Re-export the snapshot type from types.ts for simplicity
export type { GameSnapshot as GameMachineSnapshot } from "./types";
