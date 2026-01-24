"use client";

import usePartySocket from "partysocket/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useT } from "../i18n/client";
import {
  type ConnectionStatus,
  type LobbyState,
  type MessagePayload,
  MIN_PLAYERS,
  type Role,
} from "../types";
import { useGameHandlers } from "./useGameHandlers";

export interface GameContextValue {
  // User State
  myPlayerId: string;
  myName: string;
  myPhoto: string | null;
  updateMyProfile: (name: string, photoUrl: string | null) => void;

  // Lobby State
  lobby: LobbyState | null;
  myRole: Role | null;
  connectionStatus: ConnectionStatus;
  connectToLobby: (lobbyCode: string, initialPayload?: MessagePayload) => void;
  disconnectFromLobby: () => void;
  createLobby: (overrideName?: string, overridePhoto?: string | null) => void;
  joinLobby: (
    codeEntered: string,
    overrideName?: string,
    overridePhoto?: string | null,
  ) => void;
  leaveLobby: () => void;
  startGame: () => void;
  addBotPlayer: () => void;
  kickPlayer: (targetPlayerId: string) => void;

  // Game Actions
  handleDenialOfCommand: () => void;
  handleCabinSearch: (targetPlayerId: string) => void;
  handleCabinSearchResponse: (confirmed: boolean) => void;

  // Flogging Actions
  // Flogging Actions
  // Flogging Actions
  handleFloggingRequest: (targetPlayerId: string) => void;
  handleFloggingConfirmationResponse: (confirmed: boolean) => void;
  floggingConfirmationPrompt: { hostId: string; hostName: string } | null;
  floggingReveal: { targetPlayerId: string; revealedRole: Role } | null;
  clearFloggingReveal: () => void;

  // Conversion Actions
  handleStartConversion: () => void;
  handleRespondConversion: (accept: boolean) => void;
  submitConversionAction: (
    action: "PICK_PLAYER" | "ANSWER_QUIZ",
    targetId?: string,
    answer?: string,
  ) => void;
  isConversionDismissed: boolean;
  setIsConversionDismissed: (dismissed: boolean) => void;
  isCabinSearchDismissed: boolean;
  setIsCabinSearchDismissed: (dismissed: boolean) => void;

  // Reset Game
  handleResetGame: () => void;
  handleBackToLobby: () => void;

  // Cabin Search State
  cabinSearchPrompt: { searcherId: string; searcherName: string } | null;
  cabinSearchResult: {
    targetPlayerId: string;
    role: Role;
    originalRole?: Role;
  } | null;
  isCabinSearchPending: boolean;
  clearCabinSearchResult: () => void;

  // New Cult Cabin Search Actions
  startCabinSearch: () => void;
  claimCabinSearchRole: (
    role: "CAPTAIN" | "NAVIGATOR" | "LIEUTENANT" | "CREW",
  ) => void;
  submitCabinSearchAction: (answer: string) => void;
  cancelCabinSearch: () => void;

  // Cult's Guns Stash Actions
  startGunsStash: () => void;
  confirmGunsStashReady: () => void;
  submitGunsStashDistribution: (distribution: Record<string, number>) => void;
  submitGunsStashAction: (answer: string) => void;
  cancelGunsStash: () => void;
  isGunsStashDismissed: boolean;
  setIsGunsStashDismissed: (dismissed: boolean) => void;

  // Feed the Kraken Actions
  handleFeedTheKrakenRequest: (targetPlayerId: string) => void;
  handleFeedTheKrakenResponse: (confirmed: boolean) => void;
  feedTheKrakenPrompt: { captainId: string; captainName: string } | null;
  feedTheKrakenResult: { targetPlayerId: string; cultVictory: boolean } | null;
  isFeedTheKrakenPending: boolean;
  clearFeedTheKrakenResult: () => void;

  // Off with the Tongue Actions
  handleOffWithTongueRequest: (targetPlayerId: string) => void;
  handleOffWithTongueResponse: (confirmed: boolean) => void;
  offWithTonguePrompt: { captainId: string; captainName: string } | null;
  isOffWithTonguePending: boolean;

