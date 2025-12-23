"use client";

import { Scissors } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameHeader } from "../../components/GameHeader";
import { InlineError } from "../../components/InlineError";
import { PlayerSelectionList } from "../../components/PlayerSelectionList";
import { useGame } from "../../context/GameContext";
import { useT } from "../../i18n/client";

export default function OffWithTonguePage() {
  const router = useRouter();
  const {
    lobby,
    myPlayerId,
    handleOffWithTongueRequest,
    isOffWithTonguePending,
    error,
  } = useGame();
  const { t } = useT("common");
  const [isPending, setIsPending] = useState(false);
  const wasPendingRef = useRef(false);

  // Clear pending state if error occurs (e.g., denial)
  useEffect(() => {
    if (error && isPending) {
      setIsPending(false);
    }
  }, [error, isPending]);

  // Redirect if not in game
  useEffect(() => {
    if (lobby && lobby.status !== "PLAYING") {
      router.push("/lobby");
    }
  }, [lobby, router]);

  // Sync pending state with context and redirect on success
  useEffect(() => {
    // If we were pending and now we're not, and there's no error, it means success
    if (wasPendingRef.current && !isOffWithTonguePending && !error) {
      router.push("/game");
    }
    wasPendingRef.current = isOffWithTonguePending;
    setIsPending(isOffWithTonguePending);
  }, [isOffWithTonguePending, error, router]);

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        {t("game.loading")}
      </div>
    );
  }

  const handlePlayerSelect = (targetId: string) => {
    handleOffWithTongueRequest(targetId);
    setIsPending(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900 flex flex-col">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col">
        <GameHeader
          title={t("offWithTongue.title")}
          icon={<Scissors className="w-5 h-5 text-amber-500" />}
        />

        {/* Error Toast */}
        {error && (
          <div className="mx-6 mt-4">
            <InlineError message={error} onDismiss={() => {}} />
          </div>
        )}

        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1 flex flex-col h-full">
            <PlayerSelectionList.Root
              players={lobby.players}
              myPlayerId={myPlayerId}
            >
              <PlayerSelectionList.Content
                disabledLabel={t("offWithTongue.alreadySilenced")}
                isPlayerDisabled={(player) => player.hasTongue === false}
              />
              <PlayerSelectionList.Actions>
                <PlayerSelectionList.Submit onSubmit={handlePlayerSelect}>
                  {t("offWithTongue.silenceSailor")}
                </PlayerSelectionList.Submit>
                <PlayerSelectionList.Cancel
                  onCancel={() => router.push("/game")}
                >
                  {t("actions.cancel")}
                </PlayerSelectionList.Cancel>
              </PlayerSelectionList.Actions>
            </PlayerSelectionList.Root>
          </div>
        </div>

        {/* Pending State Overlay */}
        {isPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-300 flex flex-col items-center mx-4">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">
                {t("flogging.waitingConfirmation")}
              </h2>
              <p className="text-slate-400 text-center">
                {t("flogging.punishmentRequest")}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
