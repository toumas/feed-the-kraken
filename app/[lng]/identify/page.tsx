"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProfileEditor } from "../../components/ProfileEditor";
import { useGame } from "../../context/GameContext";
import { useT } from "../../i18n/client";

function IdentifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextAction = searchParams.get("next"); // "create" | "join"
  const { myName, myPhoto, updateMyProfile, createLobby } = useGame();
  const { t } = useT("common");

  const handleSave = (name: string, photo: string | null) => {
    updateMyProfile(name, photo);

    if (nextAction === "create") {
      createLobby(name, photo);
      // createLobby is async in effect (socket connection), but we can redirect to lobby
      // The lobby page will handle the "waiting for connection" state
      router.push("/lobby");
    } else if (nextAction === "join") {
      router.push("/join");
    } else {
      router.push("/");
    }
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
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-black text-white uppercase tracking-tight">
              {t("identify.title")}
            </h1>
            <p className="text-slate-400 text-lg">{t("identify.subtitle")}</p>
          </div>

          <ProfileEditor.Root
            initialName={myName === "New Sailor" ? "" : myName}
            initialPhoto={myPhoto}
            onSave={handleSave}
          >
            <ProfileEditor.Photo />
            <ProfileEditor.Name />
            <ProfileEditor.Submit />
          </ProfileEditor.Root>
        </div>
      </main>
    </div>
  );
}

export default function IdentifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <IdentifyContent />
    </Suspense>
  );
}
