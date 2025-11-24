import { useState } from "react";
import type { Player } from "../types";
import { cn } from "../utils";
import { Avatar } from "./Avatar";

interface PlayerSelectionListProps {
  players: Player[];
  myPlayerId: string;
  onConfirm: (targetPlayerId: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
  disabledLabel?: string;
}

export function PlayerSelectionList({
  players,
  myPlayerId,
  onConfirm,
  onCancel,
  submitLabel = "Confirm",
  disabledLabel = "Unavailable",
}: PlayerSelectionListProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlayerId) {
      onConfirm(selectedPlayerId);
    }
  };

  const availablePlayers = players.filter((p) => p.id !== myPlayerId);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {availablePlayers.map((player) => {
          const isSelected = selectedPlayerId === player.id;
          const isDisabledAction = player.isUnconvertible;
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
                value={player.name}
                checked={isSelected}
                onChange={() => {
                  if (!isDisabled) {
                    setSelectedPlayerId(player.id);
                  }
                }}
                disabled={isDisabled}
                required
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
                  <p className="text-xs text-slate-500">{disabledLabel}</p>
                )}
                {isEliminated && (
                  <p className="text-xs text-red-500">Eliminated</p>
                )}
              </div>

              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              )}
            </label>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-2">
        <button
          type="submit"
          className={cn(
            "w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg",
            "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20 hover:shadow-cyan-900/40 hover:-translate-y-0.5",
          )}
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
