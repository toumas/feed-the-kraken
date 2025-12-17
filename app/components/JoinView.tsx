import { useState } from "react";
import { cn } from "../utils";
import { InlineError } from "./InlineError";

interface JoinViewProps {
  onJoin: (code: string) => void;
  onBack: () => void;
}

export function JoinView({ onJoin, onBack }: JoinViewProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      setError("Please enter a valid ship code (at least 4 characters).");
      setTimeout(() => setError(null), 3000);
      return;
    }
    onJoin(code);
  };

  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right">
      <button
        onClick={onBack}
        type="button"
        className="text-slate-400 hover:text-white flex items-center self-start mb-8 py-2"
      >
        ← Back to shore
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-xs mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Enter Ship Code</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null); // Clear error when typing
            }}
            placeholder="XP7K9L"
            className="w-full bg-slate-900 border-2 border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-5 text-center text-3xl font-mono tracking-[0.5em] uppercase text-white placeholder:text-slate-700 outline-none transition-colors"
          />
          {error && (
            <InlineError message={error} onDismiss={() => setError(null)} />
          )}
          <button
            type="submit"
            className={cn(
              "w-full py-4 bg-cyan-600 text-white rounded-xl font-bold text-lg transition-all",
              code.length < 4 && "bg-slate-800 text-slate-600",
            )}
          >
            Board Ship
          </button>
        </form>
      </div>
    </div>
  );
}
