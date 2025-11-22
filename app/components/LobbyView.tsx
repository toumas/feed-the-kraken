import { Anchor, CheckCircle2, Copy, Play, UserPlus } from "lucide-react";
import { useState } from "react";
import {
  type ConnectionStatus,
  type LobbyState,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../types";
import { cn } from "../utils";
import { Avatar } from "./Avatar";
import { EditableProfile } from "./EditableProfile";
import { ProfileEditor } from "./ProfileEditor";

interface LobbyViewProps {
  lobby: LobbyState;
  myPlayerId: string;
  onUpdateProfile: (name: string, photo: string | null) => void;
  onLeave: () => void;
  onStart: () => void;
  onAddBot: () => void;
  connectionStatus: ConnectionStatus;
}

export function LobbyView({
  lobby,
  myPlayerId,
  onUpdateProfile,
  onLeave,
  onStart,
  onAddBot,
  connectionStatus,
}: LobbyViewProps) {
  const myPlayer = lobby.players.find((p) => p.id === myPlayerId);
  const isHost = myPlayer?.isHost;
  const playerCount = lobby.players.length;
  const canStart = playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;

  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in">
      {/* Lobby Header info */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
            Ship Code
          </p>
          <p className="text-3xl font-mono tracking-wider text-cyan-400 font-bold">
            {lobby.code}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : connectionStatus === "error"
                      ? "bg-red-500"
                      : "bg-slate-500",
              )}
            />
            <span className="text-xs text-slate-400 capitalize">
              {connectionStatus}
            </span>
          </div>
          <button
            onClick={copyCode}
            type="button"
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            title="Copy Code"
          >
            {copied ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <Copy className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* My Profile Editor */}
      <div className="bg-slate-900/80 border border-cyan-900/30 rounded-xl p-4 shadow-lg">
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
          My Identity
        </h3>
        <EditableProfile
          defaultEditing={
            !myPlayer?.name ||
            myPlayer.name.includes("Player") ||
            myPlayer.name === "New Sailor"
          }
        >
          <EditableProfile.Editor>
            {(save) => (
              <ProfileEditor.Root
                initialName={myPlayer?.name || ""}
                initialPhoto={myPlayer?.photoUrl || null}
                onSave={(name, photo) => {
                  onUpdateProfile(name, photo);
                  save();
                }}
              >
                <ProfileEditor.Photo />
                <ProfileEditor.Name />
                <ProfileEditor.Submit />
              </ProfileEditor.Root>
            )}
          </EditableProfile.Editor>
          <EditableProfile.Display>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar url={myPlayer?.photoUrl} size="lg" />
                <div>
                  <p className="font-bold text-xl text-white">
                    {myPlayer?.name}
                  </p>
                  <p className="text-sm text-cyan-500">
                    {isHost ? "Captain (Host)" : "Sailor"}
                  </p>
                </div>
              </div>
              <EditableProfile.EditTrigger className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg font-medium text-slate-300">
                Edit
              </EditableProfile.EditTrigger>
            </div>
          </EditableProfile.Display>
        </EditableProfile>
      </div>

      {/* Player Grid */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Crew Manifest ({playerCount}/{MAX_PLAYERS})
          </h3>
          {/* DEV ONLY BUTTON - For demo purposes to test constraints */}
          <button
            onClick={onAddBot}
            type="button"
            className="text-xs px-2 py-1 bg-slate-800 text-slate-500 rounded flex items-center gap-1 hover:text-slate-300 hover:bg-slate-700"
          >
            <UserPlus className="w-3 h-3" /> Debug Bot
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[40vh] p-1">
          {lobby.players.map((player) => (
            <div
              key={player.id}
              className={cn(
                "flex items-center p-2 rounded-lg border transition-all duration-300",
                player.id === myPlayerId
                  ? "border-cyan-700/50 bg-cyan-950/30"
                  : "border-slate-800 bg-slate-900/50",
                !player.isOnline && "opacity-50 grayscale",
              )}
            >
              <div className="relative">
                <Avatar url={player.photoUrl} size="sm" className="mr-3" />
                {!player.isOnline && (
                  <div
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-slate-500 rounded-full border-2 border-slate-900"
                    title="Offline"
                  />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-medium truncate text-slate-200 text-sm">
                  {player.name}
                  {player.id === myPlayerId && (
                    <span className="text-cyan-500 ml-1">(You)</span>
                  )}
                </p>
                {player.isHost && (
                  <p className="text-xs text-yellow-500/80 flex items-center gap-1">
                    Captain
                  </p>
                )}
                {!player.isOnline && (
                  <p className="text-xs text-slate-500">Offline</p>
                )}
              </div>
            </div>
          ))}

          {/* Empty slots indicators */}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - playerCount) }).map(
            (_, i) => (
              <div
                key={`waiting-slot-${MIN_PLAYERS - playerCount}-${i}`}
                className="flex items-center justify-center p-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/20 text-slate-600 text-sm italic"
              >
                Waiting...
              </div>
            ),
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="pt-4 border-t border-slate-800 mt-auto space-y-3">
        {playerCount >= MAX_PLAYERS && (
          <p className="text-center text-yellow-500 text-sm bg-yellow-950/30 py-2 rounded-lg border border-yellow-900/50">
            Lobby Reached Max Capacity
          </p>
        )}

        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            type="button"
            className="w-full py-4 bg-linear-to-r from-cyan-600 to-blue-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold text-xl shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-3 transition-all"
          >
            <Play className={cn("w-6 h-6", canStart && "animate-pulse")} />
            Start Voyage
          </button>
        ) : (
          <div className="w-full py-4 bg-slate-800 text-slate-400 rounded-xl font-bold text-center flex items-center justify-center gap-2 animate-pulse">
            <Anchor className="w-5 h-5" />
            Awaiting Captain...
          </div>
        )}

        <button
          onClick={onLeave}
          type="button"
          className="w-full py-3 text-slate-500 hover:text-red-400 text-sm font-medium transition-colors"
        >
          Abandon Ship
        </button>
      </div>
    </div>
  );
}
