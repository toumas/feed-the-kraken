import { Search, Check } from "lucide-react";
import { useState } from "react";
import type { Player } from "../types";
import { Avatar } from "./Avatar";
import { cn } from "../utils";

interface CabinSearchProps {
    players: Player[];
    onConfirm: (targetPlayerId: string) => void;
    onCancel: () => void;
}

export function CabinSearch({ players, onConfirm, onCancel }: CabinSearchProps) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    const handleConfirm = () => {
        if (selectedPlayerId) {
            onConfirm(selectedPlayerId);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center gap-4">
                    <button
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
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-bold text-white">Cabin Search</h2>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-slate-400 mb-6 text-center">
                        Select a crewmate to search their cabin.
                    </p>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {players.map((player) => {
                            const isSelected = selectedPlayerId === player.id;
                            const isUnconvertible = player.isUnconvertible;

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => !isUnconvertible && setSelectedPlayerId(player.id)}
                                    disabled={isUnconvertible}
                                    className={cn(
                                        "w-full flex items-center p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                                        isSelected
                                            ? "bg-slate-800/50 border-cyan-500/50 ring-1 ring-cyan-500/50"
                                            : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50",
                                        isUnconvertible && "opacity-50 cursor-not-allowed grayscale"
                                    )}
                                >
                                    <Avatar url={player.photoUrl} size="md" className="mr-4" />

                                    <div className="flex-1 text-left">
                                        <div className="font-bold text-slate-200 group-hover:text-white transition-colors">
                                            {player.name}
                                        </div>
                                        {isUnconvertible && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                Already searched
                                            </div>
                                        )}
                                    </div>

                                    {isSelected && (
                                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-500">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedPlayerId}
                        className={cn(
                            "w-full py-4 rounded-xl font-bold text-lg transition-all duration-300",
                            selectedPlayerId
                                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-900/20"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        Confirm Search
                    </button>
                </div>
            </div>
        </div>
    );
}
