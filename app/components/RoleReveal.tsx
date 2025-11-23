"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";

interface RoleRevealProps {
  children: React.ReactNode;
}

export function RoleReveal({ children }: RoleRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const startReveal = () => setIsRevealed(true);
  const endReveal = () => setIsRevealed(false);

  return (
    <button
      type="button"
      className="relative flex flex-col items-center justify-center min-h-[320px] w-full max-w-sm mx-auto cursor-pointer select-none touch-none bg-transparent border-none p-0"
      onMouseDown={startReveal}
      onMouseUp={endReveal}
      onMouseLeave={endReveal}
      onTouchStart={startReveal}
      onTouchEnd={endReveal}
      onTouchCancel={endReveal}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          startReveal();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          endReveal();
        }
      }}
    >
      {/* Revealed Content */}
      <div
        className={`transition-all duration-200 ease-in-out flex flex-col items-center space-y-6 w-full ${isRevealed
            ? "opacity-100 scale-100 blur-none"
            : "opacity-0 scale-95 blur-md pointer-events-none absolute"
          }`}
      >
        {children}
      </div>

      {/* Hidden State Placeholder */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-200 ease-in-out ${isRevealed
            ? "opacity-0 scale-110 pointer-events-none"
            : "opacity-100 scale-100"
          }`}
      >
        <div className="w-32 h-32 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border-4 border-slate-700/50">
          <EyeOff className="w-16 h-16 text-slate-500" />
        </div>
        <h2 className="text-3xl font-bold text-center text-slate-200 drop-shadow-lg mb-2">
          Role Hidden
        </h2>
        <p className="text-slate-400 text-center text-lg font-medium">
          Press and hold to reveal your role.
          <br />
          <span className="text-sm text-slate-500">
            Make sure nobody is watching!
          </span>
        </p>
      </div>
    </button>
  );
}
