"use client";
import { Anchor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HomeView } from "../components/HomeView";
import { InlineError } from "../components/InlineError";
import { LanguageSelector } from "../components/LanguageSelector";
import { useGame } from "../context/GameContext";
import { useT } from "../i18n/client";

export default function KrakenCompanion() {
  const router = useRouter();
  const { lobby, error, setError } = useGame();
  const { t } = useT("common");

  // Check for kick message from localStorage (set when player was kicked)
  useEffect(() => {
    const kickMessage = localStorage.getItem("kraken_kick_message");
    if (kickMessage) {
      setError(kickMessage);
      localStorage.removeItem("kraken_kick_message");
    }
  }, [setError]);

  // Redirect if already in a lobby
  useEffect(() => {
    if (lobby) {
      if (lobby.status === "PLAYING") {
        router.push("/game");
      } else {
        router.push("/lobby");
      }
    }
  }, [lobby, router]);

  const handleCreate = () => {
    router.push("/identify?next=create");
  };

  const handleJoin = () => {
    router.push("/join");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
          <div className="flex items-center">
            <Anchor className="w-6 h-6 text-cyan-500 mr-3" />
            <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
              {t("app.title")}
            </h1>
          </div>
          <LanguageSelector />
        </header>

        {/* Error Toast */}
        {error && (
          <div className="mx-4 mt-4">
            <InlineError message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* View Content */}
        <div className="flex-1 flex flex-col p-4">
          <HomeView onCreate={handleCreate} onJoin={handleJoin} />
        </div>
      </main>
    </div>
  );
}
