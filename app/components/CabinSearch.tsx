import { useState } from "react";
import type { Player } from "../types";
import { cn } from "../utils";
import { Avatar } from "./Avatar";

interface CabinSearchProps {
  players: Player[];
  myPlayerId: string;
  onConfirm: (targetPlayerId: string) => void;
  onCancel: () => void;
}

export function CabinSearch({
  players,
  myPlayerId,
  onConfirm,
}: CabinSearchProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedPlayerId) {
      onConfirm(selectedPlayerId);
    }
  };

  const availablePlayers = players.filter((p) => p.id !== myPlayerId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {availablePlayers.map((player) => {
          const isSelected = selectedPlayerId === player.id;
          const isSearched = player.isUnconvertible; // Assuming unconvertible means searched for now, or add specific flag

          return (
            <button
              type="button"
              key={player.id}
              onClick={() => !isSearched && setSelectedPlayerId(player.id)}
              disabled={isSearched}
              className={cn(
                "w-full flex items-center p-3 rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-cyan-900/30 border-cyan-500/50 ring-1 ring-cyan-500/50"
                  : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600",
                isSearched && "opacity-50 cursor-not-allowed grayscale",
              )}
            >
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
                {isSearched && (
                  <p className="text-xs text-slate-500">Already searched</p>
                )}
              </div>

              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedPlayerId}
          className={cn(
            "w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg",
            selectedPlayerId
              ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20 hover:shadow-cyan-900/40 hover:-translate-y-0.5"
              : "bg-slate-800 text-slate-500 cursor-not-allowed",
          )}
        >
          Confirm Search
        </button>
      </div>
    </div>
  );
}
