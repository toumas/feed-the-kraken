import { createContext, type ReactNode, useContext, useState } from "react";
import type { Player } from "../types";
import { cn } from "../utils";
import { Avatar } from "./Avatar";
import { InlineError } from "./InlineError";
import { useT } from "../i18n/client";

type PlayerSelectionContextType = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  players: Player[];
  myPlayerId: string;
  error: string | null;
  setError: (message: string | null) => void;
};

const PlayerSelectionContext = createContext<PlayerSelectionContextType | null>(
  null,
);

function usePlayerSelection() {
  const context = useContext(PlayerSelectionContext);
  if (!context) {
    throw new Error(
      "usePlayerSelection must be used within PlayerSelectionList.Root",
    );
  }
  return context;
}

interface RootProps {
  children: ReactNode;
  players: Player[];
  myPlayerId: string;
  onSelect?: (id: string | null) => void;
  initialSelectedId?: string | null;
}

function Root({
  children,
  players,
  myPlayerId,
  onSelect,
  initialSelectedId,
}: RootProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId || null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    setError(null); // Clear error when selection changes
    onSelect?.(id);
  };

  return (
    <PlayerSelectionContext.Provider
      value={{
        selectedId,
        setSelectedId: handleSelect,
        players,
        myPlayerId,
        error,
        setError,
      }}
    >
      <div className="flex flex-col h-full">{children}</div>
    </PlayerSelectionContext.Provider>
  );
}

interface ContentProps {
  disabledLabel?: string;
  isPlayerDisabled?: (player: Player) => boolean;
}

function Content({ disabledLabel, isPlayerDisabled }: ContentProps) {
  const { players, myPlayerId, selectedId, setSelectedId } =
    usePlayerSelection();
  const { t } = useT("common");
  const availablePlayers = players.filter((p) => p.id !== myPlayerId);

  return (
    <div className="flex-1 overflow-y-auto space-y-2 pb-4">
      {availablePlayers.map((player) => {
        const isSelected = selectedId === player.id;
        const isDisabledAction = isPlayerDisabled?.(player) ?? false;
        const isEliminated = player.isEliminated;
        const isDisabled = isDisabledAction || isEliminated;
        return (
          <label
            key={player.id}
            className={cn(
              "w-full flex items-center p-3 rounded-xl border transition-all duration-200 cursor-pointer",
              isSelected
                ? "bg-cyan-900/30 border-cyan-500/50 ring-1 ring-cyan-500/50"
                : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600",
              isDisabled && "opacity-50 cursor-not-allowed grayscale",
            )}
          >
            <input
              type="radio"
              name="player"
              value={player.id}
              checked={isSelected}
              onChange={() => {
                if (!isDisabled) {
                  setSelectedId(player.id);
                }
              }}
              disabled={isDisabled}
              className="sr-only"
            />
            <Avatar url={player.photoUrl} size="md" className="mr-4" />

            <div className="flex-1 text-left">
              <p
                className={cn(
                  "font-bold",
                  isSelected ? "text-cyan-100" : "text-slate-200",
                )}
              >
                {player.name}
              </p>
              {isDisabledAction && (
                <p className="text-xs text-slate-500">
                  {disabledLabel || t("game.unavailable")}
                </p>
              )}
              {isEliminated && (
                <p className="text-xs text-red-500">{t("game.eliminated")}</p>
              )}
            </div>

            {isSelected && (
              <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            )}
          </label>
        );
      })}
    </div>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="pt-4 border-t border-slate-800 space-y-2">{children}</div>
  );
}

interface SubmitProps {
  children: ReactNode;
  onSubmit: (id: string) => void;
}

function Submit({ children, onSubmit }: SubmitProps) {
  const { selectedId, error, setError } = usePlayerSelection();
  const { t } = useT("common");

  const handleClick = () => {
    if (!selectedId) {
      setError(t("game.selectPlayer"));
      return;
    }
    onSubmit(selectedId);
  };

  return (
    <div className="space-y-2">
      {error && (
        <InlineError message={error} onDismiss={() => setError(null)} />
      )}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg",
          "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20 hover:shadow-cyan-900/40 hover:-translate-y-0.5",
          !selectedId &&
            "opacity-50 cursor-not-allowed transform-none shadow-none",
        )}
      >
        {children}
      </button>
    </div>
  );
}

interface CancelProps {
  children: ReactNode;
  onCancel: () => void;
}

function Cancel({ children, onCancel }: CancelProps) {
  return (
    <button
      type="button"
      onClick={onCancel}
      className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700"
    >
      {children}
    </button>
  );
}

export const PlayerSelectionList = {
  Root,
  Content,
  Actions,
  Submit,
  Cancel,
};
