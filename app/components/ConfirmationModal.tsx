"use client";

import type { ReactNode } from "react";
import { cn } from "../utils";

interface RootProps {
  isOpen: boolean;
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
}

function Root({ isOpen, onDismiss, children, className }: RootProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Click outside to dismiss if onDismiss provided */}
      {onDismiss && (
        <div
          className="absolute inset-0"
          onClick={onDismiss}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300 mx-4",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface HeaderProps {
  title: string;
  icon?: ReactNode;
  className?: string;
}

function Header({ title, icon, className }: HeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 mb-4", className)}>
      {icon}
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
  );
}

interface BodyProps {
  children: ReactNode;
  className?: string;
}

function Body({ children, className }: BodyProps) {
  return <div className={cn("text-slate-300 mb-6", className)}>{children}</div>;
}

interface ActionsProps {
  children: ReactNode;
  className?: string;
}

function Actions({ children, className }: ActionsProps) {
  return <div className={cn("flex gap-4", className)}>{children}</div>;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "destructive" | "secondary";
}

function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "flex-1 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white",
    destructive: "bg-red-600 hover:bg-red-500 text-white",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-300",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export const ConfirmationModal = {
  Root,
  Header,
  Body,
  Actions,
  Button,
};
