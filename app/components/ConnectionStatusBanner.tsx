"use client";

import { Loader2, WifiOff } from "lucide-react";
import { useGame } from "../context/GameContext";
import { useT } from "../i18n/client";

export function ConnectionStatusBanner() {
  const { connectionStatus, lobby } = useGame();
  const { t } = useT("common");

  // Only show when in a lobby and not connected
  if (!lobby || connectionStatus === "connected") {
    return null;
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 animate-in slide-in-from-top duration-300">
      <div
        className={`p-3 text-center text-sm font-medium flex items-center justify-center gap-2 ${
          connectionStatus === "error"
            ? "bg-red-600 text-white"
            : "bg-amber-500 text-black"
        }`}
      >
        {connectionStatus === "connecting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("connection.reconnecting")}
          </>
        ) : connectionStatus === "error" ? (
          <>
            <WifiOff className="w-4 h-4" />
            {t("connection.error")}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            {t("connection.disconnected")}
          </>
        )}
      </div>
    </div>
  );
}
