"use client";

import { EyeOff, Pause } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useT } from "../i18n/client";
import { cn } from "../utils";

const AUTO_HIDE_DURATION_MS = 5000;

// --- Context ---
interface RoleRevealContextValue {
  isRevealed: boolean;
  isPaused: boolean;
  tapCount: number;
  revealTimestamp: number | null;
  remainingTimeMs: number;
  startReveal: () => void;
  endReveal: () => void;
  handleTap: () => void;
  handlePauseStart: () => void;
  handlePauseEnd: () => void;
}

const RoleRevealContext = createContext<RoleRevealContextValue | null>(null);

function useRoleReveal() {
  const context = useContext(RoleRevealContext);
  if (!context) {
    throw new Error(
      "RoleReveal components must be used within a RoleReveal.Root",
    );
  }
  return context;
}

// --- Components ---

interface RootProps {
  children: React.ReactNode;
  className?: string;
  defaultRevealed?: boolean;
}

function Root({ children, className, defaultRevealed = false }: RootProps) {
  const [isRevealed, setIsRevealed] = useState(defaultRevealed);
  const [isPaused, setIsPaused] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  const [revealTimestamp, setRevealTimestamp] = useState<number | null>(
    defaultRevealed ? Date.now() : null,
  );
  // remainingTimeMs is exposed for context but managed via ref for timer logic
  const [remainingTimeMs, setRemainingTimeMs] = useState(AUTO_HIDE_DURATION_MS);

  // Use ref to track remaining time for timer calculations (avoids effect re-triggers)
  const remainingTimeMsRef = useRef(AUTO_HIDE_DURATION_MS);
  const timerStartTimeRef = useRef<number | null>(
    defaultRevealed ? Date.now() : null,
  );

  const startReveal = () => {
    setRevealTimestamp(Date.now());
    remainingTimeMsRef.current = AUTO_HIDE_DURATION_MS;
    setRemainingTimeMs(AUTO_HIDE_DURATION_MS);
    timerStartTimeRef.current = Date.now();
    setIsRevealed(true);
  };
  const endReveal = () => {
    setRevealTimestamp(null);
    remainingTimeMsRef.current = AUTO_HIDE_DURATION_MS;
    setRemainingTimeMs(AUTO_HIDE_DURATION_MS);
    timerStartTimeRef.current = null;
    setIsRevealed(false);
    setIsPaused(false);
  };

  const handlePauseStart = () => {
    if (!isPaused && timerStartTimeRef.current) {
      // Calculate remaining time when pausing
      const elapsed = Date.now() - timerStartTimeRef.current;
      const remaining = Math.max(0, remainingTimeMsRef.current - elapsed);
      remainingTimeMsRef.current = remaining;
      setRemainingTimeMs(remaining);
    }
    setIsPaused(true);
  };

  const handlePauseEnd = () => {
    if (isPaused) {
      // Reset timer start to now so remaining time is used correctly
      timerStartTimeRef.current = Date.now();
    }
    setIsPaused(false);
  };

  // Auto-hide when revealed and not paused
  useEffect(() => {
    if (!isRevealed || isPaused) return;

    // Initialize timerStartTimeRef when effect runs (for defaultRevealed case)
    if (!timerStartTimeRef.current) {
      timerStartTimeRef.current = Date.now();
    }

    const timer = setTimeout(() => {
      setIsRevealed(false);
    }, remainingTimeMsRef.current);

    return () => clearTimeout(timer);
  }, [isRevealed, isPaused]);

  const handleTap = () => {
    if (isRevealed) {
      endReveal();
      setTaps([]);
      return;
    }

    const now = Date.now();
    const newTaps = [...taps, now].filter((t) => now - t < 2000);

    if (newTaps.length >= 5) {
      startReveal();
      setTaps([]);
    } else {
      setTaps(newTaps);
    }
  };

  const tapCount = taps.length;

  return (
    <RoleRevealContext.Provider
      value={{
        isRevealed,
        isPaused,
        tapCount,
        revealTimestamp,
        remainingTimeMs,
        startReveal,
        endReveal,
        handleTap,
        handlePauseStart,
        handlePauseEnd,
      }}
    >
      <div className={cn("relative w-full", className)}>{children}</div>
    </RoleRevealContext.Provider>
  );
}

