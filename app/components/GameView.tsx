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
import { useState } from "react";
import { Avatar } from "../components/Avatar";
import { RoleReveal } from "../components/RoleReveal";
import { useT } from "../i18n/client";
import type { LobbyState, Role } from "../types";
import { cn } from "../utils";
import { getRoleColor } from "../utils/role-utils";

import { TeamComposition } from "./TeamComposition";

interface GameViewProps {
  lobby: LobbyState;
  myRole: Role | null;
  myPlayerId: string;
  onLeave: () => void;

  onStartConversion: () => void;
  // conversionStatus removed

  onStartCabinSearch: () => void;
  // isCabinSearchDismissed moved

  onStartGunsStash: () => void;
  // isGunsStashDismissed moved

  onOpenCabinSearch: () => void;
  onOpenFeedTheKraken: () => void;
  onOpenFlogging: () => void;
  onOpenOffWithTongue: () => void;
  onOpenDenial: () => void;

  onOpenResetGame: () => void;
  onOpenBackToLobby: () => void;
  className?: string;
}

export function GameView({
  lobby,
  myRole,
  myPlayerId,
  onLeave,

  onStartConversion,
  onStartCabinSearch,

  onStartGunsStash,

  onOpenCabinSearch,
  onOpenFeedTheKraken,
  onOpenFlogging,
  onOpenOffWithTongue,
  onOpenDenial,

  onOpenResetGame,
  onOpenBackToLobby,
  className,
}: GameViewProps) {
  const { t } = useT("common");
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);

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

  // Compute if conversion is disabled (at limit OR no convertible players)
  const wasConvertedToCultist = (playerId: string) =>
    lobby.assignments?.[playerId] === "CULTIST" &&
    lobby.originalRoles?.[playerId] !== "CULTIST";
  const hasConvertiblePlayers = lobby.players.some(
    (p) =>
      !p.isEliminated &&
      !p.isUnconvertible &&
      !wasConvertedToCultist(p.id) &&
      lobby.assignments?.[p.id] !== "CULT_LEADER",
  );
  const isConversionDisabled =
    (lobby.conversionCount || 0) >= 3 || !hasConvertiblePlayers;

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
    <div
      data-testid="game-view"
      className={cn(
        "flex-1 flex flex-col items-center justify-center space-y-6",
        className,
      )}
    >
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
            // Show "Your Leader" if:
            // 1. Player was converted (original role was NOT Cultist), OR
            // 2. Player is in convertedPlayerIds (original Cultist who was converted and now knows leader)
            (lobby.originalRoles[myPlayerId] !== "CULTIST" ||
              lobby.convertedPlayerIds?.includes(myPlayerId)) && (
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

          {myRole === "CULT_LEADER" && lobby.assignments && (
            <div
              data-testid="role-team-info"
              className="mt-6 pt-6 border-t border-slate-700 w-full"
            >
              <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-3 text-center">
                {t("game.yourConverts")}
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {lobby.players
                  .filter(
                    (p) =>
                      p.id !== myPlayerId &&
                      lobby.convertedPlayerIds?.includes(p.id),
                  )
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
                {(!lobby.convertedPlayerIds ||
                  lobby.convertedPlayerIds.length === 0) && (
                  <p className="text-xs text-slate-500 italic">
                    {t("game.noConverts")}
                  </p>
                )}
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
          <button
            type="button"
            onClick={() => {
              if ((lobby.cabinSearchCount || 0) >= 2) {
                window.alert(t("cabinSearch.limitReached"));
              } else {
                onOpenCabinSearch();
              }
            }}
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              (lobby.cabinSearchCount || 0) >= 2
                ? "bg-slate-800/50 text-slate-500 border border-slate-800"
                : "bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-800/50"
            }`}
          >
            <Search className="w-5 h-5" />
            {(lobby.cabinSearchCount || 0) >= 2
              ? `${t("cabinSearch.title")} (${t("flogging.used")})`
              : t("cabinSearch.title")}
          </button>

          <button
            type="button"
            onClick={() => {
              if (lobby.isCultCabinSearchUsed) {
                window.alert(t("cabinSearch.alreadyUsed"));
              } else {
                onStartCabinSearch();
              }
            }}
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              lobby.isCultCabinSearchUsed
                ? "bg-slate-800/50 text-slate-500 border border-slate-800"
                : "bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50"
            }`}
          >
            <Eye className="w-5 h-5" />
            {lobby.isCultCabinSearchUsed
              ? `${t("cabinSearch.title")} (${t("cabinSearch.cult")}) (${t("flogging.used")})`
              : `${t("cabinSearch.title")} (${t("cabinSearch.cult")})`}
          </button>

          <button
            type="button"
            onClick={() => {
              if (lobby.isGunsStashUsed) {
                window.alert(t("cultGunsStash.alreadyUsed"));
              } else {
                onStartGunsStash();
              }
            }}
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              lobby.isGunsStashUsed
                ? "bg-slate-800/50 text-slate-500 border border-slate-800"
                : "bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50"
            }`}
          >
            <Target className="w-5 h-5" />
            {lobby.isGunsStashUsed
              ? `${t("cultGunsStash.title")} (${t("flogging.used")})`
              : t("cultGunsStash.title")}
          </button>

          <button
            type="button"
            onClick={onOpenDenial}
            className="w-full py-3 bg-red-950/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            {t("denial.title")}
          </button>

          <button
            type="button"
            onClick={() => {
              if (lobby.isFloggingUsed) {
                window.alert(t("flogging.alreadyUsed"));
              } else {
                onOpenFlogging();
              }
            }}
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
          </button>

          <button
            type="button"
            onClick={() => {
              if ((lobby.conversionCount || 0) >= 3) {
                window.alert(t("conversion.limitReached"));
              } else if (!hasConvertiblePlayers) {
                window.alert(t("conversion.noConvertiblePlayers"));
              } else {
                onStartConversion();
              }
            }}
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              isConversionDisabled
                ? "bg-slate-800/50 text-slate-500 border border-slate-800"
                : "bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 border border-amber-900/50"
            }`}
          >
            <Eye className="w-5 h-5" />
            {isConversionDisabled
              ? `${t("conversion.title")} (${t("flogging.used")})`
              : t("conversion.title")}
          </button>

          <button
            type="button"
            onClick={() => {
              if ((lobby.feedTheKrakenCount || 0) >= 2) {
                window.alert(t("feedTheKraken.limitReached"));
              } else {
                onOpenFeedTheKraken();
              }
            }}
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              (lobby.feedTheKrakenCount || 0) >= 2
                ? "bg-slate-800/50 text-slate-500 border border-slate-800"
                : "bg-red-950/30 hover:bg-red-900/50 text-red-200 border border-red-900/50"
            }`}
          >
            <Skull className="w-5 h-5" />
            {(lobby.feedTheKrakenCount || 0) >= 2
              ? `${t("feedTheKraken.title")} (${t("flogging.used")})`
              : t("feedTheKraken.title")}
          </button>

          <button
            type="button"
            onClick={() => {
              if (lobby.isOffWithTongueUsed) {
                window.alert(t("offWithTongue.alreadyUsed"));
              } else {
                onOpenOffWithTongue();
              }
            }}
            className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              lobby.isOffWithTongueUsed
                ? "bg-slate-800/50 text-slate-500 border border-slate-800"
                : "bg-amber-900/30 hover:bg-amber-900/50 text-amber-200 border border-amber-800/50"
            }`}
          >
            <Scissors className="w-5 h-5" />
            {lobby.isOffWithTongueUsed
              ? `${t("offWithTongue.title")} (${t("flogging.used")})`
              : t("offWithTongue.title")}
          </button>

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
                onClick={onOpenResetGame}
                className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <AlertTriangle className="w-5 h-5" />
                {t("game.resetGame")}
              </button>

              <button
                type="button"
                onClick={onOpenBackToLobby}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Target className="w-5 h-5" />
                {t("game.backToLobby")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modals have been moved to GamePage */}

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
