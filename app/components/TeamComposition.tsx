import {
  Anchor,
  ChevronDown,
  ChevronUp,
  Eye,
  Skull,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useT } from "../i18n/client";
import type { Role } from "../types";
import { cn } from "../utils";
import { getRoleColor, getRolesForPlayerCount } from "../utils/role-utils";

interface TeamCompositionProps {
  playerCount: number;
}

export function TeamComposition({ playerCount }: TeamCompositionProps) {
  const { t } = useT("common");
  const [isOpen, setIsOpen] = useState(false);

  // Helper to get counts
  const getCounts = () => {
    if (playerCount === 5) {
      return {
        SAILOR: `3 ${t("game.teamComposition.or")} 2`,
        PIRATE: `1 ${t("game.teamComposition.or")} 2`,
        CULT_LEADER: "1",
        CULTIST: "-",
      };
    }

    const roles = getRolesForPlayerCount(playerCount);
    const counts = roles.reduce(
      (acc, role) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {} as Record<Role, number>,
    );

    return {
      SAILOR: counts.SAILOR?.toString() || "-",
      PIRATE: counts.PIRATE?.toString() || "-",
      CULT_LEADER: counts.CULT_LEADER?.toString() || "-",
      CULTIST: counts.CULTIST?.toString() || "-",
    };
  };

  const counts = getCounts();

  return (
    <div
      data-testid="team-composition"
      className="w-full max-w-sm mx-auto mb-6 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-300 font-bold text-sm uppercase">
          <Users className="w-4 h-4" />
          {t("game.teamComposition.title")} ({playerCount})
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 bg-slate-900/50">
          <div className="grid grid-cols-[auto_1fr_auto] gap-y-3 gap-x-4 items-center">
            {/* Sailor */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900/30">
              <Anchor className={cn("w-5 h-5", getRoleColor("SAILOR"))} />
            </div>
            <span className={cn("font-bold text-sm", getRoleColor("SAILOR"))}>
              {t("roles.SAILOR")}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {counts.SAILOR}
            </span>

            {/* Pirate */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-900/30">
              <Skull className={cn("w-5 h-5", getRoleColor("PIRATE"))} />
            </div>
            <span className={cn("font-bold text-sm", getRoleColor("PIRATE"))}>
              {t("roles.PIRATE")}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {counts.PIRATE}
            </span>

            {/* Cult Leader */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-900/30">
              <Eye className={cn("w-5 h-5", getRoleColor("CULT_LEADER"))} />
            </div>
            <span
              className={cn("font-bold text-sm", getRoleColor("CULT_LEADER"))}
            >
              {t("roles.CULT_LEADER")}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {counts.CULT_LEADER}
            </span>

            {/* Cultist (only if > 0 or 5 player case which is -) */}
            {(counts.CULTIST !== "-" && counts.CULTIST !== "0") ||
            playerCount >= 11 ? (
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-900/30">
                  <Eye className={cn("w-5 h-5", getRoleColor("CULTIST"))} />
                </div>
                <span
                  className={cn("font-bold text-sm", getRoleColor("CULTIST"))}
                >
                  {t("roles.CULTIST")}
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {counts.CULTIST}
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
