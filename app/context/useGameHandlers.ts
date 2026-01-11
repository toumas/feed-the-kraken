"use client";

import type PartySocket from "partysocket";
import { useCallback } from "react";
import type { MessagePayload, Role } from "../types";

type SendMessageFn = (message: MessagePayload) => void;

type ModalType =
  | "conversion"
  | "cabinSearch"
  | "gunsStash"
  | "flogging"
  | "captainCabinSearch"
  | "feedTheKraken";

interface GameHandlersConfig {
  socket: PartySocket | null;
  myPlayerId: string;
  cabinSearchPrompt: { searcherId: string; searcherName: string } | null;
  floggingConfirmationPrompt: { hostId: string; hostName: string } | null;
  feedTheKrakenPrompt: { captainId: string; captainName: string } | null;
  offWithTonguePrompt: { captainId: string; captainName: string } | null;
  dismissOtherModals: (exclude?: ModalType) => void;
}

export function useGameHandlers(config: GameHandlersConfig) {
  const {
    socket,
    myPlayerId,
    cabinSearchPrompt,
    floggingConfirmationPrompt,
    feedTheKrakenPrompt,
    offWithTonguePrompt,
    dismissOtherModals,
  } = config;

  const sendMessage: SendMessageFn = useCallback(
    (message: MessagePayload) => {
      if (socket) {
        socket.send(JSON.stringify(message));
      }
    },
    [socket],
  );

  // ==========================================================================
  // Core Game Actions
  // ==========================================================================

  const handleDenialOfCommand = useCallback(() => {
    sendMessage({ type: "DENIAL_OF_COMMAND", playerId: myPlayerId });
  }, [sendMessage, myPlayerId]);

  const handleResetGame = useCallback(() => {
    sendMessage({ type: "RESET_GAME" });
  }, [sendMessage]);

  const handleBackToLobby = useCallback(() => {
    console.log("GameContext: Sending BACK_TO_LOBBY message");
    sendMessage({ type: "BACK_TO_LOBBY", playerId: myPlayerId });
  }, [sendMessage, myPlayerId]);

  // ==========================================================================
  // Captain's Cabin Search Actions
  // ==========================================================================

  const handleCabinSearch = useCallback(
    (targetPlayerId: string) => {
      // setIsCabinSearchPending is removed as pending state is derived
      sendMessage({
        type: "CABIN_SEARCH_REQUEST",
        playerId: myPlayerId,
        targetPlayerId,
      });
    },
    [sendMessage, myPlayerId],
  );

  const handleCabinSearchResponse = useCallback(
    (confirmed: boolean) => {
      if (cabinSearchPrompt) {
        sendMessage({
          type: "CABIN_SEARCH_RESPONSE",
          searcherId: cabinSearchPrompt.searcherId,
          confirmed,
        });
      }
    },
    [sendMessage, cabinSearchPrompt],
  );

  // ==========================================================================
  // Flogging Actions
  // ==========================================================================

  const handleFloggingRequest = useCallback(
    (targetPlayerId: string) => {
      sendMessage({ type: "FLOGGING_REQUEST", targetPlayerId });
    },
    [sendMessage],
  );

  const handleFloggingConfirmationResponse = useCallback(
    (confirmed: boolean) => {
      if (floggingConfirmationPrompt) {
        sendMessage({
          type: "FLOGGING_CONFIRMATION_RESPONSE",
          hostId: floggingConfirmationPrompt.hostId,
          confirmed,
        });
      }
    },
    [sendMessage, floggingConfirmationPrompt],
  );

  // ==========================================================================
  // Conversion Actions
  // ==========================================================================

  const handleStartConversion = useCallback(() => {
    sendMessage({ type: "START_CONVERSION", initiatorId: myPlayerId });
  }, [sendMessage, myPlayerId]);

  const handleRespondConversion = useCallback(
    (accept: boolean) => {
      if (accept) {
        dismissOtherModals("conversion");
      }
      sendMessage({
        type: "RESPOND_CONVERSION",
        playerId: myPlayerId,
        accept,
      });
    },
    [sendMessage, myPlayerId, dismissOtherModals],
  );

  const submitConversionAction = useCallback(
    (
      action: "PICK_PLAYER" | "ANSWER_QUIZ",
      targetId?: string,
      answer?: string,
    ) => {
      if (!myPlayerId) return;
      sendMessage({
        type: "SUBMIT_CONVERSION_ACTION",
        playerId: myPlayerId,
        action,
        targetId,
        answer,
      });
    },
    [sendMessage, myPlayerId],
  );

  // ==========================================================================
  // Cult Cabin Search Actions
  // ==========================================================================

  const startCabinSearch = useCallback(() => {
    console.log("GameContext: Sending start cabin search message...");
    sendMessage({
      type: "START_CULT_CABIN_SEARCH",
      initiatorId: myPlayerId,
    });
  }, [sendMessage, myPlayerId]);

  const claimCabinSearchRole = useCallback(
    (role: "CAPTAIN" | "NAVIGATOR" | "LIEUTENANT" | "CREW") => {
      dismissOtherModals("cabinSearch");
      sendMessage({
        type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
        playerId: myPlayerId,
        role,
      });
    },
    [sendMessage, myPlayerId, dismissOtherModals],
  );

  const submitCabinSearchAction = useCallback(
    (answer: string) => {
      sendMessage({
        type: "SUBMIT_CULT_CABIN_SEARCH_ACTION",
        playerId: myPlayerId,
        answer,
      });
    },
    [sendMessage, myPlayerId],
  );

  const cancelCabinSearch = useCallback(() => {
    sendMessage({
      type: "CANCEL_CULT_CABIN_SEARCH",
      playerId: myPlayerId,
    });
  }, [sendMessage, myPlayerId]);

  // ==========================================================================
  // Guns Stash Actions
  // ==========================================================================

  const startGunsStash = useCallback(() => {
    sendMessage({
      type: "START_CULT_GUNS_STASH",
      initiatorId: myPlayerId,
    });
  }, [sendMessage, myPlayerId]);

  const confirmGunsStashReady = useCallback(() => {
    dismissOtherModals("gunsStash");
    sendMessage({
      type: "CONFIRM_CULT_GUNS_STASH_READY",
      playerId: myPlayerId,
    });
  }, [sendMessage, myPlayerId, dismissOtherModals]);

  const submitGunsStashDistribution = useCallback(
    (distribution: Record<string, number>) => {
      sendMessage({
        type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
        playerId: myPlayerId,
        distribution,
      });
    },
    [sendMessage, myPlayerId],
  );

  const cancelGunsStash = useCallback(() => {
    sendMessage({
      type: "CANCEL_CULT_GUNS_STASH",
      playerId: myPlayerId,
    });
  }, [sendMessage, myPlayerId]);

  const submitGunsStashAction = useCallback(
    (answer: string) => {
      sendMessage({
        type: "SUBMIT_CULT_GUNS_STASH_ACTION",
        playerId: myPlayerId,
        answer,
      });
    },
    [sendMessage, myPlayerId],
  );

  // ==========================================================================
  // Feed the Kraken Actions
  // ==========================================================================

  const handleFeedTheKrakenRequest = useCallback(
    (targetPlayerId: string) => {
      sendMessage({
        type: "FEED_THE_KRAKEN_REQUEST",
        playerId: myPlayerId,
        targetPlayerId,
      });
    },
    [sendMessage, myPlayerId],
  );

  const handleFeedTheKrakenResponse = useCallback(
    (confirmed: boolean) => {
      if (feedTheKrakenPrompt) {
        sendMessage({
          type: "FEED_THE_KRAKEN_RESPONSE",
          captainId: feedTheKrakenPrompt.captainId,
          confirmed,
        });
      }
    },
    [sendMessage, feedTheKrakenPrompt],
  );

  // ==========================================================================
  // Off with the Tongue Actions
  // ==========================================================================

  const handleOffWithTongueRequest = useCallback(
    (targetPlayerId: string) => {
      sendMessage({
        type: "OFF_WITH_TONGUE_REQUEST",
        playerId: myPlayerId,
        targetPlayerId,
      });
    },
    [sendMessage, myPlayerId],
  );

  const handleOffWithTongueResponse = useCallback(
    (confirmed: boolean) => {
      if (offWithTonguePrompt) {
        sendMessage({
          type: "OFF_WITH_TONGUE_RESPONSE",
          captainId: offWithTonguePrompt.captainId,
          confirmed,
        });
      }
    },
    [sendMessage, offWithTonguePrompt],
  );

  // ==========================================================================
  // Role Selection Actions
  // ==========================================================================

  const setRoleDistributionMode = useCallback(
    (mode: "automatic" | "manual") => {
      sendMessage({
        type: "SET_ROLE_DISTRIBUTION_MODE",
        mode,
      });
    },
    [sendMessage],
  );

  const selectRole = useCallback(
    (role: Role) => {
      sendMessage({
        type: "SELECT_ROLE",
        playerId: myPlayerId,
        role,
      });
    },
    [sendMessage, myPlayerId],
  );

  const confirmRole = useCallback(() => {
    sendMessage({
      type: "CONFIRM_ROLE",
      playerId: myPlayerId,
    });
  }, [sendMessage, myPlayerId]);

  const cancelRoleSelection = useCallback(() => {
    sendMessage({
      type: "CANCEL_ROLE_SELECTION",
      playerId: myPlayerId,
    });
  }, [sendMessage, myPlayerId]);

  return {
    sendMessage,
    // Core actions
    handleDenialOfCommand,
    handleResetGame,
    handleBackToLobby,
    handleCabinSearch,
    handleCabinSearchResponse,
    // Flogging
    handleFloggingRequest,
    handleFloggingConfirmationResponse,
    // Conversion
    handleStartConversion,
    handleRespondConversion,
    submitConversionAction,
    // Cult cabin search
    startCabinSearch,
    claimCabinSearchRole,
    submitCabinSearchAction,
    cancelCabinSearch,
    // Guns stash
    startGunsStash,
    confirmGunsStashReady,
    submitGunsStashDistribution,
    cancelGunsStash,
    submitGunsStashAction,
    // Feed the kraken
    handleFeedTheKrakenRequest,
    handleFeedTheKrakenResponse,
    // Off with tongue
    handleOffWithTongueRequest,
    handleOffWithTongueResponse,
    // Role selection
    setRoleDistributionMode,
    selectRole,
    confirmRole,
    cancelRoleSelection,
  };
}
