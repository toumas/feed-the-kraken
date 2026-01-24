"use client";

import React, {
  type ComponentType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocalizedRouter } from "../../hooks/useLocalizedRouter";

// Activity is available in React 19+ but types might be missing in some versions
// @ts-expect-error
const Activity = (React.Activity || React.unstable_Activity) as ComponentType<{
  mode: "visible" | "hidden" | "unmount"; // 'unmount' might be valid too? usually visible/hidden
  children: ReactNode;
}>;

import { Eye, Scissors, Skull } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { CancellationModal } from "../../components/CancellationModal";
import { GameView } from "../../components/GameView";
import { InlineError } from "../../components/InlineError";
import { ReadyCheckModal } from "../../components/ReadyCheckModal";
// Import Views
import { CabinSearchView } from "../../components/views/CabinSearchView";
import { ConversionView } from "../../components/views/ConversionView";
import { CultCabinSearchView } from "../../components/views/CultCabinSearchView";
import { CultGunsStashView } from "../../components/views/CultGunsStashView";
import { DenialView } from "../../components/views/DenialView";
import { FeedTheKrakenView } from "../../components/views/FeedTheKrakenView";
import { FloggingView } from "../../components/views/FloggingView";
import { OffWithTongueView } from "../../components/views/OffWithTongueView";
import { RoleSelectionView } from "../../components/views/RoleSelectionView";
import { useGame } from "../../context/GameContext";
import { useT } from "../../i18n/client";
import { getRoleColor, sortPlayersWithSelfFirst } from "../../utils/role-utils";

type LocalView =
  | "NONE"
  | "CABIN_SEARCH"
  | "FEED_KRAKEN"
  | "FLOGGING"
  | "OFF_WITH_TONGUE"
  | "DENIAL";