interface CanvasProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function Canvas({ children, className, ...props }: CanvasProps) {
  const { handleTap } = useRoleReveal();

  return (
    <button
      type="button"
      className={cn(
        "relative flex flex-col items-center justify-center w-full cursor-pointer select-none touch-none bg-transparent border-none p-0 focus:outline-none",
        className,
      )}
      onClick={handleTap}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleTap();
        }
        props.onKeyDown?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

interface HiddenProps {
  children?: React.ReactNode;
  className?: string;
}

function Hidden({ children, className }: HiddenProps) {
  const { isRevealed, tapCount, handleTap } = useRoleReveal();
  const { t } = useT("common");

  if (isRevealed) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-200 ease-in-out",
        className,
      )}
    >
      {children || (
        <>
          <div className="w-32 h-32 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border-4 border-slate-700/50">
            <EyeOff className="w-16 h-16 text-slate-500" />
          </div>
          <h2 className="text-3xl font-bold text-center text-slate-200 drop-shadow-lg mb-4">
            {t("roleReveal.hidden")}
          </h2>
        </>
      )}
      <button
        type="button"
        onClick={handleTap}
        onContextMenu={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-3 px-6 py-4 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-800/50 rounded-xl font-bold transition-all cursor-pointer select-none touch-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      >
        <span className="text-lg">{t("roleReveal.instruction")}</span>
        {/* Tap progress indicator */}
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={`tap-${
                // biome-ignore lint/suspicious/noArrayIndexKey: false positive for static array
                i
              }`}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-150",
                i < tapCount
                  ? "bg-cyan-400 scale-110"
                  : "bg-slate-600 scale-100",
              )}
            />
          ))}
        </div>
      </button>
      <p className="text-sm text-slate-500 mt-3">{t("roleReveal.warning")}</p>
    </div>
  );
}

interface RevealedProps {
  children: React.ReactNode;
  className?: string;
}

function Revealed({ children, className }: RevealedProps) {
  const { isRevealed } = useRoleReveal();

  if (!isRevealed) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface IconProps {
  children: React.ReactNode;
  className?: string;
}

function Icon({ children, className }: IconProps) {
  return (
    <div data-testid="role-icon" className={cn("relative", className)}>
      {children}
    </div>
  );
}

interface TitleProps {
  children: React.ReactNode;
  className?: string;
}

function Title({ children, className }: TitleProps) {
  return (
    <h2
      className={cn("text-4xl font-bold text-center drop-shadow-lg", className)}
    >
      {children}
    </h2>
  );
}

interface DescriptionProps {
  children: React.ReactNode;
  className?: string;
}

function Description({ children, className }: DescriptionProps) {
  return (
    <p
      data-testid="role-description"
      className={cn(
        "text-slate-300 text-center max-w-xs text-lg font-medium",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface HideInstructionProps {
  className?: string;
}

function HideInstruction({ className }: HideInstructionProps) {
  const { t } = useT("common");
  const { isPaused, revealTimestamp, handlePauseStart, handlePauseEnd } =
    useRoleReveal();

  return (
    <button
      type="button"
      onMouseDown={handlePauseStart}
      onMouseUp={handlePauseEnd}
      onMouseLeave={handlePauseEnd}
      onTouchStart={handlePauseStart}
      onTouchEnd={handlePauseEnd}
      onTouchCancel={handlePauseEnd}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative overflow-hidden px-6 py-4 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-800/50 rounded-xl font-bold transition-all cursor-pointer select-none touch-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
        className,
      )}
    >
      {/* Countdown progress bar */}
      <div
        key={revealTimestamp}
        className="absolute bottom-0 left-0 h-1 bg-cyan-400"
        style={{
          animation: `countdown-shrink ${AUTO_HIDE_DURATION_MS}ms linear forwards`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      />
      <style>{`
        @keyframes countdown-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <span className="flex items-center gap-2">
        <Pause className="w-5 h-5" />
        {t("roleReveal.hideInstruction")}
      </span>
    </button>
  );
}

export const RoleReveal = {
  Root,
  Canvas,
  Hidden,
  Revealed,
  Icon,
  Title,
  Description,
  HideInstruction,
};
