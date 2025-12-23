import { Anchor, Users, Waves } from "lucide-react";
import { useT } from "../i18n/client";

interface HomeViewProps {
  onCreate: () => void;
  onJoin: () => void;
}

export function HomeView({ onCreate, onJoin }: HomeViewProps) {
  const { t } = useT("common");

  return (
    <div className="flex-1 flex flex-col justify-center items-center space-y-8 animate-in fade-in duration-500">
      <div className="w-40 h-40 bg-cyan-950/30 rounded-full flex items-center justify-center border-4 border-cyan-900/50 shadow-[0_0_30px_-5px_rgba(8,145,178,0.3)] relative">
        <Anchor className="w-20 h-20 text-cyan-500/80" />
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border-2 border-cyan-900">
          <Waves className="w-6 h-6 text-cyan-700" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">{t("home.welcome")}</h2>
        <p className="text-slate-400">
          {t("home.subtext")}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4 pt-8">
        <button
          onClick={onCreate}
          type="button"
          className="w-full py-4 px-6 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center"
        >
          <Anchor className="w-5 h-5 mr-2" />
          {t("home.createVoyage")}
        </button>
        <button
          onClick={onJoin}
          type="button"
          className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 rounded-xl font-bold text-lg border border-slate-700 transition-all flex items-center justify-center"
        >
          <Users className="w-5 h-5 mr-2" />
          {t("home.joinCrew")}
        </button>
      </div>
    </div>
  );
}
