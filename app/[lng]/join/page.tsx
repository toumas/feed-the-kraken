"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { JoinView } from "../../components/JoinView";

import { useT } from "../../i18n/client";

export default function JoinPage() {
  const router = useRouter();

  const { t } = useT("common");

  const handleJoin = (code: string) => {
    router.push(`/identify?next=join&code=${code}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-900 flex flex-col">
      {/* Background Texture Ambient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay" />

      <main className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col p-6">
        <button
          onClick={() => router.push("/")}
          type="button"
          className="text-slate-400 hover:text-white flex items-center self-start mb-8 py-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("actions.back")}
        </button>

        <div className="flex-1 flex flex-col justify-center w-full">
          <JoinView onJoin={handleJoin} />
        </div>
      </main>
    </div>
  );
}
