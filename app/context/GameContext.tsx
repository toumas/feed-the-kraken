"use client";

import PartySocket from "partysocket";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type ConnectionStatus,
  type LobbyState,
  type MessagePayload,
  MIN_PLAYERS,
  type Role,
} from "../types";

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
  joinLobby: (codeEntered: string) => void;
  leaveLobby: () => void;
  startGame: () => void;
  addBotPlayer: () => void;

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

  // Cabin Search State
  cabinSearchPrompt: { searcherId: string; searcherName: string } | null;
  cabinSearchResult: { targetPlayerId: string; role: Role } | null;
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

  // UI State
  error: string | null;
  setError: (error: string | null) => void;
  view: string; // "HOME" | "JOIN" | "LOBBY" | "GAME" | "PROFILE_SETUP" (managed locally in page.tsx mostly, but exposed if needed?)
  // Actually, view state is better kept local to page.tsx for navigation,
  // but we might need to trigger view changes from context (e.g. on game start).
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
      return localStorage.getItem("kraken_player_name") || "New Sailor";
    }
    return "New Sailor";
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
  const [socket, setSocket] = useState<PartySocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Cabin Search State
  const [cabinSearchPrompt, setCabinSearchPrompt] = useState<{
    searcherId: string;
    searcherName: string;
  } | null>(null);
  const [cabinSearchResult, setCabinSearchResult] = useState<{
    targetPlayerId: string;
    role: Role;
  } | null>(null);
  const [isCabinSearchPending, setIsCabinSearchPending] = useState(false);

  // Flogging State
  const [floggingConfirmationPrompt, setFloggingConfirmationPrompt] = useState<{
    hostId: string;
    hostName: string;
  } | null>(null);
  const [floggingReveal, setFloggingReveal] = useState<{
    targetPlayerId: string;
    revealedRole: Role;
  } | null>(null);
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

  // Reset dismissed state when conversion starts
  useEffect(() => {
    if (
      lobby?.conversionStatus?.state === "PENDING" ||
      lobby?.conversionStatus?.state === "ACTIVE"
    ) {
      setIsConversionDismissed(false);
    }
  }, [lobby?.conversionStatus?.state]);

  // Reset dismissal when a new cabin search starts (state becomes SETUP or ACTIVE)
  useEffect(() => {
    if (
      lobby?.cabinSearchStatus?.state === "SETUP" ||
      lobby?.cabinSearchStatus?.state === "ACTIVE"
    ) {
      setIsCabinSearchDismissed(false);
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

  // Reset dismissal when a new guns stash starts
  useEffect(() => {
    if (
      lobby?.gunsStashStatus?.state === "WAITING_FOR_PLAYERS" ||
      lobby?.gunsStashStatus?.state === "DISTRIBUTION"
    ) {
      setIsGunsStashDismissed(false);
    }
  }, [lobby?.gunsStashStatus?.state]);

  // Feed the Kraken State
  const [feedTheKrakenPrompt, setFeedTheKrakenPrompt] = useState<{
    captainId: string;
    captainName: string;
  } | null>(null);
  const [feedTheKrakenResult, setFeedTheKrakenResult] = useState<{
    targetPlayerId: string;
    cultVictory: boolean;
  } | null>(null);
  const [isFeedTheKrakenPending, setIsFeedTheKrakenPending] = useState(false);

  // --- Actions ---

  const connectToLobby = useCallback(
    (lobbyCode: string, initialPayload?: MessagePayload) => {
      if (socket) {
        socket.close();
      }

      setConnectionStatus("connecting");
      const newSocket = new PartySocket({
        host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
        room: lobbyCode,
      });

      newSocket.onopen = () => {
        setConnectionStatus("connected");
        if (initialPayload) {
          try {
            newSocket.send(JSON.stringify(initialPayload));
          } catch (err) {
            console.error("Failed to send initial payload:", err);
          }
        }
      };

      newSocket.onclose = () => {
        setConnectionStatus("disconnected");
      };

      newSocket.onerror = () => {
        setConnectionStatus("error");
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "LOBBY_UPDATE":
              setLobby(data.lobby);
              if (data.lobby?.status === "PLAYING") {
                if (data.lobby.assignments?.[myPlayerId]) {
                  setMyRole(data.lobby.assignments[myPlayerId]);
                }
              }
              break;
            case "GAME_STARTED":
              if (data.assignments?.[myPlayerId]) {
                setMyRole(data.assignments[myPlayerId]);
              }
              break;
            case "CABIN_SEARCH_PROMPT":
              setCabinSearchPrompt({
                searcherId: data.searcherId,
                searcherName: data.searcherName,
              });
              break;
            case "CABIN_SEARCH_RESULT":
              setCabinSearchResult({
                targetPlayerId: data.targetPlayerId,
                role: data.role,
              });
              setIsCabinSearchPending(false);
              break;
            case "CABIN_SEARCH_DENIED":
              setIsCabinSearchPending(false);
              setError("The player denied the cabin search.");
              setTimeout(() => setError(null), 3000);
              break;
            case "ERROR":
              setError(data.message);
              setTimeout(() => setError(null), 3000);
              break;
            case "FLOGGING_CONFIRMATION_REQUEST":
              setFloggingConfirmationPrompt({
                hostId: data.hostId,
                hostName: data.hostName,
              });
              break;
            case "FLOGGING_REVEAL":
              setFloggingReveal({
                targetPlayerId: data.targetPlayerId,
                revealedRole: data.revealedRole,
              });
              break;
            case "FLOGGING_DENIED":
              setError("The player denied the flogging.");
              setTimeout(() => setError(null), 3000);
              break;

            case "CONVERSION_RESULT":
              // Handled by lobby state update mostly, but could trigger toast here if needed
              break;

            // Feed the Kraken messages
            case "FEED_THE_KRAKEN_PROMPT":
              setFeedTheKrakenPrompt({
                captainId: data.captainId,
                captainName: data.captainName,
              });
              break;
            case "FEED_THE_KRAKEN_RESULT":
              setFeedTheKrakenResult({
                targetPlayerId: data.targetPlayerId,
                cultVictory: data.cultVictory,
              });
              setIsFeedTheKrakenPending(false);
              break;
            case "FEED_THE_KRAKEN_DENIED":
              setIsFeedTheKrakenPending(false);
              setError("The player refused to be fed to the Kraken.");
              setTimeout(() => setError(null), 3000);
              break;
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      setSocket(newSocket);
    },
    [myPlayerId, socket],
  );

  // Auto-reconnect on mount
  useEffect(() => {
    if (socket) return;
    if (typeof window !== "undefined") {
      const savedCode = localStorage.getItem("kraken_lobby_code");
      if (savedCode) {
        connectToLobby(savedCode, {
          type: "JOIN_LOBBY",
          playerId: myPlayerId,
          playerName: myName,
          playerPhoto: myPhoto,
        });
      }
    }
  }, [connectToLobby, myName, myPhoto, myPlayerId, socket]);

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

  const disconnectFromLobby = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setConnectionStatus("disconnected");
    setLobby(null);
  };

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

    connectToLobby(newCode, {
      type: "CREATE_LOBBY",
      playerId: myPlayerId,
      playerName: nameToUse === "New Sailor" ? "Host" : nameToUse,
      playerPhoto: photoToUse,
    });

    localStorage.setItem("kraken_lobby_code", newCode);
    setError(null);
  };

  const joinLobby = (codeEntered: string) => {
    if (codeEntered.length < 4) {
      setError("Invalid room code format.");
      return;
    }
    connectToLobby(codeEntered.toUpperCase(), {
      type: "JOIN_LOBBY",
      playerId: myPlayerId,
      playerName: myName,
      playerPhoto: myPhoto,
    });

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
      setError(`Need at least ${MIN_PLAYERS} sailors to depart!`);
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

  const handleDenialOfCommand = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "DENIAL_OF_COMMAND",
          playerId: myPlayerId,
        }),
      );
    }
  };

  const handleCabinSearch = (targetPlayerId: string) => {
    if (socket) {
      setIsCabinSearchPending(true);
      socket.send(
        JSON.stringify({
          type: "CABIN_SEARCH_REQUEST",
          targetPlayerId,
        }),
      );
    }
  };

  const handleCabinSearchResponse = (confirmed: boolean) => {
    if (socket && cabinSearchPrompt) {
      socket.send(
        JSON.stringify({
          type: "CABIN_SEARCH_RESPONSE",
          searcherId: cabinSearchPrompt.searcherId,
          confirmed,
        }),
      );
      setCabinSearchPrompt(null);
    }
  };

  const handleFloggingRequest = (targetPlayerId: string) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "FLOGGING_REQUEST",
          targetPlayerId,
        }),
      );
    }
  };

  const handleFloggingConfirmationResponse = (confirmed: boolean) => {
    if (socket && floggingConfirmationPrompt) {
      socket.send(
        JSON.stringify({
          type: "FLOGGING_CONFIRMATION_RESPONSE",
          hostId: floggingConfirmationPrompt.hostId,
          confirmed,
        }),
      );
      setFloggingConfirmationPrompt(null);
    }
  };

  const clearCabinSearchResult = () => {
    setCabinSearchResult(null);
  };

  const clearFloggingReveal = () => {
    setFloggingReveal(null);
  };

  // Conversion State

  const handleStartConversion = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "START_CONVERSION",
          initiatorId: myPlayerId,
        }),
      );
    }
  };

  const handleRespondConversion = (accept: boolean) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "RESPOND_CONVERSION",
          playerId: myPlayerId,
          accept,
        }),
      );
    }
  };

  const sendMessage = (message: MessagePayload) => {
    if (socket) {
      socket.send(JSON.stringify(message));
    }
  };

  const submitConversionAction = (
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
  };

  const handleResetGame = () => {
    sendMessage({ type: "RESET_GAME" });
  };

  const startCabinSearch = () => {
    console.log("GameContext: Sending start cabin search message...");
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "START_CULT_CABIN_SEARCH",
          initiatorId: myPlayerId,
        }),
      );
    }
  };

  const claimCabinSearchRole = (
    role: "CAPTAIN" | "NAVIGATOR" | "LIEUTENANT" | "CREW",
  ) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "CLAIM_CULT_CABIN_SEARCH_ROLE",
          playerId: myPlayerId,
          role,
        }),
      );
    }
  };

  const submitCabinSearchAction = (answer: string) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "SUBMIT_CULT_CABIN_SEARCH_ACTION",
          playerId: myPlayerId,
          answer,
        }),
      );
    }
  };

  const cancelCabinSearch = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "CANCEL_CULT_CABIN_SEARCH",
          playerId: myPlayerId,
        }),
      );
    }
  };

  const startGunsStash = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "START_CULT_GUNS_STASH",
          initiatorId: myPlayerId,
        }),
      );
    }
  };

  const confirmGunsStashReady = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "CONFIRM_CULT_GUNS_STASH_READY",
          playerId: myPlayerId,
        }),
      );
    }
  };

  const submitGunsStashDistribution = (
    distribution: Record<string, number>,
  ) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "SUBMIT_CULT_GUNS_STASH_DISTRIBUTION",
          playerId: myPlayerId,
          distribution,
        }),
      );
    }
  };

  const cancelGunsStash = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "CANCEL_CULT_GUNS_STASH",
          playerId: myPlayerId,
        }),
      );
    }
  };

  const submitGunsStashAction = (answer: string) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "SUBMIT_CULT_GUNS_STASH_ACTION",
          playerId: myPlayerId,
          answer,
        }),
      );
    }
  };

  // Feed the Kraken Actions
  const handleFeedTheKrakenRequest = (targetPlayerId: string) => {
    if (socket) {
      setIsFeedTheKrakenPending(true);
      socket.send(
        JSON.stringify({
          type: "FEED_THE_KRAKEN_REQUEST",
          targetPlayerId,
        }),
      );
    }
  };

  const handleFeedTheKrakenResponse = (confirmed: boolean) => {
    if (socket && feedTheKrakenPrompt) {
      socket.send(
        JSON.stringify({
          type: "FEED_THE_KRAKEN_RESPONSE",
          captainId: feedTheKrakenPrompt.captainId,
          confirmed,
        }),
      );
      setFeedTheKrakenPrompt(null);
    }
  };

  const clearFeedTheKrakenResult = () => {
    setFeedTheKrakenResult(null);
    // Also clear from lobby state
    if (socket) {
      // Note: We might need a server message to clear this, or handle it locally
      // For now, just clear the local state
    }
  };

  return (
    <GameContext.Provider
      value={{
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
        handleDenialOfCommand,

        handleCabinSearch,
        handleCabinSearchResponse,
        cabinSearchPrompt,
        cabinSearchResult,
        clearCabinSearchResult,
        isCabinSearchPending,

        handleFloggingRequest,
        handleFloggingConfirmationResponse,
        floggingConfirmationPrompt,
        floggingReveal,
        clearFloggingReveal,

        handleStartConversion,
        handleRespondConversion,
        submitConversionAction,
        isConversionDismissed,
        setIsConversionDismissed,
        isCabinSearchDismissed,
        setIsCabinSearchDismissed,

        handleResetGame,

        startCabinSearch,
        claimCabinSearchRole,
        submitCabinSearchAction,
        cancelCabinSearch,

        startGunsStash,
        confirmGunsStashReady,
        submitGunsStashDistribution,
        submitGunsStashAction,
        cancelGunsStash,
        isGunsStashDismissed,
        setIsGunsStashDismissed,

        handleFeedTheKrakenRequest,
        handleFeedTheKrakenResponse,
        feedTheKrakenPrompt,
        feedTheKrakenResult,
        isFeedTheKrakenPending,
        clearFeedTheKrakenResult,

        error,
        setError,
        view: "", // Placeholder
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