  // Role Selection Actions (for manual mode)
  setRoleDistributionMode: (mode: "automatic" | "manual") => void;
  selectRole: (role: Role) => void;
  confirmRole: () => void;
  cancelRoleSelection: () => void;

  // UI State
  error: string | null;
  setError: (error: string | null) => void;
  view: string; // "HOME" | "JOIN" | "LOBBY" | "GAME" | "PROFILE_SETUP" (managed locally in page.tsx mostly, but exposed if needed?)
  // Actually, view state is better kept local to page.tsx for navigation,
  // but we might need to trigger view changes from context (e.g. on game start).
  // For now, let's expose a way to set view or just let page.tsx handle it via effects on lobby state.
  // For now, let's expose a way to set view or just let page.tsx handle it via effects on lobby state.
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT("common");

  // --- State ---
  const [error, setError] = useState<string | null>(null);

  // User State
  const [myPlayerId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("kraken_player_id");
      if (stored) return stored;
      const newId = `player_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("kraken_player_id", newId);
      return newId;
    }
    return `player_${Math.random().toString(36).substr(2, 9)}`;
  });

  const [myName, setMyName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kraken_player_name") || "";
    }
    return "";
  });

  const [myPhoto, setMyPhoto] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kraken_player_photo");
    }
    return null;
  });

  // Lobby State
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);

  // PartyKit connection
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Current lobby code for the usePartySocket hook
  const [currentLobbyCode, setCurrentLobbyCode] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("kraken_lobby_code");
      }
      return null;
    },
  );

  // Refs for socket handlers (avoid stale closures)
  const myPlayerIdRef = useRef(myPlayerId);
  const myNameRef = useRef(myName);
  const myPhotoRef = useRef(myPhoto);
  const tRef = useRef(t);
  // Track whether next connection should be CREATE or JOIN
  const pendingMessageTypeRef = useRef<"CREATE_LOBBY" | "JOIN_LOBBY">(
    "JOIN_LOBBY",
  );
  // Track whether player was ever in the lobby (to detect kicks vs initial join)
  const wasInLobbyRef = useRef(false);

  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
    myNameRef.current = myName;
    myPhotoRef.current = myPhoto;
    tRef.current = t;
  }, [myPlayerId, myName, myPhoto, t]);

  // Cabin Search State
  // Cabin Search State
  // We need local dismissal for the result modal (for the searcher)
  const [isCabinSearchResultDismissed, setIsCabinSearchResultDismissed] =
    useState(() => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("kraken_cabin_search_dismissed") === "true";
      }
      return false;
    });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "kraken_cabin_search_dismissed",
        String(isCabinSearchResultDismissed),
      );
    }
  }, [isCabinSearchResultDismissed]);

  // Reset dismissal when a new search starts
  useEffect(() => {
    if (lobby?.captainCabinSearchStatus?.state === "PENDING") {
      setIsCabinSearchResultDismissed(false);
    }
  }, [lobby?.captainCabinSearchStatus?.state]);

  const cabinSearchPrompt = useMemo(() => {
    if (
      lobby?.captainCabinSearchStatus?.state === "PENDING" &&
      lobby?.captainCabinSearchStatus?.targetPlayerId === myPlayerId
    ) {
      const searcher = lobby.players.find(
        (p) => p.id === lobby.captainCabinSearchStatus?.searcherId,
      );
      return {
        searcherId: lobby.captainCabinSearchStatus.searcherId,
        searcherName: searcher?.name || "The Captain",
      };
    }
    return null;
  }, [
    lobby?.captainCabinSearchStatus?.state,
    lobby?.captainCabinSearchStatus?.targetPlayerId,
    lobby?.captainCabinSearchStatus?.searcherId,
    lobby?.players,
    myPlayerId,
  ]);

  const cabinSearchResult = useMemo(() => {
    if (
      lobby?.captainCabinSearchStatus?.state === "COMPLETED" &&
      lobby?.captainCabinSearchStatus?.searcherId === myPlayerId &&
      !isCabinSearchResultDismissed &&
      lobby?.captainCabinSearchStatus?.result
    ) {
      return {
        targetPlayerId: lobby.captainCabinSearchStatus.targetPlayerId,
        role: lobby.captainCabinSearchStatus.result.role,
        originalRole: lobby.captainCabinSearchStatus.result.originalRole,
      };
    }
    return null;
  }, [
    lobby?.captainCabinSearchStatus?.state,
    lobby?.captainCabinSearchStatus?.searcherId,
    lobby?.captainCabinSearchStatus?.result,
    isCabinSearchResultDismissed,
    myPlayerId,
    lobby?.captainCabinSearchStatus?.targetPlayerId,
  ]);

  const isCabinSearchPending =
    lobby?.captainCabinSearchStatus?.state === "PENDING" &&
    lobby?.captainCabinSearchStatus?.searcherId === myPlayerId;

  const clearCabinSearchResult = useCallback(() => {
    setIsCabinSearchResultDismissed(true);
  }, []);

  // Flogging State
  // Flogging Confirmation is derived from lobby.floggingStatus
  const floggingConfirmationPrompt = useMemo(() => {
    if (
      lobby?.floggingStatus?.state === "PENDING" &&
      lobby?.floggingStatus?.targetPlayerId === myPlayerId
    ) {
      const host = lobby.players.find(
        (p) => p.id === lobby.floggingStatus?.initiatorId,
      );
      return {
        hostId: lobby.floggingStatus.initiatorId,
        hostName: host?.name || "The Captain",
      };
    }
    return null;
  }, [
    lobby?.floggingStatus?.state,
    lobby?.floggingStatus?.targetPlayerId,
    lobby?.floggingStatus?.initiatorId,
    lobby?.players,
    myPlayerId,
  ]);

  // Flogging reveal is derived from lobby state, but we track dismissal locally
  const [isFloggingDismissed, setIsFloggingDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kraken_flogging_dismissed") === "true";
    }
    return false;
  });
  const [isConversionDismissed, setIsConversionDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kraken_conversion_dismissed") === "true";
    }
    return false;
  });
  const [isCabinSearchDismissed, setIsCabinSearchDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kraken_cabin_search_dismissed") === "true";
    }
    return false;
  });
  const [isGunsStashDismissed, setIsGunsStashDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kraken_guns_stash_dismissed") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "kraken_conversion_dismissed",
        String(isConversionDismissed),
      );
    }
  }, [isConversionDismissed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "kraken_cabin_search_dismissed",
        String(isCabinSearchDismissed),
      );
    }
  }, [isCabinSearchDismissed]);

  // Reset dismissed state when conversion starts (server-side trigger)
  useEffect(() => {
    if (
      lobby?.conversionStatus?.state === "PENDING" ||
      lobby?.conversionStatus?.state === "ACTIVE"
    ) {
      setIsConversionDismissed(false);
      // Cross-dismiss: hide other ritual views when server starts a new ritual
      setIsCabinSearchDismissed(true);
      setIsGunsStashDismissed(true);
    }
  }, [lobby?.conversionStatus?.state]);

  // Reset dismissal when a new cabin search starts (state becomes SETUP or ACTIVE)
  useEffect(() => {
    if (
      lobby?.cabinSearchStatus?.state === "SETUP" ||
      lobby?.cabinSearchStatus?.state === "ACTIVE"
    ) {
      setIsCabinSearchDismissed(false);
      // Cross-dismiss: hide other ritual views when server starts a new ritual
      setIsConversionDismissed(true);
      setIsGunsStashDismissed(true);
    }
  }, [lobby?.cabinSearchStatus?.state]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "kraken_guns_stash_dismissed",
        String(isGunsStashDismissed),
      );
    }
  }, [isGunsStashDismissed]);

  // Reset dismissal when a new guns stash starts or updates
  useEffect(() => {
    if (
      lobby?.gunsStashStatus?.state === "WAITING_FOR_PLAYERS" ||
      lobby?.gunsStashStatus?.state === "DISTRIBUTION"
    ) {
      setIsGunsStashDismissed(false);
      // Cross-dismiss: hide other ritual views when server starts a new ritual
      setIsConversionDismissed(true);
      setIsCabinSearchDismissed(true);
    }
  }, [lobby?.gunsStashStatus?.state]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "kraken_flogging_dismissed",
        String(isFloggingDismissed),
      );
    }
  }, [isFloggingDismissed]);

  // Reset dismissal when a new flogging starts
  useEffect(() => {
    if (lobby?.floggingStatus?.state === "PENDING") {
      setIsFloggingDismissed(false);
    }
  }, [lobby?.floggingStatus?.state]);

  // Derive floggingReveal from lobby state
  const floggingReveal =
    lobby?.floggingStatus?.state === "COMPLETED" &&
    lobby?.floggingStatus?.result?.notRole &&
    !isFloggingDismissed
      ? {
          targetPlayerId: lobby.floggingStatus.targetPlayerId,
          revealedRole: lobby.floggingStatus.result.notRole,
        }
      : null;

  const clearFloggingReveal = useCallback(() => {
    setIsFloggingDismissed(true);
  }, []);

  // Feed the Kraken State
  // We need local dismissal for the result modal
  const [isFeedTheKrakenResultDismissed, setIsFeedTheKrakenResultDismissed] =
    useState(() => {
      if (typeof window !== "undefined") {
        return (
          localStorage.getItem("kraken_feed_the_kraken_dismissed") === "true"
        );
      }
      return false;
    });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "kraken_feed_the_kraken_dismissed",
        String(isFeedTheKrakenResultDismissed),
      );
    }
  }, [isFeedTheKrakenResultDismissed]);

  // Reset dismissal when a new action starts
  useEffect(() => {
    if (lobby?.feedTheKrakenStatus?.state === "PENDING") {
      setIsFeedTheKrakenResultDismissed(false);
    }
  }, [lobby?.feedTheKrakenStatus?.state]);

  const feedTheKrakenPrompt = useMemo(() => {
    if (
      lobby?.feedTheKrakenStatus?.state === "PENDING" &&
      lobby?.feedTheKrakenStatus?.targetPlayerId === myPlayerId
    ) {
      const captain = lobby.players.find(
        (p) => p.id === lobby.feedTheKrakenStatus?.initiatorId,
      );
      return {
        captainId: lobby.feedTheKrakenStatus.initiatorId,
        captainName: captain?.name || "The Captain",
      };
    }
    return null;
  }, [
    lobby?.feedTheKrakenStatus?.state,
    lobby?.feedTheKrakenStatus?.targetPlayerId,
    lobby?.feedTheKrakenStatus?.initiatorId,
    lobby?.players,
    myPlayerId,
  ]);

  const feedTheKrakenResult = useMemo(() => {
    if (
      lobby?.feedTheKrakenStatus?.state === "COMPLETED" &&
      lobby?.feedTheKrakenStatus?.result &&
      !isFeedTheKrakenResultDismissed
    ) {
      return lobby.feedTheKrakenStatus.result;
    }
    return null;
  }, [
    lobby?.feedTheKrakenStatus?.state,
    lobby?.feedTheKrakenStatus?.result,
    isFeedTheKrakenResultDismissed,
  ]);

  const isFeedTheKrakenPending =
    lobby?.feedTheKrakenStatus?.state === "PENDING" &&
    lobby?.feedTheKrakenStatus?.initiatorId === myPlayerId;

  const clearFeedTheKrakenResult = useCallback(() => {
    setIsFeedTheKrakenResultDismissed(true);
  }, []);

  // Off with the Tongue State (Derived)
  const offWithTonguePrompt = useMemo(() => {
    if (
      lobby?.offWithTongueStatus?.state === "PENDING" &&
      lobby?.offWithTongueStatus?.targetPlayerId === myPlayerId
    ) {
      const captain = lobby.players.find(
        (p) => p.id === lobby.offWithTongueStatus?.initiatorId,
      );
      return {
        captainId: lobby.offWithTongueStatus.initiatorId,
        captainName: captain?.name || "The Captain",
      };
    }
    return null;
  }, [
    lobby?.offWithTongueStatus?.state,
    lobby?.offWithTongueStatus?.targetPlayerId,
    lobby?.offWithTongueStatus?.initiatorId,
    lobby?.players,
    myPlayerId,
  ]);

  const isOffWithTonguePending =
    lobby?.offWithTongueStatus?.state === "PENDING" &&
    lobby?.offWithTongueStatus?.initiatorId === myPlayerId;

  // --- Message Handler (uses refs to avoid stale closures) ---
  const handleSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      const currentT = tRef.current;
      const currentPlayerId = myPlayerIdRef.current;

      // TODO: Flogging result displays even when Cult's Guns Stash is active and should be displayed
      switch (data.type) {
        case "STATE_UPDATE":
          // Handle new XState snapshot format
          if (data.snapshot?.context) {
            // Convert snapshot context to LobbyState format
            const ctx = data.snapshot.context;
            const stateValue = data.snapshot.value;
            let status: "WAITING" | "PLAYING" = "WAITING";

            if (typeof stateValue === "string") {
              // Handle string state values (e.g. "playing")
              if (stateValue === "playing") status = "PLAYING";
              else if (stateValue === "lobby") status = "WAITING";
            } else if (typeof stateValue === "object" && stateValue !== null) {
              // Handle object state values (e.g. { playing: "idle" })
              if ("lobby" in stateValue) status = "WAITING";
              else if ("playing" in stateValue) status = "PLAYING";
            }

            // Detect game start logic moved to GAME_STARTED handler

            const lobbyFromSnapshot = {
              code: ctx.code || "",
              players: ctx.players || [],
              status: status as "WAITING" | "PLAYING",
              assignments: ctx.assignments,
              originalRoles: ctx.originalRoles,
              roleDistributionMode: ctx.roleDistributionMode,
              roleSelectionStatus: ctx.roleSelectionStatus,
              conversionStatus: ctx.conversionStatus,
              conversionCount: ctx.conversionCount,
              feedTheKrakenCount: ctx.feedTheKrakenCount,
              cabinSearchCount: ctx.cabinSearchCount,
              convertedPlayerIds: ctx.convertedPlayerIds || [],
              cabinSearchStatus: ctx.cabinSearchStatus,
              captainCabinSearchStatus: ctx.captainCabinSearchStatus,
              gunsStashStatus: ctx.gunsStashStatus,
              isFloggingUsed: ctx.isFloggingUsed,
              isGunsStashUsed: ctx.isGunsStashUsed,
              isCultCabinSearchUsed: ctx.isCultCabinSearchUsed,
              isOffWithTongueUsed: ctx.isOffWithTongueUsed,
              floggingStatus: ctx.floggingStatus,
              feedTheKrakenStatus: ctx.feedTheKrakenStatus,
              offWithTongueStatus: ctx.offWithTongueStatus,
            };

            // Detect if current player was kicked (lobby exists but player not in list)
            const isStillInLobby = ctx.players?.some(
              (p: { id: string }) => p.id === currentPlayerId,
            );

            // Only trigger kick detection if player was previously in the lobby
            if (
              wasInLobbyRef.current &&
              ctx.code &&
              ctx.players?.length > 0 &&
              !isStillInLobby &&
              status === "WAITING"
            ) {
              // Clear lobby state
              localStorage.removeItem("kraken_lobby_code");
              // Store kick message to show on home page
              localStorage.setItem(
                "kraken_kick_message",
                currentT("errors.youWereKicked"),
              );
              // Reset the flag
              wasInLobbyRef.current = false;
              // Preserve language in redirect by extracting from current pathname
              const pathParts = window.location.pathname.split("/");
              const currentLng =
                pathParts[1] === "fi" || pathParts[1] === "en"
                  ? pathParts[1]
                  : "en";
              // Force navigate to home page (unmounts socket)
              window.location.href = `/${currentLng}/`;
              return; // Don't process further
            }

            // Track that player has joined the lobby
            if (isStillInLobby) {
              wasInLobbyRef.current = true;
            }

            setLobby(lobbyFromSnapshot);
            if (status === "PLAYING" && ctx.assignments?.[currentPlayerId]) {
              setMyRole(ctx.assignments[currentPlayerId]);
            }
          }

          break;
        case "GAME_STARTED":
          if (typeof window !== "undefined") {
            localStorage.removeItem("kraken_cabin_search_dismissed");
            localStorage.removeItem("kraken_conversion_dismissed");
            localStorage.removeItem("kraken_guns_stash_dismissed");
            localStorage.removeItem("kraken_flogging_dismissed");
            localStorage.removeItem("kraken_feed_the_kraken_dismissed");
          }
          setIsCabinSearchResultDismissed(false);
          setIsConversionDismissed(false);
          setIsCabinSearchDismissed(false);
          setIsGunsStashDismissed(false);
          setIsFloggingDismissed(false);
          setIsFeedTheKrakenResultDismissed(false);
          break;

        case "ERROR": {
          // Parse potential parameters: "key|param1:val1|param2:val2"
          const [key, ...paramStrings] = data.message.split("|");
          const params: Record<string, string> = {};
          paramStrings.forEach((p: string) => {
            const [k, v] = p.split(":");
            if (k && v) params[k] = v;
          });
          setError(currentT(key, params));
          setTimeout(() => setError(null), 3000);
          break;
        }

        // Off with the Tongue messages
        case "OFF_WITH_TONGUE_PROMPT":
          // Now handled by state update
          break;
        case "OFF_WITH_TONGUE_RESULT":
          // Handled by state update
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }, []);

  // --- usePartySocket Hook (handles auto-reconnect) ---
  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
    room: currentLobbyCode || "__disconnected__",
    startClosed: !currentLobbyCode,

    onOpen() {
      console.log("Socket connected, sending", pendingMessageTypeRef.current);
      setConnectionStatus("connected");

      // Send the appropriate message type (CREATE_LOBBY or JOIN_LOBBY)
      socket.send(
        JSON.stringify({
          type: pendingMessageTypeRef.current,
          playerId: myPlayerIdRef.current,
          playerName: myNameRef.current || tRef.current("lobby.newSailor"),
          playerPhoto: myPhotoRef.current,
        }),
      );
      // Reset to JOIN for subsequent reconnects
      pendingMessageTypeRef.current = "JOIN_LOBBY";
    },

    onMessage: handleSocketMessage,

    onClose() {
      console.log("Socket disconnected");
      setConnectionStatus("disconnected");
    },

    onError(event) {
      console.error("Socket error:", event);
      setConnectionStatus("error");
    },
  });

  // --- Actions ---

  // Dismiss all popup/result modals EXCEPT the specified one
  // Called when user accepts a new ritual - dismisses other modals but not the current one
  type ModalType =
    | "conversion"
    | "cabinSearch"
    | "gunsStash"
    | "flogging"
    | "captainCabinSearch"
    | "feedTheKraken";

  const dismissOtherModals = useCallback((exclude?: ModalType) => {
    if (exclude !== "conversion") setIsConversionDismissed(true);
    if (exclude !== "cabinSearch") setIsCabinSearchDismissed(true);
    if (exclude !== "gunsStash") setIsGunsStashDismissed(true);
    if (exclude !== "flogging") setIsFloggingDismissed(true);
    if (exclude !== "captainCabinSearch") setIsCabinSearchResultDismissed(true);
    if (exclude !== "feedTheKraken") setIsFeedTheKrakenResultDismissed(true);
  }, []);

  const handlers = useGameHandlers({
    socket,
    myPlayerId,
    cabinSearchPrompt,
    floggingConfirmationPrompt,
    feedTheKrakenPrompt,
    offWithTonguePrompt,
    dismissOtherModals,
  });

  const connectToLobby = useCallback((lobbyCode: string) => {
    // Set the lobby code - the usePartySocket hook will auto-connect
    setCurrentLobbyCode(lobbyCode);
    localStorage.setItem("kraken_lobby_code", lobbyCode);
    setConnectionStatus("connecting");
  }, []);

  // Note: Auto-reconnect is now handled by usePartySocket hook.
  // The lobby code is restored from localStorage in the currentLobbyCode state initializer.

  // Refs for event listeners to access latest state without re-binding
  const lobbyRef = useRef(lobby);
  const connectionStatusRef = useRef(connectionStatus);

  useEffect(() => {
    lobbyRef.current = lobby;
    connectionStatusRef.current = connectionStatus;
  }, [lobby, connectionStatus]);

  // Prevent accidental navigation (refresh, close tab, back to other site)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lobbyRef.current && connectionStatusRef.current === "connected") {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const disconnectFromLobby = useCallback(() => {
    setCurrentLobbyCode(null);
    localStorage.removeItem("kraken_lobby_code");
    setConnectionStatus("disconnected");
    setLobby(null);
    if (socket) {
      socket.close();
    }
  }, [socket]);

  const updateMyProfile = (name: string, photoUrl: string | null) => {
    setMyName(name);
    setMyPhoto(photoUrl);
    if (typeof window !== "undefined") {
      localStorage.setItem("kraken_player_name", name);
      if (photoUrl) {
        localStorage.setItem("kraken_player_photo", photoUrl);
      } else {
        localStorage.removeItem("kraken_player_photo");
      }
    }

    if (!socket) return;
    socket.send(
      JSON.stringify({
        type: "UPDATE_PROFILE",
        playerId: myPlayerId,
        name,
        photoUrl,
      }),
    );
  };

  const createLobby = (
    overrideName?: string,
    overridePhoto?: string | null,
  ) => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const nameToUse = overrideName || myName;
    const photoToUse = overridePhoto !== undefined ? overridePhoto : myPhoto;

    // Set message type to CREATE for this connection
    pendingMessageTypeRef.current = "CREATE_LOBBY";
    // Update refs with the values to use
    if (nameToUse)
      myNameRef.current =
        nameToUse === t("lobby.newSailor") ? t("lobby.host") : nameToUse;
    if (photoToUse !== undefined) myPhotoRef.current = photoToUse;

    connectToLobby(newCode);

    localStorage.setItem("kraken_lobby_code", newCode);
    setError(null);
  };

  const joinLobby = (
    codeEntered: string,
    overrideName?: string,
    overridePhoto?: string | null,
  ) => {
    if (codeEntered.length < 4) {
      setError(t("errors.invalidCode"));
      return;
    }

    const nameToUse = overrideName || myName;
    const photoToUse = overridePhoto !== undefined ? overridePhoto : myPhoto;

    // Set message type to JOIN for this connection
    pendingMessageTypeRef.current = "JOIN_LOBBY";
    // Update refs with the values to use
    if (nameToUse) myNameRef.current = nameToUse;
    if (photoToUse !== undefined) myPhotoRef.current = photoToUse;

    connectToLobby(codeEntered.toUpperCase());

    localStorage.setItem("kraken_lobby_code", codeEntered.toUpperCase());
    setError(null);
  };

  const leaveLobby = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "LEAVE_LOBBY",
          playerId: myPlayerId,
        }),
      );
    }
    disconnectFromLobby();
    localStorage.removeItem("kraken_lobby_code");
    setError(null);
  };

  const startGame = () => {
    if (!lobby) return;
    if (lobby.players.length < MIN_PLAYERS) {
      setError(t("lobby.minPlayers", { min: MIN_PLAYERS }));
      return;
    }
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "START_GAME",
          playerId: myPlayerId,
        }),
      );
    }
  };

  const addBotPlayer = () => {
    if (!socket) return;
    socket.send(
      JSON.stringify({
        type: "ADD_BOT",
      }),
    );
  };

  const kickPlayer = useCallback(
    (targetPlayerId: string) => {
      if (!socket) return;
      socket.send(
        JSON.stringify({
          type: "KICK_PLAYER",
          playerId: myPlayerId,
          targetPlayerId,
        }),
      );
    },
    [socket, myPlayerId],
  );

  return (
    <GameContext.Provider
      value={{
        ...handlers,
        clearFloggingReveal,
        myPlayerId,
        myName,
        myPhoto,
        updateMyProfile,
        lobby,
        myRole,
        connectionStatus,
        connectToLobby,
        disconnectFromLobby,
        createLobby,
        joinLobby,
        leaveLobby,
        startGame,
        addBotPlayer,
        kickPlayer,

        cabinSearchPrompt,
        cabinSearchResult,
        isCabinSearchPending,
        clearCabinSearchResult,

        floggingConfirmationPrompt,
        floggingReveal,

        isConversionDismissed,
        setIsConversionDismissed,
        isCabinSearchDismissed,
        setIsCabinSearchDismissed,

        isGunsStashDismissed,
        setIsGunsStashDismissed,

        feedTheKrakenPrompt,
        feedTheKrakenResult,
        isFeedTheKrakenPending,
        clearFeedTheKrakenResult,

        offWithTonguePrompt,
        isOffWithTonguePending,

        error,
        setError,
        view: "", // Placeholder
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
