import {
  Anchor,
  CheckCircle2,
  Copy,
  Play,
  QrCode,
  Settings,
  UserPlus,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useT } from "../i18n/client";
import {
  type ConnectionStatus,
  type LobbyState,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../types";
import { cn } from "../utils";
import { Avatar } from "./Avatar";
import { EditableProfile } from "./EditableProfile";
import { InlineError } from "./InlineError";
import { ProfileEditor } from "./ProfileEditor";

interface LobbyViewProps {
  lobby: LobbyState;
  myPlayerId: string;
  onUpdateProfile: (name: string, photo: string | null) => void;
  onLeave: () => void;
  onStart: () => void;
  onAddBot: () => void;
  onKickPlayer: (targetPlayerId: string) => void;
  onSetRoleDistributionMode: (mode: "automatic" | "manual") => void;
  connectionStatus: ConnectionStatus;
}

export function LobbyView({
  lobby,
  myPlayerId,
  onUpdateProfile,
  onLeave,
  onStart,
  onAddBot,
  onKickPlayer,
  onSetRoleDistributionMode,
  connectionStatus,
}: LobbyViewProps) {
  const { t } = useT("common");
  const myPlayer = lobby.players.find((p) => p.id === myPlayerId);
  const isHost = myPlayer?.isHost;
  const playerCount = lobby.players.length;
  const canStart = playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;

  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/identify?next=join&code=${lobby.code}`
      : "";

  const handleStart = () => {
    if (!canStart) {
      setError(t("lobby.minPlayers", { min: MIN_PLAYERS }));
      return;
    }
    onStart();
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in">
      {/* Lobby Header info */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
            {t("lobby.shipCode")}
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
              {t("lobby.connectionStatus")}: {connectionStatus}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowQR(true)}
              type="button"
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title={t("lobby.showQRCode")}
            >
              <QrCode className="w-6 h-6" />
            </button>
            <button
              onClick={copyCode}
              type="button"
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title={t("lobby.copyCode")}
            >
              {copied ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <Copy className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col items-center gap-6">
            <button
              onClick={() => setShowQR(false)}
              type="button"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">
                {t("lobby.scanToJoin")}
              </h3>
              <p className="text-cyan-400 font-mono text-2xl font-bold tracking-widest">
                {lobby.code}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG
                value={qrUrl}
                size={240}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-sm text-slate-400 text-center max-w-[200px]">
              {t("home.subtext")}
            </p>
          </div>
        </div>
      )}

      {/* My Profile Editor */}
      <div className="bg-slate-900/80 border border-cyan-900/30 rounded-xl p-4 shadow-lg">
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
          {t("lobby.myIdentity")}
        </h3>
        <EditableProfile
          defaultEditing={
            !myPlayer?.name ||
            myPlayer.name.includes("Player") ||
            myPlayer.name === t("lobby.newSailor")
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
                    {isHost ? t("lobby.host") : t("lobby.sailor")}
                  </p>
                </div>
              </div>
              <EditableProfile.EditTrigger className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg font-medium text-slate-300">
                {t("lobby.edit")}
              </EditableProfile.EditTrigger>
            </div>
          </EditableProfile.Display>
        </EditableProfile>
      </div>

      {/* Role Distribution Mode (Host Only) */}
      {isHost && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                {t("lobby.roleAssignment")}
              </span>
            </div>
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => onSetRoleDistributionMode("automatic")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  (lobby.roleDistributionMode || "automatic") === "automatic"
                    ? "bg-cyan-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                {t("lobby.automatic")}
              </button>
              <button
                type="button"
                onClick={() => onSetRoleDistributionMode("manual")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  lobby.roleDistributionMode === "manual"
                    ? "bg-cyan-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                {t("lobby.manual")}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {(lobby.roleDistributionMode || "automatic") === "automatic"
              ? t("lobby.autoDesc")
              : t("lobby.manualDesc")}
          </p>
        </div>
      )}

      {/* Player Grid */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            {t("lobby.crewManifest")} ({playerCount}/{MAX_PLAYERS})
          </h3>
          {/* DEV ONLY BUTTON - For demo purposes to test constraints */}
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={onAddBot}
              type="button"
              className="text-xs px-2 py-1 bg-slate-800 text-slate-500 rounded flex items-center gap-1 hover:text-slate-300 hover:bg-slate-700"
            >
              <UserPlus className="w-3 h-3" /> {t("lobby.debugBot")}
            </button>
          )}
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
                    title={t("lobby.offline")}
                  />
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="font-medium truncate text-slate-200 text-sm">
                  {player.name}
                  {player.id === myPlayerId && (
                    <span className="text-cyan-500 ml-1">{t("lobby.you")}</span>
                  )}
                </p>
                {player.isHost && (
                  <p className="text-xs text-yellow-500/80 flex items-center gap-1">
                    {t("lobby.host")}
                  </p>
                )}
                {!player.isOnline && (
                  <p className="text-xs text-slate-500">{t("lobby.offline")}</p>
                )}
              </div>
              {isHost && !player.isHost && player.id !== myPlayerId && (
                <button
                  onClick={() => onKickPlayer(player.id)}
                  type="button"
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors ml-auto"
                  title={t("lobby.kickPlayer")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {/* Empty slots indicators */}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - playerCount) }).map(
            (_, i) => (
              <div
                key={`waiting-slot-${MIN_PLAYERS - playerCount}-${i}`}
                className="flex items-center justify-center p-3 rounded-lg border border-dashed border-slate-800 bg-slate-900/20 text-slate-600 text-sm italic"
              >
                {t("lobby.waiting")}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="pt-4 border-t border-slate-800 mt-auto space-y-3">
        {playerCount >= MAX_PLAYERS && (
          <p className="text-center text-yellow-500 text-sm bg-yellow-950/30 py-2 rounded-lg border border-yellow-900/50">
            {t("lobby.maxCapacity")}
          </p>
        )}

        {error && (
          <InlineError message={error} onDismiss={() => setError(null)} />
        )}

        {isHost ? (
          <button
            onClick={handleStart}
            type="button"
            className={cn(
              "w-full py-4 bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-xl shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-3 transition-all",
              !canStart && "from-slate-800 to-slate-800 text-slate-500",
            )}
          >
            <Play className={cn("w-6 h-6", canStart && "animate-pulse")} />
            {t("lobby.startVoyage")}
          </button>
        ) : (
          <div className="w-full py-4 bg-slate-800 text-slate-400 rounded-xl font-bold text-center flex items-center justify-center gap-2 animate-pulse">
            <Anchor className="w-5 h-5" />
            {t("lobby.awaitingHost")}
          </div>
        )}

        <button
          onClick={onLeave}
          type="button"
          className="w-full py-3 text-slate-500 hover:text-red-400 text-sm font-medium transition-colors"
        >
          {t("lobby.abandonShip")}
        </button>
      </div>
    </div>
  );
}
