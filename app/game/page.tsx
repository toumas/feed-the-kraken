"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GameView } from "../components/GameView";
import { useGame } from "../context/GameContext";

export default function GamePage() {
  const router = useRouter();
  const {
    lobby,
    myRole,
    myPlayerId,
    leaveLobby,

    handleCabinSearch,
    cabinSearchPrompt,
    cabinSearchResult,
    handleCabinSearchResponse,
    clearCabinSearchResult,
    isCabinSearchPending,

    floggingConfirmationPrompt,
    handleFloggingConfirmationResponse,
    floggingReveal,
    clearFloggingReveal,

    handleStartConversion,
    handleRespondConversion,
    handleResetGame,

    startCabinSearch,
    isConversionDismissed,
    setIsConversionDismissed,
    isCabinSearchDismissed,
    setIsCabinSearchDismissed,
  } = useGame();

  useEffect(() => {
    if (lobby && lobby.status !== "PLAYING") {
      router.push("/lobby");
    } else if (!lobby) {
      // router.push("/"); // Let loading state handle it or redirect if timeout
    }
  }, [lobby, router]);

  useEffect(() => {
    if (lobby?.conversionStatus?.state === "ACTIVE") {
      router.push("/conversion");
    }
  }, [lobby?.conversionStatus?.state, router]);

  useEffect(() => {
    if (lobby?.cabinSearchStatus?.state === "SETUP") {
      router.push("/cult-cabin-search");
    }
  }, [lobby?.cabinSearchStatus?.state, router]);

  const handleLeave = () => {
    leaveLobby();
    router.push("/");
  };

  if (!lobby || lobby.status !== "PLAYING") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading game...</p>
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
        <GameView
          lobby={lobby}
          myRole={myRole}
          myPlayerId={myPlayerId}
          onLeave={handleLeave}
          onCabinSearch={handleCabinSearch}
          cabinSearchPrompt={cabinSearchPrompt}
          cabinSearchResult={cabinSearchResult}
          onCabinSearchResponse={handleCabinSearchResponse}
          onClearCabinSearchResult={clearCabinSearchResult}
          isCabinSearchPending={isCabinSearchPending}
          floggingConfirmationPrompt={floggingConfirmationPrompt}
          onFloggingConfirmationResponse={handleFloggingConfirmationResponse}
          floggingReveal={floggingReveal}
          onClearFloggingReveal={clearFloggingReveal}
          onStartConversion={handleStartConversion}
          conversionStatus={lobby.conversionStatus || null}
          onRespondConversion={handleRespondConversion}
          isConversionDismissed={isConversionDismissed}
          onDismissConversion={() => setIsConversionDismissed(true)}
          onStartCabinSearch={() => {
            startCabinSearch();
          }}
          isCabinSearchDismissed={isCabinSearchDismissed}
          onDismissCabinSearch={() => setIsCabinSearchDismissed(true)}
          onResetGame={handleResetGame}
        />
      </main>
    </div>
  );
}
