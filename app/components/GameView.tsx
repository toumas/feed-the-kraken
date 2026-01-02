import {
  AlertTriangle,
  Anchor,
  Eye,
  Gavel,
  LogOut,
  Scissors,
  Search,
  Skull,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "../components/Avatar";
import { RoleReveal } from "../components/RoleReveal";
import { useT } from "../i18n/client";
import type { LobbyState, Role } from "../types";
import { cn } from "../utils";
import { getRoleColor } from "../utils/role-utils";
import { CancellationModal } from "./CancellationModal";
import { TeamComposition } from "./TeamComposition";

interface GameViewProps {
  lobby: LobbyState;
  myRole: Role | null;
  myPlayerId: string;
  onLeave: () => void;

  onCabinSearch: (targetPlayerId: string) => void;
  cabinSearchPrompt: { searcherId: string; searcherName: string } | null;
  cabinSearchResult: { targetPlayerId: string; role: Role } | null;
  onCabinSearchResponse: (confirmed: boolean) => void;
  onClearCabinSearchResult: () => void;
  isCabinSearchPending: boolean;

  floggingConfirmationPrompt: { hostId: string; hostName: string } | null;
  onFloggingConfirmationResponse: (confirmed: boolean) => void;
  floggingReveal: { targetPlayerId: string; revealedRole: Role } | null;
  onClearFloggingReveal: () => void;

  onStartConversion: () => void;
  conversionStatus: {
    initiatorId: string;
    responses: Record<string, boolean>;
    state: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  } | null;
  onRespondConversion: (accept: boolean) => void;
  isConversionDismissed: boolean;
  onDismissConversion: () => void;

  onStartCabinSearch: () => void;
  isCabinSearchDismissed: boolean;
  onDismissCabinSearch: () => void;

  onStartGunsStash: () => void;
  isGunsStashDismissed: boolean;
  onDismissGunsStash: () => void;

  // Feed the Kraken
  feedTheKrakenPrompt: { captainId: string; captainName: string } | null;
  onFeedTheKrakenResponse: (confirmed: boolean) => void;
  feedTheKrakenResult: { targetPlayerId: string; cultVictory: boolean } | null;
  onClearFeedTheKrakenResult: () => void;

  // Off with the Tongue
  offWithTonguePrompt: { captainId: string; captainName: string } | null;
  onOffWithTongueResponse: (confirmed: boolean) => void;

  onResetGame: () => void;
  onBackToLobby: () => void;
}

export function GameView({
  lobby,
  myRole,
  myPlayerId,
  onLeave,

  cabinSearchPrompt,
  onCabinSearchResponse,

  floggingConfirmationPrompt,
  onFloggingConfirmationResponse,
  floggingReveal,
  onClearFloggingReveal,

  onStartConversion,
  conversionStatus,
  onRespondConversion,
  isConversionDismissed,
  onDismissConversion,

  onStartCabinSearch,
  isCabinSearchDismissed,
  onDismissCabinSearch,

  onStartGunsStash,
  isGunsStashDismissed,
  onDismissGunsStash,

  feedTheKrakenPrompt,
  onFeedTheKrakenResponse,
  feedTheKrakenResult,
  onClearFeedTheKrakenResult,

  offWithTonguePrompt,
  onOffWithTongueResponse,

  onResetGame,
  onBackToLobby,
}: GameViewProps) {
  const { t } = useT("common");
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBackToLobbyConfirm, setShowBackToLobbyConfirm] = useState(false);

  const getRoleDetails = (role: Role | null) => {
    const color = getRoleColor(role);
    switch (role) {
      case "PIRATE":
        return {
          title: t("roles.PIRATE"),
          desc: t("roles.PIRATE_DESC"),
          icon: <Skull className={`w-16 h-16 ${color}`} />,
          color,
        };
      case "CULT_LEADER":
        return {
          title: t("roles.CULT_LEADER"),
          desc: t("roles.CULT_LEADER_DESC"),
          icon: <Eye className={`w-16 h-16 ${color}`} />,
          color,
        };
      case "CULTIST":
        return {
          title: t("roles.CULTIST"),
          desc: t("roles.CULTIST_DESC"),
          icon: <Eye className={`w-16 h-16 ${color}`} />,
          color,
        };
      default:
        return {
          title: t("roles.SAILOR"),
          desc: t("roles.SAILOR_DESC"),
          icon: <Anchor className={`w-16 h-16 ${color}`} />,
          color,
        };
    }
  };

  const roleInfo = getRoleDetails(myRole);
  const me = lobby.players.find((p) => p.id === myPlayerId);
  const isEliminated = me?.isEliminated;

  if (isEliminated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-700">
        <div className="text-center space-y-4">
          <Skull className="w-24 h-24 text-slate-600 mx-auto" />
          <h2 className="text-3xl font-bold text-slate-500">
            {t("game.eliminated")}
          </h2>
          <p className="text-slate-400 max-w-xs mx-auto">
            {t("game.eliminatedDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowEndSessionConfirm(true)}
          className="px-6 py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 rounded-xl font-medium transition-colors border border-slate-700"
        >
          {t("game.returnToShore")}
        </button>

        {/* End Session Confirmation Modal */}
        {showEndSessionConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
              <h2 className="text-xl font-bold text-white mb-4">
                {t("game.endSession")}
              </h2>
              <p className="text-slate-400 mb-8">{t("game.endSessionDesc")}</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowEndSessionConfirm(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
                >
                  {t("game.stay")}
                </button>
                <button
                  type="button"
                  onClick={onLeave}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
                >
                  {t("game.leave")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-700">
      <RoleReveal.Root className="max-w-sm mx-auto">
        <RoleReveal.Hidden />
        <RoleReveal.Revealed className="space-y-6">
          <RoleReveal.Icon>{roleInfo.icon}</RoleReveal.Icon>
          <RoleReveal.Title className={roleInfo.color}>
            {roleInfo.title}
          </RoleReveal.Title>
          <RoleReveal.Description>{roleInfo.desc}</RoleReveal.Description>
          <RoleReveal.HideInstruction className="mt-4" />
          {myRole === "PIRATE" && lobby.assignments && (
            <div
              data-testid="role-team-info"
              className="mt-6 pt-6 border-t border-slate-700 w-full"
            >
              <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-3 text-center">
                {t("game.pirateCrew")}
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {lobby.players
                  .filter(
                    (p) =>
                      p.id !== myPlayerId &&
                      (lobby.originalRoles?.[p.id] === "PIRATE" ||
                        lobby.assignments?.[p.id] === "PIRATE"),
                  )
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col items-center gap-1"
                    >
                      <Avatar
                        url={p.photoUrl}
                        size="sm"
                        className="ring-2 ring-red-900/50"
                      />
                      <span className="text-xs text-red-200/70 font-medium max-w-[60px] truncate">
                        {p.name}
                      </span>
                    </div>
                  ))}
                {lobby.players.filter(
                  (p) =>
                    p.id !== myPlayerId &&
                    (lobby.originalRoles?.[p.id] === "PIRATE" ||
                      lobby.assignments?.[p.id] === "PIRATE"),
                ).length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    {t("game.noPirates")}
                  </p>
                )}
              </div>
            </div>
          )}

          {myRole === "CULTIST" &&
            lobby.assignments &&
            lobby.originalRoles &&
            lobby.originalRoles[myPlayerId] !== "CULTIST" && (
              <div
                data-testid="role-team-info"
                className="mt-6 pt-6 border-t border-slate-700 w-full"
              >
                <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-3 text-center">
                  {t("game.yourLeader")}
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {lobby.players
                    .filter((p) => lobby.assignments?.[p.id] === "CULT_LEADER")
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col items-center gap-1"
                      >
                        <Avatar
                          url={p.photoUrl}
                          size="sm"
                          className="ring-2 ring-purple-900/50"
                        />
                        <span className="text-xs text-purple-200/70 font-medium max-w-[60px] truncate">
                          {p.name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </RoleReveal.Revealed>
      </RoleReveal.Root>

      {/* Team Composition */}
      <TeamComposition
        playerCount={
          lobby.assignments
            ? Object.keys(lobby.assignments).length
            : lobby.players.length
        }
      />

      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 w-full max-w-sm">
        {/* Public Info Section */}
        {lobby.players.some((p) => p.notRole) && (
          <div className="mb-6 pb-6 border-b border-slate-800">
            <h3 className="text-sm text-slate-500 uppercase mb-4 font-bold">
              {t("game.publicInfo")}
            </h3>
            <div className="space-y-3">
              {lobby.players
                .filter((p) => p.notRole)
                .map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700"
                    >
                      <Avatar url={p.photoUrl} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-slate-200">
                          {p.name}
                        </p>
                        <p
                          className={`text-xs font-bold ${getRoleColor(p.notRole)}`}
                        >
                          {t("game.not")} {t(`roles.${p.notRole}`)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <h3 className="text-sm text-slate-500 uppercase mb-4 font-bold">
          {t("game.crewStatus")}
        </h3>
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-3">
            {lobby.players.map((p) => (
              <div
                key={p.id}
                data-testid="sailor-card"
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <Avatar
                    url={p.photoUrl}
                    size="sm"
                    className={cn(
                      "ring-2",
                      p.isEliminated
                        ? "ring-slate-600 opacity-50 grayscale"
                        : "ring-slate-700",
                      !p.isEliminated && p.isUnconvertible && "ring-purple-500",
                      !p.isEliminated &&
                        p.hasTongue === false &&
                        "ring-amber-500",
                    )}
                  />
                  <div className="absolute -bottom-1 -right-1 flex flex-wrap-reverse justify-end gap-0.5 pointer-events-none max-w-[40px]">
                    {p.isEliminated && (
                      <div className="w-4 h-4 bg-slate-600 rounded-full flex items-center justify-center shadow-sm">
                        <Skull className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {p.isUnconvertible && (
                      <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center shadow-sm">
                        <Search className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {p.hasTongue === false && (
                      <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                        <Scissors className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {p.isOnline === false && (
                      <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center shadow-sm">
                        <LogOut className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium truncate max-w-[70px] text-center ${p.isEliminated ? "text-slate-600 line-through" : "text-slate-400"}`}
                >
                  {p.name}
                </span>
                <div className="flex flex-col items-center">
                  {p.isEliminated && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase leading-tight">
                      {t("game.eliminated")}
                    </span>
                  )}
                  {p.isUnconvertible && (
                    <span className="text-[10px] text-purple-400 font-bold uppercase leading-tight">
                      {t("game.unconvertible")}
                    </span>
                  )}
                  {p.hasTongue === false && (
                    <span className="text-[10px] text-amber-400 font-bold uppercase leading-tight">
                      {t("game.silenced")}
                    </span>
                  )}
                  {p.isOnline === false && (
                    <span className="text-[10px] text-red-500 font-bold uppercase leading-tight">
                      {t("game.offline")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/cabin-search"
            className="w-full py-3 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-800/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            {t("cabinSearch.title")}
          </Link>

          <button
            type="button"
            onClick={onStartCabinSearch}
            className="w-full py-3 bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {t("cabinSearch.title")} ({t("cabinSearch.cult")})
          </button>

          <button
            type="button"
            onClick={onStartGunsStash}
            className="w-full py-3 bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Target className="w-5 h-5" />
            {t("cultGunsStash.title")}
          </button>

          <Link
            href="/denial"
            className="w-full py-3 bg-red-950/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            {t("denial.title")}
          </Link>

          <Link
            href="/flogging"
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              lobby.isFloggingUsed
                ? "bg-slate-800/50 text-slate-500 border border-slate-800"
                : "bg-amber-900/30 hover:bg-amber-900/50 text-amber-200 border border-amber-800/50"
            }`}
          >
            <Gavel className="w-5 h-5" />
            {lobby.isFloggingUsed
              ? `${t("flogging.title")} (${t("flogging.used")})`
              : t("flogging.title")}
          </Link>

          <button
            type="button"
            onClick={() => {
              if ((lobby.conversionCount || 0) >= 3) {
                window.alert(t("conversion.limitReached"));
              } else {
                onStartConversion();
              }
            }}
            className="w-full py-3 bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {t("conversion.title")}
          </button>

          <Link
            href="/feed-the-kraken"
            className="w-full py-3 bg-red-950/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Skull className="w-5 h-5" />
            {t("feedTheKraken.title")}
          </Link>

          <Link
            href="/off-with-tongue"
            className="w-full py-3 bg-amber-900/30 hover:bg-amber-900/50 text-amber-200 border border-amber-800/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Scissors className="w-5 h-5" />
            {t("offWithTongue.title")}
          </Link>

          <button
            type="button"
            onClick={() => setShowEndSessionConfirm(true)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            {t("game.endSession")}
          </button>

          {me?.isHost && (
            <>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <AlertTriangle className="w-5 h-5" />
                {t("game.resetGame")}
              </button>

              <button
                type="button"
                onClick={() => setShowBackToLobbyConfirm(true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Target className="w-5 h-5" />
                {t("game.backToLobby")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cult Cabin Search Cancellation Modal */}
      {lobby.cabinSearchStatus?.state === "CANCELLED" &&
        !isCabinSearchDismissed && (
          <CancellationModal.Root
            isOpen={true}
            onDismiss={onDismissCabinSearch}
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
            <CancellationModal.Action onClick={onDismissCabinSearch} />
          </CancellationModal.Root>
        )}

      {/* Guns Stash Cancellation Modal */}
      {lobby.gunsStashStatus?.state === "CANCELLED" &&
        !isGunsStashDismissed && (
          <CancellationModal.Root isOpen={true} onDismiss={onDismissGunsStash}>
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
            <CancellationModal.Action onClick={onDismissGunsStash} />
          </CancellationModal.Root>
        )}

      {/* Reset Game Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-red-900 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              {t("game.resetGame")}
            </h2>
            <p className="text-slate-300 mb-6">{t("game.resetGameDesc")}</p>
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
                  onResetGame();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Lobby Confirmation Modal */}
      {showBackToLobbyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-cyan-500" />
              {t("game.backToLobby")}
            </h2>
            <p className="text-slate-300 mb-6">{t("game.backToLobbyDesc")}</p>
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
                  onBackToLobby();
                  setShowBackToLobbyConfirm(false);
                }}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabin Search Confirmation Modal (Target) */}
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
              {t("cabinSearch.request")}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => onCabinSearchResponse(false)}
                className="flex-1 py-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => onCabinSearchResponse(true)}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.allow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Confirmation Modal */}
      {showEndSessionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-white mb-4">
              {t("game.endSession")}
            </h2>
            <p className="text-slate-400 mb-8">{t("game.endSessionDesc")}</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowEndSessionConfirm(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
              >
                {t("game.stay")}
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("game.leave")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Flogging Modal (Host) */}

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
                onClick={() => onFloggingConfirmationResponse(false)}
                className="flex-1 py-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => onFloggingConfirmationResponse(true)}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.allow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flogging Reveal Animation */}
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
              onClick={onClearFloggingReveal}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
            >
              {t("actions.done")}
            </button>
          </div>
        </div>
      )}

      {/* Conversion Status Modal */}
      {conversionStatus &&
        (conversionStatus.state === "PENDING" ||
          conversionStatus.state === "CANCELLED") &&
        !isConversionDismissed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 border border-amber-900/50 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-8 h-8 text-amber-500" />
                <h2 className="text-xl font-bold text-white">
                  {t("conversion.title")}
                </h2>
              </div>

              {conversionStatus.state === "CANCELLED" ? (
                <CancellationModal.Root
                  isOpen={true}
                  onDismiss={onDismissConversion}
                >
                  <CancellationModal.Header title={t("conversion.title")} />
                  <CancellationModal.Body
                    message={t("conversion.interrupted")}
                    reason={t("conversion.failed")}
                  />
                  <CancellationModal.Action onClick={onDismissConversion} />
                </CancellationModal.Root>
              ) : (
                <>
                  <p className="text-slate-300 mb-6">
                    {t("conversion.ritualBegun")}
                  </p>

                  <div className="space-y-2 mb-8 max-h-60 overflow-y-auto">
                    {lobby.players
                      .filter((p) => !p.isEliminated && p.isOnline)
                      .map((p) => {
                        const hasAccepted = conversionStatus.responses[p.id];
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar url={p.photoUrl} size="sm" />
                              <span className="text-slate-200 font-medium">
                                {p.name}
                              </span>
                            </div>
                            {hasAccepted ? (
                              <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                                {t("actions.accepted")}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-sm font-bold flex items-center gap-1">
                                {t("actions.pending")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {!conversionStatus.responses[myPlayerId] && (
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => onRespondConversion(false)}
                        className="flex-1 py-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-xl font-bold transition-colors"
                      >
                        {t("actions.deny")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondConversion(true)}
                        className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors"
                      >
                        {t("actions.allow")}
                      </button>
                    </div>
                  )}

                  {conversionStatus.responses[myPlayerId] && (
                    <div className="flex flex-col gap-3">
                      <p className="text-center text-slate-500 italic">
                        {t("game.waitingForOthers")}
                      </p>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => onRespondConversion(false)}
                          className="flex-1 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded-xl font-bold transition-colors border border-red-900/30"
                        >
                          {t("actions.deny")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            window.alert(t("conversion.alreadyAccepted"))
                          }
                          className="flex-1 py-3 bg-amber-600/50 text-white/50 cursor-not-allowed rounded-xl font-bold border border-amber-600/20"
                        >
                          {t("actions.accepted")}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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
                onClick={() => onFeedTheKrakenResponse(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => onFeedTheKrakenResponse(true)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("feedTheKraken.acceptFate")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed the Kraken Result Modal */}
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
              onClick={onClearFeedTheKrakenResult}
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
                onClick={() => onOffWithTongueResponse(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors"
              >
                {t("actions.deny")}
              </button>
              <button
                type="button"
                onClick={() => onOffWithTongueResponse(true)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors"
              >
                {t("actions.allow")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
