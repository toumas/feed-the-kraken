"use client";

import { Anchor, Eye, Search, Skull } from "lucide-react";
import { useEffect, useState } from "react";
import { useGame } from "../../context/GameContext";
import { useT } from "../../i18n/client";
import type { Role } from "../../types";
import { getRoleColor } from "../../utils/role-utils";
import { Avatar } from "../Avatar";
import { GameHeader } from "../GameHeader";
import { InlineError } from "../InlineError";
import { PlayerSelectionList } from "../PlayerSelectionList";
import { RoleReveal } from "../RoleReveal";

interface CabinSearchViewProps {
  onDismiss: () => void;
}

export function CabinSearchView({ onDismiss }: CabinSearchViewProps) {
  const {
    lobby,
    myPlayerId,
    handleCabinSearch,
    cabinSearchResult,
    clearCabinSearchResult,
    error,
  } = useGame();
  const { t } = useT("common");
  const [isPending, setIsPending] = useState(false);

  // Clear pending state if error occurs (e.g. denial)
  useEffect(() => {
    if (error && isPending) {
      setIsPending(false);
    }
  }, [error, isPending]);

  // Clear pending state when result is received
  useEffect(() => {
    if (cabinSearchResult && isPending) {
      setIsPending(false);
    }
  }, [cabinSearchResult, isPending]);

  const getRoleDetails = (role: Role) => {
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

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        {t("game.loading")}
      </div>
    );
  }

  const handlePlayerSelect = (targetId: string) => {
    handleCabinSearch(targetId);
    setIsPending(true);
  };

  const targetPlayer = cabinSearchResult
    ? lobby.players.find((p) => p.id === cabinSearchResult.targetPlayerId)
    : null;
  const resultRoleInfo = cabinSearchResult
    ? getRoleDetails(cabinSearchResult.role)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900 flex flex-col">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col">
        <GameHeader
          title={t("cabinSearch.title")}
          icon={<Anchor className="w-5 h-5" />}
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
                disabledLabel={t("cabinSearch.alreadySearched")}
              />
              <PlayerSelectionList.Actions>
                <PlayerSelectionList.Submit onSubmit={handlePlayerSelect}>
                  {t("cabinSearch.confirmSearch")}
                </PlayerSelectionList.Submit>
                <PlayerSelectionList.Cancel onCancel={onDismiss}>
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
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">
                {t("cabinSearch.waitingConfirmation")}
              </h2>
              <p className="text-slate-400 text-center">
                {t("cabinSearch.waitingConfirmationDesc")}
              </p>
            </div>
          </div>
        )}

        {/* Result Overlay */}
        {cabinSearchResult && resultRoleInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md mx-4">
              <RoleReveal.Root className="max-w-sm mx-auto">
                <RoleReveal.Hidden>
                  <div className="w-32 h-32 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border-4 border-slate-700/50">
                    <Search className="w-16 h-16 text-slate-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-center text-slate-200 drop-shadow-lg mb-4">
                    {t("cabinSearch.searchedTitle")}
                  </h2>
                </RoleReveal.Hidden>

                <RoleReveal.Revealed className="space-y-6">
                  {/* Show original role with Cultist badge if converted */}
                  {cabinSearchResult.role === "CULTIST" &&
                  cabinSearchResult.originalRole ? (
                    <>
                      <RoleReveal.Icon>
                        {getRoleDetails(cabinSearchResult.originalRole).icon}
                      </RoleReveal.Icon>
                      <RoleReveal.Title
                        className={
                          getRoleDetails(cabinSearchResult.originalRole).color
                        }
                      >
                        {getRoleDetails(cabinSearchResult.originalRole).title}
                      </RoleReveal.Title>
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-900/30 border border-green-500/50 rounded-xl">
                        <Eye className="w-5 h-5 text-green-500" />
                        <span className="text-green-400 font-bold">
                          {t("cabinSearch.converted")}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <RoleReveal.Icon>{resultRoleInfo.icon}</RoleReveal.Icon>
                      <RoleReveal.Title className={resultRoleInfo.color}>
                        {resultRoleInfo.title}
                      </RoleReveal.Title>
                    </>
                  )}
                  <div className="flex justify-center">
                    <Avatar
                      url={targetPlayer?.photoUrl}
                      size="lg"
                      className="ring-4 ring-slate-800"
                    />
                  </div>
                  <RoleReveal.Description>
                    {t("cabinSearch.foundCard", { name: targetPlayer?.name })}
                  </RoleReveal.Description>
                  <RoleReveal.HideInstruction />
                </RoleReveal.Revealed>
              </RoleReveal.Root>

              <button
                type="button"
                onClick={() => {
                  clearCabinSearchResult();
                  onDismiss();
                }}
                className="w-full mt-4 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all active:scale-95 border border-slate-700"
              >
                {t("actions.done")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
