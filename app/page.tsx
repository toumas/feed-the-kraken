"use client";
import { Anchor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HomeView } from "./components/HomeView";
import { InlineError } from "./components/InlineError";
import { useGame } from "./context/GameContext";

export default function KrakenCompanion() {
  const router = useRouter();
  const { myName, myPhoto, createLobby, lobby, error, setError } = useGame();

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

  const hasValidProfile = () => {
    return myName !== "New Sailor" && myPhoto !== null;
  };

  const handleCreate = () => {
    if (hasValidProfile()) {
      createLobby();
      router.push("/lobby");
    } else {
      router.push("/identify?next=create");
    }
  };

  const handleJoin = () => {
    if (hasValidProfile()) {
      router.push("/join");
    } else {
      router.push("/identify?next=join");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-center border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
          <Anchor className="w-6 h-6 text-cyan-500 mr-3" />
          <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
            Feed The Kraken
          </h1>
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
