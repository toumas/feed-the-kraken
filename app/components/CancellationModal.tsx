"use client";

import { Eye } from "lucide-react";

interface CancellationModalProps {
  children: React.ReactNode;
}

interface RootProps {
  isOpen: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

export function CancellationModal({ children }: CancellationModalProps) {
  return <>{children}</>;
}

function Root({ isOpen, children }: RootProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-amber-900/50 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
        {children}
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Eye className="w-8 h-8 text-amber-500" />
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
  );
}

function Body({ message, reason }: { message: string; reason?: string }) {
  return (
    <div className="text-center space-y-4 mb-6">
      <p className="text-red-400 font-bold text-lg">{message}</p>
      {reason && <p className="text-slate-400">{reason}</p>}
    </div>
  );
}

function Action({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
    >
      Close
    </button>
  );
}

CancellationModal.Root = Root;
CancellationModal.Header = Header;
CancellationModal.Body = Body;
CancellationModal.Action = Action;
