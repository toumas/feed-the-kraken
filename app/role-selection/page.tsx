"use client";

import { CheckCircle, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "../components/Avatar";
import { InlineError } from "../components/InlineError";
import { useGame } from "../context/GameContext";
import type { Role } from "../types";
import { getPossibleRolesForPlayerCount } from "../utils/role-utils";

const ROLE_INFO: Record<
  Role,
  { title: string; description: string; color: string }
> = {
  SAILOR: {
    title: "Loyal Sailor",
    description: "Serve the Captain faithfully. Reach the destination safely.",
    color: "text-cyan-400",
  },
  PIRATE: {
    title: "Pirate",
    description: "Sabotage the journey! Feed the Kraken or kill the Captain.",
    color: "text-red-400",
  },
  CULT_LEADER: {
    title: "Cult Leader",
    description: "Convert sailors to your cult and achieve dark victory.",
    color: "text-amber-500",
  },
  CULTIST: {
    title: "Cultist",
    description: "Serve the Cult Leader. Help spread the influence.",
    color: "text-green-400",
  },
};

export default function RoleSelectionPage() {
  const router = useRouter();
  const {
    lobby,
    myPlayerId,
    selectRole,
    confirmRole,
    cancelRoleSelection,
    error: serverError,
    setError,
  } = useGame();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = serverError || localError;

  // Redirect if no lobby or not in role selection state
  useEffect(() => {
    if (!lobby) {
      router.push("/");
      return;
    }

    // If role selection is complete, go to game
    if (
      lobby.roleSelectionStatus?.state === "COMPLETED" ||
      lobby.assignments?.[myPlayerId]
    ) {
      router.push("/game");
    }

    // If role selection is cancelled, go back to lobby
    if (lobby.roleSelectionStatus?.state === "CANCELLED") {
      router.push("/lobby");
    }
  }, [lobby, myPlayerId, router]);

  const roleSelectionStatus = lobby?.roleSelectionStatus;

  if (!lobby || !roleSelectionStatus) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const mySelection = roleSelectionStatus.selections[myPlayerId];
  const hasConfirmed = mySelection?.confirmed;

  // Count confirmed players
  const confirmedCount = Object.values(roleSelectionStatus.selections).filter(
    (s) => s.confirmed,
  ).length;
  const totalPlayers = lobby.players.length;
  const allConfirmed = confirmedCount === totalPlayers;

  const handleRoleSelect = (role: Role) => {
    if (hasConfirmed) return;

    selectRole(role);
    setPendingRole(role);
    setLocalError(null);
    setError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmRole = () => {
    confirmRole();
    setShowConfirmModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <Eye className="w-6 h-6 text-cyan-500" />
          <h1 className="text-xl font-bold text-white">Choose Your Role</h1>
        </div>

        <p className="text-slate-300">
          Select the role you want to play this game. Once confirmed, your role
          cannot be changed.
        </p>

        {/* Player List with Status (shown after selection) */}
        {hasConfirmed && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {lobby.players.map((player) => {
              const playerSelection = roleSelectionStatus.selections[player.id];
              const isConfirmed = playerSelection?.confirmed;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <Avatar url={player.photoUrl} size="sm" />
                    <span className="text-slate-200 font-medium">
                      {player.name}
                    </span>
                  </div>
                  {isConfirmed ? (
                    <span className="text-green-400 text-sm font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Ready
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm font-bold flex items-center gap-1">
                      Pending...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Role Selection */}
        {!hasConfirmed && (
          <div className="pt-4 border-t border-slate-800">
            <h2 className="text-lg font-bold text-white text-center mb-4">
              Select Your Role
            </h2>
            {error && (
              <div className="mb-4">
                <InlineError message={error} onDismiss={() => setError(null)} />
              </div>
            )}
            <div className="space-y-3">
              {getPossibleRolesForPlayerCount(lobby.players.length).map(
                (role) => {
                  const info = ROLE_INFO[role];
                  const isSelected = mySelection?.role === role;

                  return (
                    <RoleButton
                      key={role}
                      label={info.title}
                      description={info.description}
                      isSelected={isSelected}
                      colorClass={info.color}
                      onSelect={() => handleRoleSelect(role)}
                    />
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Waiting state after confirmation */}
        {hasConfirmed && !allConfirmed && (
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="italic">
                Waiting for others... ({confirmedCount}/{totalPlayers})
              </span>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <button
          type="button"
          onClick={cancelRoleSelection}
          className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded-xl font-bold transition-colors border border-red-900/50"
        >
          Cancel
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">
              Confirm Your Role
            </h2>

            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 mb-4">
              <p
                className={`text-2xl font-bold text-center ${ROLE_INFO[pendingRole].color}`}
              >
                {ROLE_INFO[pendingRole].title}
              </p>
              <p className="text-sm text-slate-400 text-center mt-2">
                {ROLE_INFO[pendingRole].description}
              </p>
            </div>

            <div className="bg-amber-950/50 border border-amber-500/50 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-200 text-center">
                ⚠️ This cannot be changed once confirmed!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRole}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleButton({
  label,
  description,
  isSelected,
  colorClass,
  onSelect,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  colorClass: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-4 rounded-xl border text-left transition-all ${
        isSelected
          ? "bg-cyan-900/40 border-cyan-500 ring-2 ring-cyan-500/50 text-cyan-100"
          : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className={`font-bold ${isSelected ? "text-cyan-100" : colorClass}`}
          >
            {label}
          </div>
          <div className="text-xs text-slate-500 mt-1">{description}</div>
        </div>
        <div className="flex items-center gap-2">
          {isSelected && <CheckCircle className="w-5 h-5 text-cyan-400" />}
        </div>
      </div>
    </button>
  );
}
