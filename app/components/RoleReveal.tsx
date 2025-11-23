"use client";

import { EyeOff } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { cn } from "../utils";

// --- Context ---
interface RoleRevealContextValue {
  isRevealed: boolean;
  startReveal: () => void;
  endReveal: () => void;
}

const RoleRevealContext = createContext<RoleRevealContextValue | null>(null);

function useRoleReveal() {
  const context = useContext(RoleRevealContext);
  if (!context) {
    throw new Error("RoleReveal components must be used within a RoleReveal.Root");
  }
  return context;
}

// --- Components ---

interface RootProps {
  children: React.ReactNode;
  className?: string;
}

function Root({ children, className }: RootProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const startReveal = () => setIsRevealed(true);
  const endReveal = () => setIsRevealed(false);

  return (
    <RoleRevealContext.Provider value={{ isRevealed, startReveal, endReveal }}>
      <div className={cn("relative w-full", className)}>{children}</div>
    </RoleRevealContext.Provider>
  );
}

interface CanvasProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function Canvas({ children, className, ...props }: CanvasProps) {
  const { startReveal, endReveal } = useRoleReveal();

  return (
    <button
      type="button"
      className={cn(
        "relative flex flex-col items-center justify-center w-full cursor-pointer select-none touch-none bg-transparent border-none p-0 focus:outline-none",
        className
      )}
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
        props.onKeyDown?.(e);
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          endReveal();
        }
        props.onKeyUp?.(e);
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
  const { isRevealed } = useRoleReveal();

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center transition-all duration-200 ease-in-out",
        isRevealed ? "opacity-0 scale-110 pointer-events-none" : "opacity-100 scale-100",
        className
      )}
    >
      {children || (
        <>
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
        </>
      )}
    </div>
  );
}

interface RevealedProps {
  children: React.ReactNode;
  className?: string;
}

function Revealed({ children, className }: RevealedProps) {
  const { isRevealed } = useRoleReveal();

  return (
    <div
      className={cn(
        "transition-all duration-200 ease-in-out flex flex-col items-center w-full",
        isRevealed ? "opacity-100 scale-100 blur-none" : "opacity-0 scale-95 blur-md pointer-events-none",
        className
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
    <div className={cn("relative", className)}>
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
      className={cn(
        "text-4xl font-bold text-center drop-shadow-lg",
        className
      )}
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
      className={cn(
        "text-slate-300 text-center max-w-xs text-lg font-medium",
        className
      )}
    >
      {children}
    </p>
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
};
