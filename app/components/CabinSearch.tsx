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
  onCancel,
}: CabinSearchProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedPlayerId) {
      onConfirm(selectedPlayerId);
    }
  };

  const availablePlayers = players.filter((p) => p.id !== myPlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
            data-testid="close-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Close</title>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-white">
            Select Cabin to Search
          </h2>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
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

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
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
    </div>
  );
}
