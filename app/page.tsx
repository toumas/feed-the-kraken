"use client";
import { AlertCircle, Anchor, X } from "lucide-react";
import PartySocket from "partysocket";
import { useCallback, useEffect, useState } from "react";
import { GameView } from "./components/GameView";
import { HomeView } from "./components/HomeView";
import { JoinView } from "./components/JoinView";
import { LobbyView } from "./components/LobbyView";
import {
  type ConnectionStatus,
  type LobbyState,
  type MessagePayload,
  MIN_PLAYERS,
  type Role,
  type ViewState,
} from "./types";

// --- Main Component ---
export default function KrakenCompanion() {
  // App State
  const [view, setView] = useState<ViewState>("HOME");
  const [error, setError] = useState<string | null>(null);

  // User State
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

  // Lobby State (now synced via PartyKit)
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);

  // PartyKit connection
  const [socket, setSocket] = useState<PartySocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Connect to PartyKit room
  // Accept an optional initialPayload which will be sent once the socket opens.
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
        // If caller provided an initial payload (CREATE/JOIN), send it now
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
              // Keep view in sync with authoritative server state.
              if (data.lobby?.status === "PLAYING") {
                setView("GAME");
                // Restore role if available in persisted state
                if (data.lobby.assignments?.[myPlayerId]) {
                  setMyRole(data.lobby.assignments[myPlayerId]);
                }
              }
              break;
            case "GAME_STARTED":
              // Server sent us the role assignments
              // In a real secure app, we'd only get our own, but here we get all and pick ours
              if (data.assignments?.[myPlayerId]) {
                setMyRole(data.assignments[myPlayerId]);
              }
              setView("GAME");
              break;
            case "ERROR":
              setError(data.message);
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
        setView("LOBBY");
      }
    }
  }, [connectToLobby, myName, myPhoto, myPlayerId, socket]);

  // Disconnect from current lobby
  const disconnectFromLobby = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setConnectionStatus("disconnected");
    setLobby(null);
  };

  // --- Actions ---
  const createLobby = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    connectToLobby(newCode, {
      type: "CREATE_LOBBY",
      playerId: myPlayerId,
      playerName: myName === "New Sailor" ? "Captain Host" : myName,
      playerPhoto: myPhoto,
    });

    localStorage.setItem("kraken_lobby_code", newCode);
    setView("LOBBY");
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
    setView("LOBBY");
    setError(null);
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

  // Debug function to test constraints
  const addBotPlayer = () => {
    if (!socket) return;
    socket.send(
      JSON.stringify({
        type: "ADD_BOT",
      }),
    );
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
    setView("HOME");
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

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-center border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
          <Anchor className="w-6 h-6 text-cyan-500 mr-3" />
          <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
            Feed The Kraken
          </h1>
        </header>

        {/* Error Toast */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-950/90 border border-red-500/50 text-red-200 rounded-lg flex items-start animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-red-500 mt-0.5" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              type="button"
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Content */}
        <div className="flex-1 flex flex-col p-4">
          {view === "HOME" && (
            <HomeView onCreate={createLobby} onJoin={() => setView("JOIN")} />
          )}
          {view === "JOIN" && (
            <JoinView onJoin={joinLobby} onBack={() => setView("HOME")} />
          )}
          {view === "LOBBY" &&
            (lobby ? (
              <LobbyView
                lobby={lobby}
                myPlayerId={myPlayerId}
                onUpdateProfile={updateMyProfile}
                onLeave={leaveLobby}
                onStart={startGame}
                onAddBot={addBotPlayer}
                connectionStatus={connectionStatus}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-cyan-600 rounded-full animate-spin" />
                <p className="text-slate-400">Connecting to party server...</p>
                <p className="text-sm text-slate-500">
                  Status: {connectionStatus}
                </p>
              </div>
            ))}
          {view === "GAME" && lobby && (
            <GameView lobby={lobby} myRole={myRole} onLeave={leaveLobby} />
          )}
        </div>
      </main>
    </div>
  );
}
