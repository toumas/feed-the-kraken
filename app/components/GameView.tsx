import { Skull } from "lucide-react";
import type { LobbyState } from "../types";
import { Avatar } from "./Avatar";

interface GameViewProps {
  lobby: LobbyState;
  onLeave: () => void;
}

export function GameView({ lobby, onLeave }: GameViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-700">
      <Skull className="w-32 h-32 text-cyan-800 animate-pulse" />
      <h2 className="text-3xl font-bold text-center bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent">
        Voyage Underway
      </h2>
      <p className="text-slate-400 text-center max-w-xs">
        The ship has departed with {lobby.players.length} brave souls. Keep your
        eyes on the horizon (and the main board game)!
      </p>
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 w-full max-w-sm">
        <h3 className="text-sm text-slate-500 uppercase mb-4 font-bold">
          Crew Status
        </h3>
        <div className="flex -space-x-2 overflow-hidden justify-center py-4">
          {lobby.players.map((p) => (
            <div
              key={p.id}
              className="relative hover:z-10 hover:-translate-y-1 transition-transform"
            >
              <Avatar
                url={p.photoUrl}
                size="md"
                className="ring-4 ring-slate-950"
              />
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onLeave}
        type="button"
        className="mt-12 px-6 py-3 bg-red-950/50 hover:bg-red-900/50 text-red-300 rounded-lg text-sm border border-red-900/50 transition-colors"
      >
        End Session
      </button>
    </div>
  );
}