export default function GamePage() {
  const router = useLocalizedRouter();
  const {
    lobby,
    myRole,
    myPlayerId,
    leaveLobby,
    error,
    setError,

    cabinSearchPrompt,
    handleCabinSearchResponse,

    floggingConfirmationPrompt,
    handleFloggingConfirmationResponse,
    floggingReveal,
    clearFloggingReveal,

    handleStartConversion,
    handleRespondConversion,
    handleResetGame,
    handleBackToLobby,

    startCabinSearch, // For Cult Cabin Search (Server driven)
    isConversionDismissed,
    setIsConversionDismissed,
    isCabinSearchDismissed,
    setIsCabinSearchDismissed,

    startGunsStash,
    isGunsStashDismissed,
    setIsGunsStashDismissed,

    handleFeedTheKrakenResponse,
    feedTheKrakenPrompt,
    feedTheKrakenResult,
    clearFeedTheKrakenResult,

    offWithTonguePrompt,
    handleOffWithTongueResponse,
  } = useGame();
  const { t } = useT("common");

  const [localView, setLocalView] = useState<LocalView>("NONE");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBackToLobbyConfirm, setShowBackToLobbyConfirm] = useState(false);

  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (isLeavingRef.current) return; // Skip redirect during intentional leave
    if (lobby && lobby.status !== "PLAYING") {
      router.push("/lobby");
    } else if (!lobby) {
      // router.push("/"); // Let loading state handle it or redirect if timeout
    }
  }, [lobby, router]);

  const handleLeave = () => {
    isLeavingRef.current = true;
    router.replace("/");
    leaveLobby();
  };

  const handleDismissLocalView = () => {
    setLocalView("NONE");
  };

  if (!lobby || lobby.status !== "PLAYING") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">{t("game.loading")}</p>
        </div>
      </div>
    );
  }

  // Check if the current player is eliminated
  const me = lobby.players.find((p) => p.id === myPlayerId);
  const isEliminated = me?.isEliminated;

  // Determine Active View
  let activeView = "DASHBOARD";

  // 1. Role Selection (all players, including eliminated, can see role selection)
  if (lobby.roleSelectionStatus?.state === "SELECTING") {
    activeView = "ROLE_SELECTION";
  }
  // For eliminated players, skip Cult Ritual views - they stay on DASHBOARD (which shows eliminated screen)
  // 2. Conversion
  else if (
    !isEliminated &&
    (lobby.conversionStatus?.state === "ACTIVE" ||
      (lobby.conversionStatus?.state === "COMPLETED" && !isConversionDismissed))
  ) {
    activeView = "CONVERSION";
  }
  // 3. Cult Cabin Search
  else if (
    !isEliminated &&
    (lobby.cabinSearchStatus?.state === "SETUP" ||
      lobby.cabinSearchStatus?.state === "ACTIVE" ||
      (lobby.cabinSearchStatus?.state === "COMPLETED" &&
        !isCabinSearchDismissed))
  ) {
    activeView = "CULT_CABIN_SEARCH";
  }
  // 4. Cult Guns Stash
  else if (
    !isEliminated &&
    (lobby.gunsStashStatus?.state === "WAITING_FOR_PLAYERS" ||
      lobby.gunsStashStatus?.state === "DISTRIBUTION" ||
      (lobby.gunsStashStatus?.state === "COMPLETED" && !isGunsStashDismissed))
  ) {
    activeView = "CULT_GUNS_STASH";
  }
  // 5. Local Views
  else if (localView !== "NONE") {
    activeView = localView;
  }

  return (
    <>
      <Activity mode={activeView === "ROLE_SELECTION" ? "visible" : "hidden"}>
        <RoleSelectionView />
      </Activity>

      <Activity mode={activeView === "CONVERSION" ? "visible" : "hidden"}>
        <ConversionView onDismiss={() => setIsConversionDismissed(true)} />
      </Activity>

      <Activity
        mode={activeView === "CULT_CABIN_SEARCH" ? "visible" : "hidden"}
      >
        <CultCabinSearchView
          onDismiss={() => setIsCabinSearchDismissed(true)}
        />
      </Activity>

      <Activity mode={activeView === "CULT_GUNS_STASH" ? "visible" : "hidden"}>
        <CultGunsStashView onDismiss={() => setIsGunsStashDismissed(true)} />
      </Activity>

      <Activity mode={activeView === "CABIN_SEARCH" ? "visible" : "hidden"}>
        <CabinSearchView onDismiss={handleDismissLocalView} />
      </Activity>

      <Activity mode={activeView === "FEED_KRAKEN" ? "visible" : "hidden"}>
        <FeedTheKrakenView onDismiss={handleDismissLocalView} />
      </Activity>

      <Activity mode={activeView === "FLOGGING" ? "visible" : "hidden"}>
        <FloggingView onDismiss={handleDismissLocalView} />
      </Activity>

      <Activity mode={activeView === "OFF_WITH_TONGUE" ? "visible" : "hidden"}>
        <OffWithTongueView onDismiss={handleDismissLocalView} />
      </Activity>

      <Activity mode={activeView === "DENIAL" ? "visible" : "hidden"}>
        <DenialView onDismiss={handleDismissLocalView} />
      </Activity>

      {/* Manual visibility management for Dashboard to ensure reliability while preserving state */}
      <div
        style={{
          display: activeView === "DASHBOARD" ? "block" : "none",
        }}
      >
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900 flex flex-col">
          {/* Background Texture Ambient */}
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
          <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

          <main className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col p-4">
            {error && (
              <div className="mb-4">
                <InlineError message={error} onDismiss={() => setError(null)} />
              </div>
            )}
            <GameView
              lobby={lobby}
              myRole={myRole}
              myPlayerId={myPlayerId}
              onLeave={handleLeave}
              className=""
              // Pass callbacks to open local views
              onOpenCabinSearch={() => setLocalView("CABIN_SEARCH")}
              onOpenFeedTheKraken={() => setLocalView("FEED_KRAKEN")}
              onOpenFlogging={() => setLocalView("FLOGGING")}
              onOpenOffWithTongue={() => setLocalView("OFF_WITH_TONGUE")}
              onOpenDenial={() => setLocalView("DENIAL")}
              // Standard props

              onStartConversion={handleStartConversion}
              onStartCabinSearch={() => startCabinSearch()}
              onStartGunsStash={startGunsStash}
              onOpenResetGame={() => setShowResetConfirm(true)}
              onOpenBackToLobby={() => setShowBackToLobbyConfirm(true)}
            />
          </main>
        </div>
      </div>

      {/* Cult Cabin Search Cancellation Modal */}
      {lobby.cabinSearchStatus?.state === "CANCELLED" &&
        !isCabinSearchDismissed && (
          <CancellationModal.Root
            isOpen={true}
            onDismiss={() => setIsCabinSearchDismissed(true)}
          >
            <CancellationModal.Header title={t("cabinSearch.title")} />
            <CancellationModal.Body
              message={t("cabinSearch.interrupted")}
              reason={(() => {
                if (!lobby.cabinSearchStatus.cancellationReason)
                  return t("cabinSearch.cancelled");
                const [key, ...paramStrings] =
                  lobby.cabinSearchStatus.cancellationReason.split("|");
                const params: Record<string, string> = {};
                paramStrings.forEach((p) => {
                  const [k, v] = p.split(":");
                  if (k && v) params[k] = v;
                });
                return t(key, params);
              })()}
            />
            <CancellationModal.Action
              onClick={() => setIsCabinSearchDismissed(true)}
            />
          </CancellationModal.Root>
        )}

      {/* Guns Stash Cancellation Modal */}
      {lobby.gunsStashStatus?.state === "CANCELLED" &&
        !isGunsStashDismissed && (
          <CancellationModal.Root
            isOpen={true}
            onDismiss={() => setIsGunsStashDismissed(true)}
          >
            <CancellationModal.Header title={t("cultGunsStash.title")} />
            <CancellationModal.Body
              message={t("cultGunsStash.interrupted")}
              reason={(() => {
                if (!lobby.gunsStashStatus.cancellationReason)
                  return t("cultGunsStash.cancelled");
                const [key, ...paramStrings] =
                  lobby.gunsStashStatus.cancellationReason.split("|");
                const params: Record<string, string> = {};
                paramStrings.forEach((p) => {
                  const [k, v] = p.split(":");
                  if (k && v) params[k] = v;
                });
                return t(key, params);
              })()}
            />
            <CancellationModal.Action
              onClick={() => setIsGunsStashDismissed(true)}
            />
          </CancellationModal.Root>
        )}

      {cabinSearchPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-white mb-4">
              {t("cabinSearch.title")}
            </h2>
            <p className="text-slate-300 mb-6">
              <span className="font-bold text-white">
                {cabinSearchPrompt.searcherName}
              </span>{" "}
              {t("cabinSearch.request", {
                name: cabinSearchPrompt.searcherName,
              })}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleCabinSearchResponse(false)}
                className="flex-1 py-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => handleCabinSearchResponse(true)}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.allow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flogging Confirmation Modal (Target) */}
      {floggingConfirmationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-white mb-4">
              {t("flogging.title")}
            </h2>
            <p className="text-slate-300 mb-6">
              <span className="font-bold text-white">
                {floggingConfirmationPrompt.hostName}
              </span>{" "}
              {t("flogging.request")}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleFloggingConfirmationResponse(false)}
                className="flex-1 py-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => handleFloggingConfirmationResponse(true)}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.allow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {floggingReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-500">
          <div className="w-full max-w-md p-6 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              {t("flogging.resultTitle")}
            </h2>

            <div className="mb-8">
              <div className="h-[400px] w-full">
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <Avatar
                      url={
                        lobby.players.find(
                          (p) => p.id === floggingReveal.targetPlayerId,
                        )?.photoUrl || null
                      }
                      size="lg"
                      className="mb-4 ring-4 ring-amber-500/50"
                    />
                    <h3 className="text-xl font-bold text-white mb-2">
                      {
                        lobby.players.find(
                          (p) => p.id === floggingReveal.targetPlayerId,
                        )?.name
                      }
                    </h3>
                    <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 text-center">
                      <p className="text-slate-400 text-sm uppercase font-bold mb-2">
                        {t("flogging.isDefinitely")}
                      </p>
                      <p
                        className={`text-3xl font-bold ${getRoleColor(floggingReveal.revealedRole)}`}
                      >
                        {t("game.not")}{" "}
                        {t(`roles.${floggingReveal.revealedRole}`)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFloggingReveal}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
            >
              {t("actions.done")}
            </button>
          </div>
        </div>
      )}

      {/* Conversion Status Modal */}
      {lobby.conversionStatus &&
        lobby.conversionStatus.state === "CANCELLED" &&
        !isConversionDismissed && (
          <CancellationModal.Root
            isOpen={true}
            onDismiss={() => setIsConversionDismissed(true)}
          >
            <CancellationModal.Header title={t("conversion.title")} />
            <CancellationModal.Body
              message={t("conversion.interrupted")}
              reason={t("conversion.failed")}
            />
            <CancellationModal.Action
              onClick={() => setIsConversionDismissed(true)}
            />
          </CancellationModal.Root>
        )}

      {/* Conversion Pending Modal */}
      {!isEliminated &&
        lobby.conversionStatus &&
        lobby.conversionStatus.state === "PENDING" &&
        !isConversionDismissed && (
          <ReadyCheckModal.Root
            readyLabel={t("actions.accepted")}
            pendingLabel={t("actions.pending")}
          >
            <ReadyCheckModal.Header title={t("conversion.title")} />
            <ReadyCheckModal.Description>
              {t("conversion.ritualBegun")}
            </ReadyCheckModal.Description>

            <ReadyCheckModal.PlayerList>
              {sortPlayersWithSelfFirst(
                lobby.players.filter((p) => !p.isEliminated),
                myPlayerId,
              ).map((p) => (
                <ReadyCheckModal.PlayerItem
                  key={p.id}
                  player={p}
                  isReady={!!lobby.conversionStatus?.responses[p.id]}
                />
              ))}
            </ReadyCheckModal.PlayerList>

            {lobby.conversionStatus.responses[myPlayerId] && (
              <ReadyCheckModal.WaitingText>
                {t("game.waitingForOthers")}
              </ReadyCheckModal.WaitingText>
            )}

            <ReadyCheckModal.Actions>
              <ReadyCheckModal.ActionButtons>
                <ReadyCheckModal.CancelButton
                  onClick={() => handleRespondConversion(false)}
                >
                  {t("actions.cancel")}
                </ReadyCheckModal.CancelButton>
                <ReadyCheckModal.ReadyButton
                  onClick={() => handleRespondConversion(true)}
                  isReady={!!lobby.conversionStatus.responses[myPlayerId]}
                  readyLabel={t("actions.accepted")}
                  notReadyLabel={t("actions.accepted")}
                />
              </ReadyCheckModal.ActionButtons>
            </ReadyCheckModal.Actions>
          </ReadyCheckModal.Root>
        )}

      {/* Feed the Kraken Confirmation Modal (Target) */}
      {feedTheKrakenPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300 mx-4">
            <div className="flex items-center gap-3 mb-6">
              <Skull className="w-8 h-8 text-red-500" />
              <h2 className="text-xl font-bold text-white">
                {t("feedTheKraken.title")}
              </h2>
            </div>
            <p className="text-slate-300 mb-6">
              <span className="font-bold text-white">
                {feedTheKrakenPrompt.captainName}
              </span>{" "}
              {t("feedTheKraken.request")}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleFeedTheKrakenResponse(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => handleFeedTheKrakenResponse(true)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("feedTheKraken.acceptFate")}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedTheKrakenResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-500">
          <div className="w-full max-w-md p-6 flex flex-col items-center mx-4">
            {feedTheKrakenResult.cultVictory ? (
              <>
                <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 border-4 border-amber-500/50 animate-pulse">
                  <Eye className="w-12 h-12 text-amber-500" />
                </div>
                <h2 className="text-3xl font-bold text-amber-400 mb-4 text-center">
                  {t("feedTheKraken.cultWins")}
                </h2>
                <p className="text-slate-300 text-center mb-8">
                  {t("feedTheKraken.cultWinsDesc")}
                </p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border-4 border-red-500/50">
                  <Skull className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">
                  {t("feedTheKraken.resultTitle")}
                </h2>
                <div className="flex items-center gap-3 mb-6">
                  <Avatar
                    url={
                      lobby.players.find(
                        (p) => p.id === feedTheKrakenResult.targetPlayerId,
                      )?.photoUrl || null
                    }
                    size="lg"
                    className="ring-4 ring-red-500/50"
                  />
                  <div>
                    <p className="text-lg font-bold text-white">
                      {
                        lobby.players.find(
                          (p) => p.id === feedTheKrakenResult.targetPlayerId,
                        )?.name
                      }
                    </p>
                    <p className="text-sm text-red-400">
                      {t("game.eliminated")}
                    </p>
                  </div>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={clearFeedTheKrakenResult}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
            >
              {t("actions.done")}
            </button>
          </div>
        </div>
      )}

      {/* Off with the Tongue Confirmation Modal (Target) */}
      {offWithTonguePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-amber-900/50 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300 mx-4">
            <div className="flex items-center gap-3 mb-6">
              <Scissors className="w-8 h-8 text-amber-500" />
              <h2 className="text-xl font-bold text-white">
                {t("offWithTongue.title")}
              </h2>
            </div>
            <p className="text-slate-300 mb-4">
              <span className="font-bold text-white">
                {offWithTonguePrompt.captainName}
              </span>{" "}
              {t("offWithTongue.request")}
            </p>
            <p className="text-sm text-slate-400 mb-6">
              {t("offWithTongue.requestDesc")}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleOffWithTongueResponse(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => handleOffWithTongueResponse(true)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.allow")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Game Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300 mx-4">
            <h2 className="text-xl font-bold text-white mb-4">
              {t("game.resetGame")}
            </h2>
            <p className="text-slate-400 mb-8">
              {t(
                "game.resetGameDesc",
                "Are you sure you want to reset the game? This action cannot be undone.",
              )}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
              >
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  handleResetGame();
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("game.resetGame")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Lobby Confirmation Modal */}
      {showBackToLobbyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300 mx-4">
            <h2 className="text-xl font-bold text-white mb-4">
              {t("game.backToLobby")}
            </h2>
            <p className="text-slate-400 mb-8">
              {t(
                "game.backToLobbyDesc",
                "Are you sure you want to go back to the lobby? The current game state will be lost.",
              )}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowBackToLobbyConfirm(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
              >
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBackToLobbyConfirm(false);
                  handleBackToLobby();
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
