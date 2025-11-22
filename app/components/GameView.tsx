import { Anchor, Eye, Ghost, LogOut, Skull, User } from "lucide-react";
import type { LobbyState, Role } from "../types";
import { cn } from "../utils";
import { Avatar } from "./Avatar";

interface GameViewProps {
  lobby: LobbyState;
  myRole: Role | null;
  myPlayerId: string;
  onLeave: () => void;
  onDenialOfCommand: () => void;
}

export function GameView({
  lobby,
  myRole,
  myPlayerId,
  onLeave,
  onDenialOfCommand,
}: GameViewProps) {
  const getRoleDetails = (role: Role | null) => {
    switch (role) {
      case "SAILOR":
        return {
          title: "Loyal Sailor",
          color: "text-blue-400",
          icon: <Anchor className="w-32 h-32 text-blue-500 animate-pulse" />,
          desc: "Steer the ship to safety! Trust no one but your fellow sailors.",
        };
      case "PIRATE":
        return {
          title: "Pirate",
          color: "text-red-500",
          icon: <Skull className="w-32 h-32 text-red-600 animate-pulse" />,
          desc: "Sabotage the voyage! Feed the Kraken or mutiny!",
        };
      case "CULT_LEADER":
        return {
          title: "Cult Leader",
          color: "text-yellow-500",
          icon: <Eye className="w-32 h-32 text-yellow-500 animate-pulse" />,
          desc: "Convert others to your cause. The Kraken awaits!",
        };
      case "CULTIST":
        return {
          title: "Cultist",
          color: "text-green-500",
          icon: <Ghost className="w-32 h-32 text-green-500 animate-pulse" />,
          desc: "Serve the Cult Leader. The deep calls!",
        };
      default:
        return {
          title: "Stowaway",
          color: "text-slate-400",
          icon: <User className="w-32 h-32 text-slate-500 animate-pulse" />,
          desc: "Wait... how did you get here?",
        };
    }
  };

  const roleInfo = getRoleDetails(myRole);
  const me = lobby.players.find((p) => p.id === myPlayerId);
  const isEliminated = me?.isEliminated;

  if (isEliminated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-700">
        <Skull className="w-32 h-32 text-slate-600" />
        <h2 className="text-4xl font-bold text-center text-slate-500 drop-shadow-lg">
          Eliminated
        </h2>
        <p className="text-slate-400 text-center max-w-xs text-lg font-medium">
          You have chosen Denial of Command. You are eliminated from the game.
        </p>
        <button
          onClick={onLeave}
          type="button"
          className="mt-12 group relative px-6 py-3 bg-slate-900/80 hover:bg-slate-900 text-slate-300 rounded-lg text-sm font-medium border border-slate-700 transition-all duration-300 flex items-center gap-2 hover:shadow-lg hover:shadow-slate-900/50"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Leave Game
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-700">
      {roleInfo.icon}
      <h2
        className={`text-4xl font-bold text-center ${roleInfo.color} drop-shadow-lg`}
      >
        {roleInfo.title}
      </h2>
      <p className="text-slate-300 text-center max-w-xs text-lg font-medium">
        {roleInfo.desc}
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
              <div className="relative">
                <Avatar
                  url={p.photoUrl}
                  size="md"
                  className={cn(
                    "ring-4 ring-slate-950",
                    !p.isOnline && "opacity-50 grayscale",
                    p.isEliminated && "opacity-50 grayscale ring-red-900",
                  )}
                />
                {p.isEliminated && (
                  <div
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-900 rounded-full border-2 border-slate-900 z-20 flex items-center justify-center"
                    title="Eliminated"
                  >
                    <Skull className="w-3 h-3 text-red-200" />
                  </div>
                )}
                {!p.isOnline && !p.isEliminated && (
                  <div
                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-500 rounded-full border-2 border-slate-900 z-20"
                    title="Offline"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm("Are you sure you want to end the session?")) {
            onLeave();
          }
        }}
        type="button"
        className="mt-12 px-6 py-3 bg-red-950/50 hover:bg-red-900/50 text-red-300 rounded-lg text-sm border border-red-900/50 transition-colors"
      >
        End Session
      </button>

      <button
        onClick={() => {
          if (
            confirm(
              "Are you sure? You will be eliminated from the game and cannot take further actions.",
            )
          ) {
            onDenialOfCommand();
          }
        }}
        type="button"
        className="mt-4 group relative px-6 py-3 bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-red-400 rounded-lg text-sm font-medium border border-slate-800 hover:border-red-900/50 transition-all duration-300 overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-2">
          <Skull className="w-4 h-4 transition-transform group-hover:scale-110" />
          Denial of Command
        </span>
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-red-950/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </button>
    </div>
  );
}
