"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LobbyView } from "../components/LobbyView";
import { useGame } from "../context/GameContext";

export default function LobbyPage() {
  const router = useRouter();
  const {
    lobby,
    myPlayerId,
    updateMyProfile,
    leaveLobby,
    startGame,
    addBotPlayer,
    connectionStatus,
  } = useGame();

  useEffect(() => {
    // If game starts, go to game page
    if (lobby?.status === "PLAYING") {
      router.push("/game");
    }
  }, [lobby?.status, router]);

  const handleLeave = () => {
    leaveLobby();
    router.push("/");
  };

  if (!lobby) {
    // If not connected yet or lost connection, show loading or redirect
    // Ideally we wait a bit for connection
    if (connectionStatus === "disconnected") {
      // Maybe redirect home if truly disconnected and no attempt to connect?
      // But GameContext tries to reconnect on mount.
      // Let's show loading state.
    }

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Connecting to lobby...</p>
          <p className="text-sm text-slate-500">Status: {connectionStatus}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 text-sm text-red-400 hover:text-red-300 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900 flex flex-col">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col p-4">
        <LobbyView
          lobby={lobby}
          myPlayerId={myPlayerId}
          onUpdateProfile={updateMyProfile}
          onLeave={handleLeave}
          onStart={startGame}
          onAddBot={addBotPlayer}
          connectionStatus={connectionStatus}
        />
      </main>
    </div>
  );
}
