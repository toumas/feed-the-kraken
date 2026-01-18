"use client";

import { Eye } from "lucide-react";
import { createContext, type ReactNode, useContext } from "react";
import { Avatar } from "./Avatar";

// --- Types ---
interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface ReadyCheckContextType {
  readyLabel: string;
  pendingLabel: string;
}

// --- Context ---
const ReadyCheckContext = createContext<ReadyCheckContextType | undefined>(
  undefined,
);

function useReadyCheckContext() {
  const context = useContext(ReadyCheckContext);
  if (!context) {
    throw new Error(
      "ReadyCheckModal subcomponents must be used within a ReadyCheckModal.Root",
    );
  }
  return context;
}

// --- Root ---
interface RootProps {
  children: ReactNode;
  readyLabel: string;
  pendingLabel: string;
}

function Root({ children, readyLabel, pendingLabel }: RootProps) {
  return (
    <ReadyCheckContext.Provider value={{ readyLabel, pendingLabel }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-slate-900 border border-amber-900/50 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
          {children}
        </div>
      </div>
    </ReadyCheckContext.Provider>
  );
}

// --- Header ---
interface HeaderProps {
  title: string;
}

function Header({ title }: HeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Eye className="w-8 h-8 text-amber-500" />
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
  );
}

// --- Description ---
interface DescriptionProps {
  children: ReactNode;
}

function Description({ children }: DescriptionProps) {
  return <p className="text-slate-300 mb-6">{children}</p>;
}

// --- PlayerList ---
interface PlayerListProps {
  children: ReactNode;
}

function PlayerList({ children }: PlayerListProps) {
  return (
    <div className="space-y-2 mb-8 max-h-60 overflow-y-auto">{children}</div>
  );
}

// --- PlayerItem ---
interface PlayerItemProps {
  player: Player;
  isReady: boolean;
}

function PlayerItem({ player, isReady }: PlayerItemProps) {
  const { readyLabel, pendingLabel } = useReadyCheckContext();

  return (
    <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700">
      <div className="flex items-center gap-3">
        <Avatar url={player.photoUrl} size="sm" />
        <span className="text-slate-200 font-medium">{player.name}</span>
      </div>
      {isReady ? (
        <span className="text-green-400 text-sm font-bold flex items-center gap-1">
          {readyLabel}
        </span>
      ) : (
        <span className="text-slate-500 text-sm font-bold flex items-center gap-1">
          {pendingLabel}
        </span>
      )}
    </div>
  );
}

// --- WaitingText ---
interface WaitingTextProps {
  children: ReactNode;
}

function WaitingText({ children }: WaitingTextProps) {
  return <p className="text-center text-slate-500 italic mb-4">{children}</p>;
}

// --- Actions ---
interface ActionsProps {
  children: ReactNode;
}

function Actions({ children }: ActionsProps) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

// --- ActionButtons ---
interface ActionButtonsProps {
  children: ReactNode;
}

function ActionButtons({ children }: ActionButtonsProps) {
  return <div className="flex gap-4">{children}</div>;
}

// --- CancelButton ---
interface CancelButtonProps {
  onClick: () => void;
  children: ReactNode;
}

function CancelButton({ onClick, children }: CancelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded-xl font-bold transition-colors border border-red-900/30"
    >
      {children}
    </button>
  );
}

// --- ReadyButton ---
interface ReadyButtonProps {
  onClick: () => void;
  isReady: boolean;
  readyLabel: string;
  notReadyLabel: string;
}

function ReadyButton({
  onClick,
  isReady,
  readyLabel,
  notReadyLabel,
}: ReadyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
        isReady
          ? "bg-amber-600/50 text-white/50 cursor-not-allowed border border-amber-600/20"
          : "bg-amber-600 hover:bg-amber-500 text-white"
      }`}
    >
      {isReady ? readyLabel : notReadyLabel}
    </button>
  );
}

// --- Export ---
export const ReadyCheckModal = {
  Root,
  Header,
  Description,
  PlayerList,
  PlayerItem,
  WaitingText,
  Actions,
  ActionButtons,
  CancelButton,
  ReadyButton,
};
