"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { GameHeader } from "../components/GameHeader";
import { useGame } from "../context/GameContext";

export default function DenialPage() {
  const router = useRouter();
  const { handleDenialOfCommand, lobby } = useGame();

  const onConfirm = () => {
    handleDenialOfCommand();
    router.push("/game");
  };

  const onCancel = () => {
    router.push("/game");
  };

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900 flex flex-col">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col">
        <GameHeader
          title="Denial of Command"
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        />
        <div className="p-6">
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className="w-24 h-24 rounded-full bg-red-900/20 flex items-center justify-center border-4 border-red-900/50 mb-4">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-white">
                Denial of Command
              </h1>
              <p className="text-slate-400 max-w-xs mx-auto text-lg">
                This action is irreversible. You will be eliminated from the
                game.
              </p>
              <p className="text-red-400 font-bold">
                Are you sure you want to proceed?
              </p>
            </div>
            <div className="w-full space-y-4 pt-8">
              <button
                onClick={onConfirm}
                type="button"
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-red-900/20 active:scale-95"
              >
                Yes, I Deny Command
              </button>
              <button
                onClick={onCancel}
                type="button"
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-lg transition-all border border-slate-700 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
