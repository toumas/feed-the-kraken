"use client";

import { Anchor, Eye, Search, Skull } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "../components/Avatar";
import { GameHeader } from "../components/GameHeader";
import { PlayerSelectionList } from "../components/PlayerSelectionList";
import { RoleReveal } from "../components/RoleReveal";
import { useGame } from "../context/GameContext";
import type { Role } from "../types";
import { getRoleColor } from "../utils/role-utils";

export default function CabinSearchPage() {
  const router = useRouter();
  const {
    lobby,
    myPlayerId,
    handleCabinSearch,
    isCabinSearchPending,
    cabinSearchResult,
    clearCabinSearchResult,
  } = useGame();

  const getRoleDetails = (role: Role) => {
    const color = getRoleColor(role);
    switch (role) {
      case "PIRATE":
        return {
          title: "Pirate",
          desc: "Sabotage the journey! Feed the Kraken or kill the Captain.",
          icon: <Skull className={`w-16 h-16 ${color}`} />,
          color,
        };
      case "CULT_LEADER":
        return {
          title: "Cult Leader",
          desc: "Convert others to your cause. You win if you are chosen to feed the Kraken.",
          icon: <Eye className={`w-16 h-16 ${color}`} />,
          color,
        };
      case "CULTIST":
        return {
          title: "Cultist",
          desc: "Support the Cult Leader's cause.",
          icon: <Eye className={`w-16 h-16 ${color}`} />,
          color,
        };
      default:
        return {
          title: "Loyal Sailor",
          desc: "Steer the ship safely to port. Trust no one!",
          icon: <Anchor className={`w-16 h-16 ${color}`} />,
          color,
        };
    }
  };

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  const targetPlayer = cabinSearchResult
    ? lobby.players.find((p) => p.id === cabinSearchResult.targetPlayerId)
    : null;
  const resultRoleInfo = cabinSearchResult
    ? getRoleDetails(cabinSearchResult.role)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        <GameHeader
          title="Cabin Search"
          icon={<Anchor className="w-5 h-5" />}
        />
        <div className="flex-1 p-6">
          <PlayerSelectionList.Root
            players={lobby.players}
            myPlayerId={myPlayerId}
          >
            <PlayerSelectionList.Content disabledLabel="Already searched" />
            <PlayerSelectionList.Actions>
              <PlayerSelectionList.Submit
                onSubmit={(targetId) => {
                  handleCabinSearch(targetId);
                  // We stay on this page to show the pending state and result
                }}
              >
                Confirm Search
              </PlayerSelectionList.Submit>
              <PlayerSelectionList.Cancel onCancel={() => router.push("/")}>
                Cancel
              </PlayerSelectionList.Cancel>
            </PlayerSelectionList.Actions>
          </PlayerSelectionList.Root>
        </div>

        {/* Pending State Overlay */}
        {isCabinSearchPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-300 flex flex-col items-center mx-4">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">
                Waiting for Confirmation
              </h2>
              <p className="text-slate-400 text-center">
                The crewmate must allow the search...
              </p>
            </div>
          </div>
        )}

        {/* Result Overlay */}
        {cabinSearchResult && resultRoleInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md mx-4">
              <RoleReveal.Root className="max-w-sm mx-auto">
                <RoleReveal.Canvas className="h-[480px]">
                  <RoleReveal.Hidden>
                    <div className="w-32 h-32 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border-4 border-slate-700/50">
                      <Search className="w-16 h-16 text-slate-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-center text-slate-200 drop-shadow-lg mb-2">
                      Cabin Searched
                    </h2>
                    <p className="text-slate-400 text-center text-lg font-medium">
                      Press and hold to reveal the loyalty card.
                    </p>
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
                            Converted to Cult
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
                    <RoleReveal.Description>
                      You found {targetPlayer?.name}&apos;s loyalty card!
                    </RoleReveal.Description>

                    <div className="flex justify-center">
                      <Avatar
                        url={targetPlayer?.photoUrl}
                        size="lg"
                        className="ring-4 ring-slate-800"
                      />
                    </div>
                  </RoleReveal.Revealed>
                </RoleReveal.Canvas>
              </RoleReveal.Root>

              <button
                type="button"
                onClick={() => {
                  clearCabinSearchResult();
                  router.push("/");
                }}
                className="w-full mt-4 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all active:scale-95 border border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
