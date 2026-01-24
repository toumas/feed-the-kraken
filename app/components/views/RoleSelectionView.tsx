"use client";

import { CheckCircle, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { useGame } from "../../context/GameContext";
import { useT } from "../../i18n/client";
import type { Role } from "../../types";
import { getPossibleRolesForPlayerCount } from "../../utils/role-utils";
import { Avatar } from "../Avatar";
import { ConfirmationModal } from "../ConfirmationModal";
import { InlineError } from "../InlineError";

export function RoleSelectionView() {
  const {
    lobby,
    myPlayerId,
    selectRole,
    confirmRole,
    cancelRoleSelection,
    error: serverError,
    setError,
  } = useGame();
  const { t } = useT("common");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = serverError || localError;

  const roleSelectionStatus = lobby?.roleSelectionStatus;

  if (!lobby || !roleSelectionStatus) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">{t("game.loading")}</p>
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
          <h1 className="text-xl font-bold text-white">
            {t("roleSelection.title")}
          </h1>
        </div>

        <p className="text-slate-300">{t("roleSelection.instruction")}</p>

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
                      {t("roleSelection.ready")}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm font-bold flex items-center gap-1">
                      {t("roleSelection.pending")}
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
              {t("roleSelection.title")}
            </h2>
            {error && (
              <div className="mb-4">
                <InlineError message={error} onDismiss={() => setError(null)} />
              </div>
            )}
            <div className="space-y-3">
              {getPossibleRolesForPlayerCount(lobby.players.length).map(
                (role) => {
                  const isSelected = mySelection?.role === role;

                  return (
                    <RoleButton
                      key={role}
                      role={role}
                      isSelected={isSelected}
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
                {t("game.waitingForOthers")} ({confirmedCount}/{totalPlayers})
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
          {t("actions.cancel")}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingRole && (
        <ConfirmationModal.Root isOpen={true}>
          <ConfirmationModal.Header
            title={t("roleSelection.confirmTitle")}
            className="justify-center"
          />
          <ConfirmationModal.Body>
            <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 mb-4">
              <p
                className={`text-2xl font-bold text-center ${getRoleColorClass(pendingRole)}`}
              >
                {t(`roles.${pendingRole}`)}
              </p>
              <p className="text-sm text-slate-400 text-center mt-2">
                {t(`roles.${pendingRole}_DESC`)}
              </p>
            </div>

            <div className="bg-amber-950/50 border border-amber-500/50 rounded-lg p-3">
              <p className="text-sm text-amber-200 text-center">
                ⚠️ {t("roleSelection.warning")}
              </p>
            </div>
          </ConfirmationModal.Body>
          <ConfirmationModal.Actions>
            <ConfirmationModal.Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
            >
              {t("actions.cancel")}
            </ConfirmationModal.Button>
            <ConfirmationModal.Button onClick={handleConfirmRole}>
              {t("actions.confirm")}
            </ConfirmationModal.Button>
          </ConfirmationModal.Actions>
        </ConfirmationModal.Root>
      )}
    </div>
  );
}

function getRoleColorClass(role: Role): string {
  switch (role) {
    case "SAILOR":
      return "text-cyan-400";
    case "PIRATE":
      return "text-red-400";
    case "CULT_LEADER":
      return "text-amber-500";
    case "CULTIST":
      return "text-green-400";
    default:
      return "text-slate-400";
  }
}

function RoleButton({
  role,
  isSelected,
  onSelect,
}: {
  role: Role;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useT("common");
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
            className={`font-bold ${isSelected ? "text-cyan-100" : getRoleColorClass(role)}`}
          >
            {t(`roles.${role}`)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {t(`roles.${role}_DESC`)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSelected && <CheckCircle className="w-5 h-5 text-cyan-400" />}
        </div>
      </div>
    </button>
  );
}
